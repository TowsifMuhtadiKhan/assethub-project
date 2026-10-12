import { useEffect, useState, useMemo } from "react";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import {
  dataUrlToBlob,
  downloadDocumentFile,
  extractGoogleDriveFileId,
  openDocumentFile,
} from "../../utils/googleDrive";

export interface ViewableDocument {
  name: string;
  fileUrl?: string;
  fileType?: string;
  category?: string;
  storageProvider?: string;
  driveFileId?: string;
  expiryDate?: string;
  documentNumber?: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ViewableDocument | null;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  document: doc,
}: DocumentViewerModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [bgDark, setBgDark] = useState<boolean>(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Create & clean up Blob URL for base64 data URLs
  useEffect(() => {
    if (!doc?.fileUrl) {
      setBlobUrl(null);
      return;
    }

    if (doc.fileUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(doc.fileUrl);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      }
    }

    setBlobUrl(null);
  }, [doc?.fileUrl]);

  // Reset zoom on document change
  useEffect(() => {
    setZoomLevel(1);
  }, [doc]);

  const driveId = useMemo(() => {
    if (!doc) return null;
    return doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
  }, [doc]);

  const isImage = useMemo(() => {
    if (!doc) return false;
    const type = (doc.fileType || "").toLowerCase();
    const name = (doc.name || "").toLowerCase();
    const url = (doc.fileUrl || "").toLowerCase();
    return (
      url.startsWith("data:image") ||
      ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"].some(
        (ext) => type === ext || type === `image/${ext}` || name.endsWith(`.${ext}`)
      )
    );
  }, [doc]);

  const isPdf = useMemo(() => {
    if (!doc) return false;
    const type = (doc.fileType || "").toLowerCase();
    const name = (doc.name || "").toLowerCase();
    const url = (doc.fileUrl || "").toLowerCase();
    return (
      url.startsWith("data:application/pdf") ||
      type === "pdf" ||
      type === "application/pdf" ||
      name.endsWith(".pdf")
    );
  }, [doc]);

  if (!isOpen || !doc) return null;

  // Active display URL for preview (blobUrl is preferred for data URLs)
  const displayUrl = blobUrl || doc.fileUrl;

  const handleDownload = () => {
    downloadDocumentFile({
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      storageProvider: doc.storageProvider,
      driveFileId: doc.driveFileId,
    });
  };

  const handleOpenNewTab = () => {
    openDocumentFile({
      name: doc.name,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      storageProvider: doc.storageProvider,
      driveFileId: doc.driveFileId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[90vh] max-h-[900px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              {isImage ? (
                <ImageIcon className="h-4 w-4" />
              ) : isPdf ? (
                <FileText className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                  {doc.name}
                </h3>
                {doc.category && (
                  <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                    {doc.category}
                  </span>
                )}
                {doc.documentNumber && (
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    #{doc.documentNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isPdf ? "PDF Document" : isImage ? "Image Document" : driveId ? "Google Drive Document" : "Attached File"}
                {doc.fileType ? ` • ${doc.fileType.toUpperCase()}` : ""}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              title="Download file to device"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
              title="Open document in a separate browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Close viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 bg-slate-100/70 overflow-hidden relative flex flex-col">
          {/* 1. Google Drive file */}
          {driveId ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`https://drive.google.com/file/d/${driveId}/preview`}
                title={doc.name}
                className="w-full flex-1 border-0 bg-white"
                allow="autoplay"
              />
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <span>Synchronized via Google Drive Vault</span>
                <a
                  href={`https://drive.google.com/file/d/${driveId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  Open directly in Drive <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : isImage && displayUrl ? (
            /* 2. Image File */
            <div className={`w-full h-full flex flex-col ${bgDark ? "bg-slate-950" : "bg-slate-50"}`}>
              {/* Image Controls */}
              <div className="px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[11px] w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer ml-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setBgDark(!bgDark)}
                  className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {bgDark ? "Light Background" : "Dark Background"}
                </button>
              </div>

              {/* Scrollable image viewport */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                <img
                  src={displayUrl}
                  alt={doc.name}
                  style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
                  className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-xl"
                />
              </div>
            </div>
          ) : isPdf && displayUrl ? (
            /* 3. PDF Document */
            <div className="w-full h-full flex flex-col bg-slate-800">
              <iframe
                src={displayUrl}
                title={doc.name}
                className="w-full flex-1 border-0 bg-white"
              />

              {/* PDF Bottom Helper Toolbar */}
              <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Viewing PDF. If your browser or mobile phone doesn&apos;t display inline PDFs, tap{" "}
                    <strong className="text-white">Download</strong> to view it in your native reader.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </button>
                </div>
              </div>
            </div>
          ) : displayUrl ? (
            /* 4. Other File formats */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
                <FileText className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">{doc.name}</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                This file type ({doc.fileType || "Document"}) can be downloaded directly to view on your device.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download File Now
              </button>
            </div>
          ) : (
            /* 5. Missing / No file attachment */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No file content attached</p>
              <p className="text-xs text-slate-400 mt-0.5">
                This document record does not currently have a linked PDF or image file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
