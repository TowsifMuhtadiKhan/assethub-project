import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Star,
  Download,
  Trash2,
  FolderPlus,
  Folder,
  FolderOpen,
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Clock,
  ExternalLink,
  LayoutGrid,
  List,
  Eye,
  MoreVertical,
  Cloud,
  FolderLock,
  Edit2,
  Palette,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  updateDocument,
  listDocumentFolders,
  createDocumentFolder,
  deleteDocumentFolder,
  updateDocumentFolder,
} from "../services/documentService";
import { listFamilyMembers } from "../services/familyService";
import {
  extractGoogleDriveFileId,
  getGoogleDriveFileViewUrl,
  openDocumentFile,
  downloadDocumentFile,
  deleteDocumentFromMasterGoogleDrive,
  deleteFolderFromMasterGoogleDrive,
  uploadUserDocumentToGoogleDrive,
} from "../utils/googleDrive";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  FormControl,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from "@mui/material";
import type {
  DocumentItem,
  DocumentCategory,
  FamilyMember,
  FamilyMemberAccess,
  DocumentFolder,
} from "../types";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";

const categories: DocumentCategory[] = [
  "Identity",
  "Academic",
  "Employment",
  "Tax/Financial",
  "Health",
  "Legal",
  "Travel",
  "Vehicle",
  "Property",
  "Other",
];

// Preset Google Drive folder colors
export const FOLDER_COLOR_PALETTE: {
  id: string;
  name: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
}[] = [
  { id: "indigo", name: "Indigo", dot: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
  { id: "blue", name: "Blue", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  { id: "emerald", name: "Emerald", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  { id: "amber", name: "Amber", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  { id: "rose", name: "Rose", dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  { id: "purple", name: "Purple", dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  { id: "sky", name: "Sky", dot: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
  { id: "slate", name: "Slate", dot: "bg-slate-500", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
];

export function getFolderColorStyle(colorName?: string) {
  const match = FOLDER_COLOR_PALETTE.find((c) => c.id === colorName?.toLowerCase());
  return match || FOLDER_COLOR_PALETTE[0]; // defaults to indigo
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"drive" | "starred" | "expiring">("drive");

  // Google Drive current folder navigation (null = Root "Vault")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("lifenest_documents_view_mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });

  // Modals & Actions
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [addDocTab, setAddDocTab] = useState<"basic" | "advanced">("basic");
  const [folderToRename, setFolderToRename] = useState<DocumentFolder | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [folderToColor, setFolderToColor] = useState<DocumentFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id?: string; name: string } | null>(null);
  const [deleteFolderDocs, setDeleteFolderDocs] = useState<boolean>(true);
  const [isDeletingFolder, setIsDeletingFolder] = useState<boolean>(false);
  const [deletedFolderNames, setDeletedFolderNames] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lifenest_deleted_folders") || "[]");
    } catch {
      return [];
    }
  });

  const [saving, setSaving] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [folderSaving, setFolderSaving] = useState(false);
  const [error, setError] = useState("");

  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [docReminderRecipients, setDocReminderRecipients] = useState<string[]>(["Personal"]);
  const [currentUserAccess, setCurrentUserAccess] = useState<FamilyMemberAccess | null>(null);
  const [isVaultLockedForUser, setIsVaultLockedForUser] = useState(false);

  // Right-click context menu (Google Drive blank space menu)
  const [contextMenu, setContextMenu] = useState<{
    type: "canvas" | "folder" | "file";
    x: number;
    y: number;
    targetFolder?: DocumentFolder;
    targetDoc?: DocumentItem;
  } | null>(null);

  // Close menus on outside click and on escape
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenFolderMenuId(null);
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, select, textarea, button, a")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 110;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({
      type: "canvas",
      x,
      y,
    });
  };

  const handleFolderContextMenu = (folder: DocumentFolder, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 170;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({
      type: "folder",
      x,
      y,
      targetFolder: folder,
    });
  };

  const handleDocContextMenu = (doc: DocumentItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = 160;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({
      type: "file",
      x,
      y,
      targetDoc: doc,
    });
  };

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("lifenest_documents_view_mode", mode);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docs, members, flds] = await Promise.all([
        listDocuments(),
        listFamilyMembers(),
        listDocumentFolders(),
      ]);
      setDocuments(docs);
      setFamilyMembers(members);
      setFolders(flds);

      // Check permissions for logged-in family member
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const foundMember = members.find(
            (m) =>
              (m.email && m.email.toLowerCase() === user.email?.toLowerCase()) ||
              m.id === user.id,
          );
          if (foundMember && foundMember.relationship !== "Self") {
            const acc = foundMember.access;
            if (acc) {
              setCurrentUserAccess(acc);
              if (acc.canAccessVault === false) {
                setIsVaultLockedForUser(true);
              }
            }
          }
        }
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Current folder object (null if at root)
  const currentFolder = currentFolderId
    ? folders.find((f) => f.id === currentFolderId || f.name.toLowerCase() === currentFolderId.toLowerCase()) || null
    : null;

  // Breadcrumbs path: [Vault, ...ancestors, currentFolder]
  const getBreadcrumbs = (): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Vault" }];
    if (!currentFolder) return crumbs;

    const ancestors: DocumentFolder[] = [currentFolder];
    let cur = currentFolder;
    while (cur.parentId && ancestors.length < 5) {
      const parent = folders.find(
        (f) => f.id === cur.parentId || f.name.toLowerCase() === cur.parentId?.toLowerCase(),
      );
      if (parent && !ancestors.some((a) => a.id === parent.id)) {
        ancestors.unshift(parent);
        cur = parent;
      } else {
        break;
      }
    }

    ancestors.forEach((a) => {
      crumbs.push({ id: a.id, name: a.name });
    });
    return crumbs;
  };

  // Subfolders to display in current view
  const currentSubfolders = (() => {
    if (activeTab !== "drive") return [];
    if (currentFolderId === null) {
      // Root folders: no parentId or parent not found
      return folders
        .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
        .filter(
          (f) =>
            !f.parentId ||
            !folders.some(
              (p) =>
                p.id === f.parentId ||
                p.name.toLowerCase() === f.parentId?.toLowerCase(),
            ),
        );
    }
    // Inside a folder: show direct child subfolders
    const parentId = currentFolder?.id;
    const parentName = currentFolder?.name.toLowerCase();
    return folders
      .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
      .filter(
        (f) =>
          (parentId && f.parentId === parentId) ||
          (parentName && f.parentId?.toLowerCase() === parentName),
      );
  })();

  // Filtered documents matching current location, tab, and search
  const filteredDocuments = documents.filter((doc) => {
    // 0. Permission restrictions
    if (currentUserAccess?.assignedVaultFolderScope === "specific") {
      const allowed = currentUserAccess.assignedVaultFolders || [];
      if (allowed.length === 0) return false;
      const allowedLower = allowed.map((f) => f.toLowerCase());
      const docFolder = (doc.folderName || "General").toLowerCase();
      const docCat = doc.category.toLowerCase();
      if (!allowedLower.includes(docFolder) && !allowedLower.includes(docCat)) {
        return false;
      }
    }

    // 1. Text Search
    if (search) {
      const q = search.toLowerCase();
      const match =
        doc.name.toLowerCase().includes(q) ||
        doc.documentNumber.toLowerCase().includes(q) ||
        (doc.familyMemberName || "").toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        (doc.folderName || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    // 2. Category Filter
    if (selectedCategoryFilter !== "All" && doc.category !== selectedCategoryFilter) {
      return false;
    }

    // 3. Tab Filter
    if (activeTab === "starred") {
      return doc.isFavorite;
    }
    if (activeTab === "expiring") {
      if (!doc.expiryDate) return false;
      const diff = (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return diff <= 30;
    }

    // 4. Drive Navigation Folder Filter
    // If a global search or category filter is active and at root, search across all vault docs
    if (search && currentFolderId === null) {
      return true;
    }

    if (currentFolderId === null) {
      // At root: show files not assigned to a subfolder or assigned to General / root
      const folderNameLower = (doc.folderName || "").toLowerCase();
      const isRootDoc =
        !folderNameLower ||
        folderNameLower === "general" ||
        folderNameLower === "vault" ||
        !folders.some((f) => f.name.toLowerCase() === folderNameLower);
      return isRootDoc;
    }

    // Inside a specific folder: show files belonging to this folder
    const targetName = currentFolder?.name.toLowerCase() || "";
    return (doc.folderName || "").toLowerCase() === targetName;
  });

  // Pre-calculated stats
  const starredCount = documents.filter((d) => d.isFavorite).length;
  const expiringCount = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const diff = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff <= 30;
  }).length;

  // Folder actions: Create, Rename, Color, Delete
  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFolderSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("folderName") || "").trim();
    const color = String(form.get("color") || "indigo");

    if (!name) {
      setFolderSaving(false);
      return;
    }

    try {
      const created = await createDocumentFolder({
        name,
        parentId: currentFolderId || undefined,
        color,
      });

      // If previously deleted, unmark
      const lowerName = name.toLowerCase();
      if (deletedFolderNames.includes(lowerName)) {
        const updatedDeleted = deletedFolderNames.filter((d) => d !== lowerName);
        setDeletedFolderNames(updatedDeleted);
        localStorage.setItem("lifenest_deleted_folders", JSON.stringify(updatedDeleted));
      }

      setFolders((prev) => [...prev.filter((f) => f.name.toLowerCase() !== lowerName), created]);
      setIsFolderOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setFolderSaving(false);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameInputValue.trim()) return;
    const newName = renameInputValue.trim();
    const oldName = folderToRename.name;
    if (newName === oldName) {
      setFolderToRename(null);
      return;
    }

    try {
      await updateDocumentFolder(folderToRename.id, {
        name: newName,
        oldName: oldName,
      });

      // Update state
      setFolders((prev) =>
        prev.map((f) => (f.id === folderToRename.id ? { ...f, name: newName } : f)),
      );
      setDocuments((prev) =>
        prev.map((d) =>
          (d.folderName || "").toLowerCase() === oldName.toLowerCase()
            ? { ...d, folderName: newName }
            : d,
        ),
      );
      setFolderToRename(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename folder");
    }
  };

  const handleChangeFolderColor = async (folder: DocumentFolder, newColor: string) => {
    try {
      await updateDocumentFolder(folder.id, { color: newColor });
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, color: newColor } : f)),
      );
      setFolderToColor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change folder color");
    }
  };

  const promptDeleteFolder = (folderName: string, folderId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteFolderDocs(true);
    setFolderToDelete({ id: folderId, name: folderName });
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    setIsDeletingFolder(true);
    const { id, name } = folderToDelete;
    const lowerName = name.toLowerCase();

    try {
      const idsToDelete = new Set<string>();
      const namesToDelete = new Set<string>();
      if (id) idsToDelete.add(id);
      namesToDelete.add(lowerName);

      const collectChildren = (pId: string, pName: string) => {
        folders.forEach((f) => {
          if (
            (f.parentId && f.parentId === pId) ||
            (f.parentId && f.parentId.toLowerCase() === pName.toLowerCase())
          ) {
            idsToDelete.add(f.id);
            namesToDelete.add(f.name.toLowerCase());
            collectChildren(f.id, f.name);
          }
        });
      };
      if (id) collectChildren(id, name);

      // 1. Delete folders from database/service
      for (const targetId of idsToDelete) {
        await deleteDocumentFolder(targetId);
      }
      for (const targetName of namesToDelete) {
        await deleteDocumentFolder(targetName);
      }

      // 2. Sync deletion with Google Drive
      for (const targetName of namesToDelete) {
        await deleteFolderFromMasterGoogleDrive({
          folderName: targetName,
          folderId: id,
        });
      }

      // 3. Handle documents inside deleted folders
      const docsInFolder = documents.filter((d) =>
        namesToDelete.has((d.folderName || "").toLowerCase()),
      );

      if (deleteFolderDocs) {
        for (const doc of docsInFolder) {
          try {
            await deleteDocument(doc.id);
            const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
            if (driveId) {
              await deleteDocumentFromMasterGoogleDrive(driveId);
            }
          } catch (docErr) {
            console.warn(`Failed to delete document ${doc.id}:`, docErr);
          }
        }
        setDocuments((prev) =>
          prev.filter((d) => !namesToDelete.has((d.folderName || "").toLowerCase())),
        );
      } else {
        setDocuments((prev) =>
          prev.map((d) =>
            namesToDelete.has((d.folderName || "").toLowerCase()) ? { ...d, folderName: "" } : d,
          ),
        );
      }

      // 4. Remove from folders state
      setFolders((prev) =>
        prev.filter((f) => !idsToDelete.has(f.id) && !namesToDelete.has(f.name.toLowerCase())),
      );

      const updatedDeleted = Array.from(new Set([...deletedFolderNames, ...namesToDelete]));
      setDeletedFolderNames(updatedDeleted);
      localStorage.setItem("lifenest_deleted_folders", JSON.stringify(updatedDeleted));

      // If currently inside the deleted folder, navigate back to root
      if (currentFolderId && (idsToDelete.has(currentFolderId) || namesToDelete.has(currentFolder?.name.toLowerCase() || ""))) {
        setCurrentFolderId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    } finally {
      setIsDeletingFolder(false);
      setFolderToDelete(null);
    }
  };

  // Document creation & deletion
  const handleCreateDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    const formElement = e.currentTarget;
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const driveLink = String(form.get("driveLink") || "").trim();
      const file = form.get("file") as File | null;
      let fileUrl = "";
      let fileType = "pdf";
      let storageProvider: "supabase" | "google_drive" | "local" = "supabase";
      let driveFileId: string | undefined = undefined;

      const targetFolder = String(form.get("folderName") || currentFolder?.name || "General").trim();

      if (driveLink) {
        const detectedId = extractGoogleDriveFileId(driveLink);
        if (detectedId) {
          driveFileId = detectedId;
          fileUrl = getGoogleDriveFileViewUrl(detectedId);
        } else {
          fileUrl = driveLink;
        }
        storageProvider = "google_drive";
        fileType = "gdrive";
      } else if (file && file.size > 0) {
        const detectedExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
        fileType = detectedExt;
        const memberId = String(form.get("familyMemberId") || "");

        let uName = "Personal";
        if (memberId) {
          const found = familyMembers.find((m) => m.id === memberId);
          if (found) uName = found.fullName;
        }

        setUploadingToDrive(true);
        try {
          const gRes = await uploadUserDocumentToGoogleDrive({
            file,
            userDisplayName: uName,
            subfolderName: targetFolder || "General",
            customName: String(form.get("name")),
          });
          fileUrl = gRes.webViewLink;
          driveFileId = gRes.id;
          storageProvider = "google_drive";
          fileType = detectedExt;
        } catch (gErr) {
          console.warn("Google Drive upload fallback to local vault:", gErr);
          const reader = new FileReader();
          fileUrl = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          fileType = detectedExt;
        } finally {
          setUploadingToDrive(false);
        }
      }

      const requiresRenewal = Boolean(form.get("requiresRenewal"));
      const expiryDate = String(form.get("expiryDate") || "");
      const reminderLead = Number(form.get("reminderLeadDays") || 15);
      let reminderDate: string | undefined = undefined;
      if (requiresRenewal && expiryDate) {
        const exp = new Date(expiryDate);
        if (!isNaN(exp.getTime())) {
          exp.setDate(exp.getDate() - reminderLead);
          reminderDate = exp.toISOString().split("T")[0];
        }
      }

      let docNotes = String(form.get("notes") || "");
      if (requiresRenewal) {
        const rec = docReminderRecipients.length > 0 ? `, Recipients: ${docReminderRecipients.join(", ")}` : "";
        docNotes = `${docNotes} [Reminder: ${reminderLead} days before expiry${rec}]`.trim();
      }

      const newDoc = await createDocument({
        name: String(form.get("name")),
        category: String(form.get("category")) as DocumentCategory,
        documentNumber: String(form.get("documentNumber") || ""),
        issuingAuthority: String(form.get("issuingAuthority") || ""),
        issueDate: String(form.get("issueDate") || ""),
        expiryDate,
        reminderDate,
        familyMemberId: String(form.get("familyMemberId") || "") || undefined,
        folderName: targetFolder || "General",
        fileUrl: fileUrl || undefined,
        fileType,
        storageProvider,
        driveFileId,
        isFavorite: false,
        requiresRenewal,
        tags: String(form.get("tags") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: docNotes,
      });

      setDocuments((prev) => [newDoc, ...prev]);

      if (
        targetFolder &&
        targetFolder !== "General" &&
        !folders.some((f) => f.name.toLowerCase() === targetFolder.toLowerCase())
      ) {
        const createdFolder = await createDocumentFolder({ name: targetFolder });
        setFolders((prev) => [...prev, createdFolder]);
      }

      formElement?.reset?.();
      setIsAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    setError("");
    const doc = docToDelete;
    try {
      await deleteDocument(doc.id);

      const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
      if (driveId) {
        await deleteDocumentFromMasterGoogleDrive(driveId);
      }

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (previewDoc?.id === doc.id) {
        setPreviewDoc(null);
      }
      setDocToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const toggleFavorite = async (doc: DocumentItem) => {
    try {
      await updateDocument(doc.id, { isFavorite: !doc.isFavorite });
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, isFavorite: !d.isFavorite } : d)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const canCreate = currentUserAccess
    ? Boolean(currentUserAccess.canCreateDocuments ?? currentUserAccess.canWriteDocuments)
    : true;
  const canDelete = currentUserAccess
    ? Boolean(currentUserAccess.canDeleteDocuments ?? true)
    : true;

  // Breadcrumbs array
  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-4 w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 font-display">
            Document Vault
          </h1>
          <p className="text-xs text-slate-500">
            Personal & family records, certificates, and ID documents structured in folders.
          </p>
        </div>

        {/* Action Buttons */}
        {canCreate && !isVaultLockedForUser && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsFolderOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <FolderPlus className="h-4 w-4 text-indigo-600" />
              <span>New Folder</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          </div>
        )}
      </div>

      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {isVaultLockedForUser ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <FolderLock className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Document Vault Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your family member profile does not have permission to view or manage confidential Document Vault files. Please contact your Family Admin to request access.
          </p>
        </div>
      ) : (
        <div className="space-y-4 min-h-[70vh]" onContextMenu={handleCanvasContextMenu}>
          {/* Quick Filter Navigation Tabs (Google Drive style: Vault, Starred, Expiring) */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("drive");
                  setCurrentFolderId(null);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "drive"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>My Drive</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("starred")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "starred"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>Starred</span>
                {starredCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === "starred" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {starredCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("expiring")}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "expiring"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Expiring Soon</span>
                {expiringCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === "expiring" ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {expiringCount}
                  </span>
                )}
              </button>
            </div>

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleSetViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid View (Google Drive style)"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode("list")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="List View (Table)"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>

          {/* Breadcrumbs & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            {/* Breadcrumb Trail (Google Drive clickable navigation) */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
              {activeTab === "drive" ? (
                <>
                  {currentFolderId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentFolder?.parentId) {
                          setCurrentFolderId(null);
                        } else {
                          const parent = folders.find(
                            (f) =>
                              f.id === currentFolder.parentId ||
                              f.name.toLowerCase() === currentFolder.parentId?.toLowerCase(),
                          );
                          setCurrentFolderId(parent ? parent.id : null);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition mr-1 cursor-pointer"
                      title="Go Back Up"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <div key={crumb.id || "root"} className="flex items-center gap-1.5">
                        {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                        {isLast ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                              {idx === 0 ? (
                                <Folder className="h-3.5 w-3.5 text-indigo-600" />
                              ) : (
                                <FolderOpen className="h-3.5 w-3.5 text-indigo-600" />
                              )}
                              <span>{crumb.name}</span>
                            </span>

                            {/* Folder Context Menu (Rename / Color / Delete) if inside custom folder */}
                            {currentFolder && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenFolderMenuId(
                                      openFolderMenuId === "current-folder-menu" ? null : "current-folder-menu",
                                    );
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                  title="Folder Actions"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {openFolderMenuId === "current-folder-menu" && (
                                  <div
                                    className="absolute left-0 top-7 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenFolderMenuId(null);
                                        setFolderToRename(currentFolder);
                                        setRenameInputValue(currentFolder.name);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer text-left"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Rename Folder</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenFolderMenuId(null);
                                        setFolderToColor(currentFolder);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer text-left"
                                    >
                                      <Palette className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Change Color</span>
                                    </button>
                                    <div className="my-1 border-t border-slate-100" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenFolderMenuId(null);
                                        promptDeleteFolder(currentFolder.name, currentFolder.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Delete Folder</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCurrentFolderId(crumb.id)}
                            className="font-medium text-slate-500 hover:text-indigo-600 hover:bg-slate-50 px-1.5 py-0.5 rounded transition cursor-pointer"
                          >
                            {crumb.name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    {activeTab === "starred" ? (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-rose-500" />
                    )}
                    <span>{activeTab === "starred" ? "Starred Documents" : "Expiring Documents"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("drive")}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition ml-2 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Back to Drive
                  </button>
                </div>
              )}
            </div>

            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-md w-full">
              <div className="flex-1 min-w-0">
                <TextField
                  fullWidth
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files, ID numbers, or authorities..."
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search className="h-4 w-4 text-slate-400" />
                        </InputAdornment>
                      ),
                      endAdornment: search ? (
                        <InputAdornment position="end">
                          <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </InputAdornment>
                      ) : null,
                      sx: {
                        fontSize: "0.75rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                      },
                    },
                  }}
                />
              </div>

              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 130 } }}>
                <Select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  sx={{
                    fontSize: "0.75rem",
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                    "& .MuiSelect-select": {
                      fontSize: "0.75rem",
                      py: "8px",
                    },
                  }}
                >
                  <MenuItem value="All" sx={{ fontSize: "0.75rem" }}>
                    All Categories
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c} value={c} sx={{ fontSize: "0.75rem" }}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          {/* FOLDERS SECTION (Google Drive Card Grid) */}
          {activeTab === "drive" && currentSubfolders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Folders</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({currentSubfolders.length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {currentSubfolders.map((folder) => {
                  const colorStyle = getFolderColorStyle(folder.color);

                  return (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      onContextMenu={(e) => handleFolderContextMenu(folder, e)}
                      className="group relative flex items-center justify-between h-11 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/90 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                        <Folder className={`h-4.5 w-4.5 shrink-0 ${colorStyle.text} fill-current/25`} />
                        <span
                          className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900"
                          title={folder.name}
                        >
                          {folder.name}
                        </span>
                      </div>

                      {/* Folder 3-dots Context Menu */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {openFolderMenuId === folder.id && (
                          <div
                            className="absolute right-0 top-7 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenFolderMenuId(null);
                                setCurrentFolderId(folder.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer text-left"
                            >
                              <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                              <span>Open Folder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenFolderMenuId(null);
                                setFolderToRename(folder);
                                setRenameInputValue(folder.name);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer text-left"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenFolderMenuId(null);
                                setFolderToColor(folder);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer text-left"
                            >
                              <Palette className="h-3.5 w-3.5 text-slate-400" />
                              <span>Change Color</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenFolderMenuId(null);
                                promptDeleteFolder(folder.name, folder.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FILES SECTION */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span className="font-bold text-slate-700">Files</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] text-slate-600 font-medium">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div
                onContextMenu={handleCanvasContextMenu}
                className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-2xs min-h-[260px] flex flex-col items-center justify-center cursor-default"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3.5 border border-indigo-100/80 shadow-xs">
                  <FolderOpen className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {activeTab !== "drive"
                    ? `No ${activeTab} documents found`
                    : currentFolder
                    ? `"${currentFolder.name}" is empty`
                    : "No documents in your vault yet"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {currentFolder
                    ? "Upload documents directly into this folder or create subfolders. Right-click anywhere for options."
                    : "Securely store ID cards, certificates, tax papers, and medical records. Right-click anywhere for options."}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Upload Document</span>
                  </button>
                  {currentFolder && (
                    <button
                      type="button"
                      onClick={() => setIsFolderOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <FolderPlus className="h-3.5 w-3.5 text-indigo-600" />
                      <span>New Subfolder</span>
                    </button>
                  )}
                </div>
              </div>
            ) : viewMode === "grid" ? (
              /* GOOGLE DRIVE GRID VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredDocuments.map((doc) => {
                  const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
                  const isImage =
                    doc.fileType === "png" ||
                    doc.fileType === "jpg" ||
                    doc.fileType === "jpeg" ||
                    doc.fileType === "webp" ||
                    doc.fileUrl?.startsWith("data:image") ||
                    doc.name?.toLowerCase().endsWith(".png") ||
                    doc.name?.toLowerCase().endsWith(".jpg") ||
                    doc.name?.toLowerCase().endsWith(".jpeg");

                  const isSheet =
                    doc.name?.toLowerCase().endsWith(".xlsx") ||
                    doc.name?.toLowerCase().endsWith(".csv") ||
                    doc.name?.toLowerCase().endsWith(".sheet");

                  const isPdf =
                    doc.name?.toLowerCase().endsWith(".pdf") ||
                    doc.fileType?.toLowerCase() === "pdf";

                  const thumbnailSrc =
                    driveId && isImage
                      ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
                      : isImage && doc.fileUrl && !driveId
                      ? doc.fileUrl
                      : null;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      onContextMenu={(e) => handleDocContextMenu(doc, e)}
                      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer overflow-hidden select-none"
                    >
                      {/* Top Header: File Type Badge + File Title + 3-dots */}
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-slate-100 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                          {/* File Icon Badge Google Drive Style */}
                          <div className="shrink-0">
                            {isSheet ? (
                              <div className="h-5 w-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                                <FileText className="h-3 w-3" />
                              </div>
                            ) : isPdf ? (
                              <div className="h-5 w-5 rounded bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                                <FileText className="h-3 w-3" />
                              </div>
                            ) : isImage ? (
                              <div className="h-5 w-5 rounded bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                                <Eye className="h-3 w-3" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                                <FileText className="h-3 w-3" />
                              </div>
                            )}
                          </div>

                          <span
                            className="text-xs font-medium text-slate-800 truncate group-hover:text-slate-900"
                            title={doc.name}
                          >
                            {doc.name}
                          </span>
                        </div>

                        {/* Quick 3-dots Context Menu Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocContextMenu(doc, e);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition shrink-0 cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Main Body: Large Visual Preview (Google Drive Grid Style) */}
                      <div className="h-36 w-full bg-slate-50/70 relative flex items-center justify-center overflow-hidden border-b border-slate-100/60">
                        {thumbnailSrc ? (
                          <img
                            src={thumbnailSrc}
                            alt={doc.name}
                            className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-200"
                          />
                        ) : (
                          /* Document Preview Mockup Sheet (Google Drive thumbnail card style) */
                          <div className="w-[82%] h-[80%] rounded-md bg-white border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between group-hover:border-slate-300 transition-all">
                            <div className="space-y-1.5">
                              <div className="h-2 w-3/4 rounded bg-slate-200/70" />
                              <div className="h-1.5 w-full rounded bg-slate-100" />
                              <div className="h-1.5 w-5/6 rounded bg-slate-100" />
                              <div className="h-1.5 w-2/3 rounded bg-slate-100" />
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                {doc.category}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {doc.fileType || "doc"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Star Favorite Indicator on Preview */}
                        {doc.isFavorite && (
                          <div className="absolute top-2 right-2">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow-xs" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 bg-white">
                        <span className="truncate max-w-[120px]">
                          {doc.familyMemberName || "Personal"}
                        </span>
                        <span>
                          {doc.folderName || "Vault"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GOOGLE DRIVE LIST / TABLE VIEW */
              <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Owner</th>
                        <th className="px-3 py-3">Folder</th>
                        <th className="px-3 py-3">Expiry</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocuments.map((doc) => {
                        const isExpiring =
                          doc.expiryDate &&
                          (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30 &&
                          (new Date(doc.expiryDate).getTime() - Date.now()) >= 0;
                        const isExpired =
                          doc.expiryDate && (new Date(doc.expiryDate).getTime() - Date.now()) < 0;

                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-slate-50/80 transition cursor-pointer group"
                            onClick={() => setPreviewDoc(doc)}
                            onContextMenu={(e) => handleDocContextMenu(doc, e)}
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(doc);
                                  }}
                                  className="text-slate-300 hover:text-amber-500 transition cursor-pointer"
                                >
                                  <Star
                                    className={`h-3.5 w-3.5 ${
                                      doc.isFavorite ? "fill-amber-500 text-amber-500" : ""
                                    }`}
                                  />
                                </button>
                                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <FileText className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition block truncate max-w-xs">
                                    {doc.name}
                                  </span>
                                  {doc.documentNumber && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      #{doc.documentNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {doc.category}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                              {doc.familyMemberName || "Personal"}
                            </td>
                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Folder className="h-3 w-3 text-slate-400" />
                                <span>{doc.folderName || "General"}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {doc.expiryDate ? (
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                    isExpired
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : isExpiring
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {doc.expiryDate}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {(doc.fileUrl || doc.driveFileId) && (
                                  <button
                                    type="button"
                                    onClick={() => downloadDocumentFile(doc)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDocToDelete(doc)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GOOGLE DRIVE RIGHT-CLICK CONTEXT MENU                                     */}
      {/* ========================================================================= */}
      {contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="fixed z-50 w-52 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "canvas" && (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setIsFolderOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <FolderPlus className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>New folder</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  setIsAddOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <Plus className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Upload document</span>
              </button>
            </div>
          )}

          {contextMenu.type === "folder" && contextMenu.targetFolder && (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  const f = contextMenu.targetFolder!;
                  setContextMenu(null);
                  setCurrentFolderId(f.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <FolderOpen className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Open folder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const f = contextMenu.targetFolder!;
                  setContextMenu(null);
                  setFolderToRename(f);
                  setRenameInputValue(f.name);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <Edit2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const f = contextMenu.targetFolder!;
                  setContextMenu(null);
                  setFolderToColor(f);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <Palette className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Change color</span>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  const f = contextMenu.targetFolder!;
                  setContextMenu(null);
                  promptDeleteFolder(f.name, f.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium text-left"
              >
                <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Delete folder</span>
              </button>
            </div>
          )}

          {contextMenu.type === "file" && contextMenu.targetDoc && (
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  const d = contextMenu.targetDoc!;
                  setContextMenu(null);
                  setPreviewDoc(d);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <Eye className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Preview</span>
              </button>

              {(contextMenu.targetDoc.fileUrl || contextMenu.targetDoc.driveFileId) && (
                <button
                  type="button"
                  onClick={() => {
                    const d = contextMenu.targetDoc!;
                    setContextMenu(null);
                    downloadDocumentFile(d);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
                >
                  <Download className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Download</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const d = contextMenu.targetDoc!;
                  setContextMenu(null);
                  toggleFavorite(d);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer font-medium text-left"
              >
                <Star className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{contextMenu.targetDoc.isFavorite ? "Remove from Starred" : "Add to Starred"}</span>
              </button>

              {canDelete && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      const d = contextMenu.targetDoc!;
                      setContextMenu(null);
                      setDocToDelete(d);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer font-medium text-left"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. New Folder Modal */}
      {isFolderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setIsFolderOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                {currentFolder ? `New Subfolder in "${currentFolder.name}"` : "New Folder"}
              </h2>
              <button
                type="button"
                onClick={() => setIsFolderOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Folder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="folderName"
                  required
                  autoFocus
                  placeholder="e.g. Tax Returns 2026, Passports, Land Deeds"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Folder Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {FOLDER_COLOR_PALETTE.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-400 has-checked:border-slate-900 has-checked:bg-slate-50 transition"
                    >
                      <input
                        type="radio"
                        name="color"
                        value={c.id}
                        defaultChecked={c.id === "indigo"}
                        className="sr-only"
                      />
                      <span className={`h-4 w-4 rounded-full ${c.dot} shrink-0`} />
                      <span className="text-xs text-slate-700 font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={folderSaving}
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {folderSaving ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rename Folder Modal */}
      {folderToRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setFolderToRename(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Rename Folder
              </h2>
              <button
                type="button"
                onClick={() => setFolderToRename(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameFolder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFolderToRename(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Change Folder Color Modal */}
      {folderToColor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setFolderToColor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Change Folder Color
              </h2>
              <button
                type="button"
                onClick={() => setFolderToColor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Choose a color for <strong>"{folderToColor.name}"</strong>:
              </p>

              <div className="grid grid-cols-4 gap-2.5">
                {FOLDER_COLOR_PALETTE.map((c) => {
                  const isCurrent = (folderToColor.color || "indigo").toLowerCase() === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleChangeFolderColor(folderToColor, c.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer ${
                        isCurrent
                          ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/20"
                          : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full ${c.dot} flex items-center justify-center text-white mb-1 shadow-2xs`}>
                        {isCurrent && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-[10px] font-medium text-slate-700">{c.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFolderToColor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setFolderToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Delete Folder "{folderToDelete.name}"?
              </h2>
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the folder <strong>"{folderToDelete.name}"</strong>?
              </p>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                <Cloud className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Google Drive sync: Folder will be permanently removed from cloud storage.</span>
              </div>

              {(() => {
                const docsInTarget = documents.filter(
                  (d) => (d.folderName || "").toLowerCase() === folderToDelete.name.toLowerCase(),
                );
                if (docsInTarget.length === 0) return null;
                return (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-100 bg-rose-50/70 cursor-pointer transition hover:bg-rose-50 select-none">
                    <input
                      type="checkbox"
                      checked={deleteFolderDocs}
                      onChange={(e) => setDeleteFolderDocs(e.target.checked)}
                      className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-rose-900 block">
                        Also permanently delete {docsInTarget.length} document{docsInTarget.length > 1 ? "s" : ""} in this folder
                      </span>
                      <span className="text-rose-600 text-[11px] block mt-0.5">
                        {deleteFolderDocs
                          ? "Files will be removed from your vault and deleted from Google Drive."
                          : "Files will be kept safely in 'All Documents' as unfiled vault documents."}
                      </span>
                    </div>
                  </label>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingFolder}
                  onClick={() => setFolderToDelete(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingFolder}
                  onClick={confirmDeleteFolder}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeletingFolder ? "Deleting..." : "Delete Folder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Upload Document Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setIsAddOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">Upload New Document</h2>
                <p className="text-[11px] text-slate-500">Keep essential records safe, categorized, and accessible.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Basic vs Advanced Tab Switcher */}
            <div className="flex border-b border-slate-100 px-6 pt-2 bg-white gap-4">
              <button
                type="button"
                onClick={() => setAddDocTab("basic")}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  addDocTab === "basic"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Basic Information
              </button>
              <button
                type="button"
                onClick={() => setAddDocTab("advanced")}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  addDocTab === "advanced"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Advanced & Reminders
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-6 space-y-4">
              {addDocTab === "basic" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Document Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. National ID, Passport, BSc Certificate, Land Deed"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* File Attachment as primary in Basic */}
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Document File (PDF / Image) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx"
                      className="w-full rounded-xl border border-dashed border-slate-300 bg-white p-2.5 text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Supported formats: PDF, PNG, JPG, JPEG, DOCX.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Target Folder
                      </label>
                      <FormControl size="small" fullWidth>
                        <Select
                          name="folderName"
                          defaultValue={currentFolder ? currentFolder.name : "General"}
                          displayEmpty
                          sx={{
                            fontSize: "0.75rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            borderRadius: "0.75rem",
                            backgroundColor: "#f8fafc",
                            "& .MuiSelect-select": {
                              fontSize: "0.75rem",
                              py: "8px",
                            },
                          }}
                        >
                          <MenuItem value="General" sx={{ fontSize: "0.75rem" }}>
                            General (Root)
                          </MenuItem>
                          {folders
                            .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
                            .map((f) => (
                              <MenuItem key={f.id} value={f.name} sx={{ fontSize: "0.75rem" }}>
                                📁 {f.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <FormControl size="small" fullWidth>
                        <Select
                          name="category"
                          required
                          defaultValue={categories[0]}
                          sx={{
                            fontSize: "0.75rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            borderRadius: "0.75rem",
                            backgroundColor: "#f8fafc",
                            "& .MuiSelect-select": {
                              fontSize: "0.75rem",
                              py: "8px",
                            },
                          }}
                        >
                          {categories.map((c) => (
                            <MenuItem key={c} value={c} sx={{ fontSize: "0.75rem" }}>
                              {c}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Owner / Family Member
                      </label>
                      <FormControl size="small" fullWidth>
                        <Select
                          name="familyMemberId"
                          defaultValue=""
                          displayEmpty
                          sx={{
                            fontSize: "0.75rem",
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
                            borderRadius: "0.75rem",
                            backgroundColor: "#f8fafc",
                            "& .MuiSelect-select": {
                              fontSize: "0.75rem",
                              py: "8px",
                            },
                          }}
                        >
                          <MenuItem value="" sx={{ fontSize: "0.75rem" }}>
                            Personal / Self
                          </MenuItem>
                          {familyMembers.map((m) => (
                            <MenuItem key={m.id} value={m.id} sx={{ fontSize: "0.75rem" }}>
                              👤 {m.fullName} ({m.relationship})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Expiry Date
                      </label>
                      <input
                        name="expiryDate"
                        type="date"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Document / ID Number
                      </label>
                      <input
                        name="documentNumber"
                        placeholder="e.g. 5938291048"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Issuing Authority
                      </label>
                      <input
                        name="issuingAuthority"
                        placeholder="e.g. Election Commission, BRTA"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Direct Document / Cloud Link (Optional)
                    </label>
                    <input
                      name="driveLink"
                      placeholder="https://... (direct Google Drive or cloud URL)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Item-Wise Automated WhatsApp Reminder (UNCHECKED BY DEFAULT) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                    <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-900 cursor-pointer">
                      <input
                        name="requiresRenewal"
                        type="checkbox"
                        defaultChecked={false}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Enable Automated WhatsApp Expiry Reminder</span>
                    </label>

                    <div className="flex items-center gap-2 text-xs text-slate-600 pl-6">
                      <span className="text-[11px] font-medium text-slate-700">Remind Lead Time:</span>
                      <select
                        name="reminderLeadDays"
                        defaultValue={15}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      >
                        <option value={3}>3 days before expiry (Urgent)</option>
                        <option value={7}>7 days before expiry (Standard)</option>
                        <option value={15}>15 days before expiry (Recommended)</option>
                        <option value={30}>30 days before expiry (Early warning)</option>
                        <option value={60}>60 days before expiry</option>
                      </select>
                    </div>

                    <div className="pl-6 pt-1">
                      <ItemRecipientSelector
                        selectedRecipients={docReminderRecipients}
                        onChange={setDocReminderRecipients}
                        label="Send Expiry Reminder To:"
                        helperText="Choose which recipient alias(es) will be alerted when this document approaches expiry."
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving || uploadingToDrive}
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving || uploadingToDrive ? "Saving Document..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setPreviewDoc(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl sm:max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {previewDoc.category}
                    </span>
                    {(previewDoc.driveFileId ||
                      previewDoc.fileUrl?.includes("drive.google.com") ||
                      previewDoc.storageProvider === "google_drive") && (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Google Drive
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                    {previewDoc.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {/* File Viewer Section */}
              {(() => {
                const driveId = previewDoc.driveFileId || (previewDoc.fileUrl ? extractGoogleDriveFileId(previewDoc.fileUrl) : null);
                const isImage =
                  previewDoc.fileUrl?.startsWith("data:image") ||
                  ["png", "jpg", "jpeg", "webp", "gif", "svg"].some(
                    (ext) =>
                      previewDoc.fileType?.toLowerCase() === ext ||
                      previewDoc.name?.toLowerCase().endsWith(`.${ext}`),
                  );
                const isPdf =
                  previewDoc.fileUrl?.startsWith("data:application/pdf") ||
                  previewDoc.fileType?.toLowerCase() === "pdf" ||
                  previewDoc.name?.toLowerCase().endsWith(".pdf");

                if (driveId) {
                  return (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs">
                      <div className="bg-slate-100/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="font-semibold text-slate-700">File Preview</span>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            Master Drive
                          </span>
                        </div>
                        <a
                          href={`https://drive.google.com/file/d/${driveId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <span>Open in Google Drive</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <iframe
                        src={`https://drive.google.com/file/d/${driveId}/preview`}
                        title={previewDoc.name}
                        className="w-full h-80 sm:h-96 border-0 bg-white"
                        allow="autoplay"
                      />
                    </div>
                  );
                }

                if (isImage && previewDoc.fileUrl) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center overflow-hidden flex flex-col items-center justify-center">
                      <img
                        src={previewDoc.fileUrl}
                        alt={previewDoc.name}
                        className="max-h-80 w-auto object-contain rounded-lg shadow-xs"
                      />
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDocumentFile(previewDoc)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>View Full Size Image</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isPdf && previewDoc.fileUrl) {
                  return (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="bg-slate-100/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          PDF Document
                        </span>
                        <button
                          type="button"
                          onClick={() => openDocumentFile(previewDoc)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <span>Open in New Tab</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                      <iframe
                        src={previewDoc.fileUrl}
                        title={previewDoc.name}
                        className="w-full h-80 sm:h-96 border-0 bg-white"
                      />
                    </div>
                  );
                }

                if (previewDoc.fileUrl) {
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{previewDoc.name}</p>
                          <p className="text-[11px] text-slate-500 uppercase">{previewDoc.fileType || "File"}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDocumentFile(previewDoc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download / View</span>
                      </button>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Folder
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-indigo-600" />
                    {previewDoc.folderName || "General"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Owner / Member
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    {previewDoc.familyMemberName || "Personal / Self"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Document Number
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {previewDoc.documentNumber || "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Expiry Date
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {previewDoc.expiryDate || "No Expiry"}
                  </span>
                </div>

                {previewDoc.issuingAuthority && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Issuing Authority
                    </span>
                    <span className="font-semibold text-slate-800">
                      {previewDoc.issuingAuthority}
                    </span>
                  </div>
                )}

                {previewDoc.notes && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Notes
                    </span>
                    <p className="text-slate-600 leading-relaxed text-xs">
                      {previewDoc.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDocToDelete(previewDoc)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Document</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {(previewDoc.fileUrl || previewDoc.driveFileId) && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadDocumentFile(previewDoc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDocumentFile(previewDoc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open in New Tab</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Document Confirmation Modal */}
      {docToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => !isDeletingDoc && setDocToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Delete "{docToDelete.name}"?
              </h2>
              <button
                type="button"
                disabled={isDeletingDoc}
                onClick={() => setDocToDelete(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-slate-900">"{docToDelete.name}"</span>?
                {docToDelete.driveFileId ||
                docToDelete.storageProvider === "google_drive" ||
                docToDelete.fileUrl?.includes("drive.google.com")
                  ? " This will also permanently remove the file from your Google Drive."
                  : " This document will be permanently removed from your vault."}
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingDoc}
                  onClick={() => setDocToDelete(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingDoc}
                  onClick={confirmDeleteDocument}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isDeletingDoc ? "Deleting..." : "Delete Document"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
