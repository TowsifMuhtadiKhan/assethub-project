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
  ChevronDown,
  Users,
  Clock,
  Building,
  Car,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  HeartPulse,
  Plane,
  Receipt,
  FileCheck,
  ExternalLink,
  LayoutGrid,
  List,
  Eye,
  MoreVertical,
  Cloud,
} from "lucide-react";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  updateDocument,
  listDocumentFolders,
  createDocumentFolder,
  deleteDocumentFolder,
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

const categoryIcons: Record<string, any> = {
  Identity: ShieldCheck,
  Academic: GraduationCap,
  Employment: Briefcase,
  "Tax/Financial": Receipt,
  Health: HeartPulse,
  Legal: FileCheck,
  Travel: Plane,
  Vehicle: Car,
  Property: Building,
  Other: FileText,
};

type TreeSelection =
  | { type: "all"; label: string }
  | { type: "favorites"; label: string }
  | { type: "expiring"; label: string }
  | { type: "member"; id: string; label: string }
  | { type: "member_category"; memberId: string; category: DocumentCategory; label: string }
  | { type: "folder"; folderId?: string; folderName: string; label: string }
  | { type: "category"; category: DocumentCategory; label: string };

export function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");

  // Tree selection state
  const [treeSelection, setTreeSelection] = useState<TreeSelection>({
    type: "all",
    label: "All Vault Documents",
  });

  // Expanded nodes in tree
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    quick: true,
    family: true,
    categories: true,
    folders: true,
  });

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
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
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("lifenest_documents_view_mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [docReminderRecipients, setDocReminderRecipients] = useState<string[]>(["Personal"]);

  useEffect(() => {
    const handleGlobalClick = () => setOpenFolderMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("lifenest_documents_view_mode", mode);
    } catch {}
  };

  // Subfolder hierarchy states (up to 3 levels)
  const [folderModalParentId, setFolderModalParentId] = useState<string | undefined>(undefined);
  const [expandedFolderNodes, setExpandedFolderNodes] = useState<Record<string, boolean>>({
    general: true,
  });

  const toggleFolderNode = (folderIdOrName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderNodes((prev) => ({
      ...prev,
      [folderIdOrName]: !prev[folderIdOrName],
    }));
  };

  const openCreateFolderModal = (parentId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderModalParentId(parentId);
    setIsFolderOpen(true);
  };

  // Calculate depth level of a folder (1 = Root, 2 = Subfolder, 3 = Sub-subfolder)
  const getFolderLevel = (folder: DocumentFolder): number => {
    if (!folder.parentId) return 1;
    const parent = folders.find(
      (f) => f.id === folder.parentId || f.name.toLowerCase() === folder.parentId?.toLowerCase(),
    );
    if (!parent) return 1;
    if (!parent.parentId) return 2;
    return 3;
  };

  // Get ancestor chain for breadcrumbs: [root, level2, active]
  const getFolderAncestors = (folder: DocumentFolder): DocumentFolder[] => {
    const list: DocumentFolder[] = [folder];
    let cur = folder;
    while (cur.parentId && list.length < 4) {
      const parent = folders.find(
        (f) => f.id === cur.parentId || f.name.toLowerCase() === cur.parentId?.toLowerCase(),
      );
      if (parent && !list.some((x) => x.id === parent.id)) {
        list.unshift(parent);
        cur = parent;
      } else {
        break;
      }
    }
    return list;
  };

  // Get direct child subfolders of a folder
  const getChildFolders = (folderIdOrName?: string): DocumentFolder[] => {
    if (!folderIdOrName) return [];
    const target = folders.find(
      (f) => f.id === folderIdOrName || f.name.toLowerCase() === folderIdOrName.toLowerCase(),
    );
    const targetId = target?.id;
    const targetName = target?.name.toLowerCase() || folderIdOrName.toLowerCase();

    return folders
      .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
      .filter(
        (f) =>
          (targetId && f.parentId === targetId) ||
          (f.parentId && f.parentId.toLowerCase() === targetName),
      );
  };

  // Hierarchically ordered folders for dropdown select menus
  const getHierarchyFolderOptions = () => {
    const isGeneralDeleted = deletedFolderNames.includes("general");
    const hasGeneralInFolders = folders.some((f) => f.name.toLowerCase() === "general");
    const showGeneral = !isGeneralDeleted && !hasGeneralInFolders;

    const rootFolders: DocumentFolder[] = [
      ...(showGeneral ? [{ id: "general_default", name: "General", color: "slate" }] : []),
      ...folders
        .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
        .filter(
          (f) =>
            !f.parentId ||
            !folders.some(
              (p) =>
                p.id === f.parentId ||
                p.name.toLowerCase() === f.parentId?.toLowerCase(),
            ),
        ),
    ];

    const result: { folder: DocumentFolder; level: number; label: string }[] = [];

    const traverse = (f: DocumentFolder, lvl: number) => {
      const prefix = lvl === 1 ? "📁 " : lvl === 2 ? "　↳ 📁 " : "　　↳ 📁 ";
      const levelTag = lvl === 1 ? "(Root)" : lvl === 2 ? "(Level 2)" : "(Level 3)";
      result.push({
        folder: f,
        level: lvl,
        label: `${prefix}${f.name} ${levelTag}`,
      });

      if (lvl < 3) {
        const children = folders.filter(
          (c) =>
            !deletedFolderNames.includes(c.name.toLowerCase()) &&
            (c.parentId === f.id || (f.name && c.parentId?.toLowerCase() === f.name.toLowerCase())),
        );
        children.forEach((c) => traverse(c, lvl + 1));
      }
    };

    rootFolders.forEach((r) => traverse(r, 1));
    return result;
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

      // Expand all family member nodes by default
      const initialExpanded: Record<string, boolean> = {
        quick: true,
        family: true,
        categories: true,
        folders: true,
      };
      members.forEach((m) => {
        initialExpanded[`member_${m.id}`] = true;
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

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
        const assignedFolder = String(form.get("folderName") || "General").trim();
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
            subfolderName: assignedFolder || "General",
            customName: String(form.get("name")),
          });
          fileUrl = gRes.webViewLink;
          driveFileId = gRes.id;
          storageProvider = "google_drive";
          fileType = detectedExt;
        } catch (gErr) {
          console.warn("Google Drive upload failed, falling back to local vault:", gErr);
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

      const assignedFolder = String(form.get("folderName") || "General").trim();
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
        folderName: assignedFolder || "General",
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
        assignedFolder &&
        assignedFolder !== "General" &&
        !folders.some((f) => f.name.toLowerCase() === assignedFolder.toLowerCase())
      ) {
        const createdFolder = await createDocumentFolder({ name: assignedFolder });
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

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    const formElement = e.currentTarget;
    e.preventDefault();
    setFolderSaving(true);
    setError("");
    const form = new FormData(formElement);
    const name = String(form.get("folderName") || "").trim();
    const parentId = String(form.get("parentId") || "").trim() || undefined;
    const familyMemberId = String(form.get("familyMemberId") || "") || undefined;
    const color = String(form.get("color") || "indigo");

    if (!name) {
      setFolderSaving(false);
      return;
    }

    try {
      const created = await createDocumentFolder({
        name,
        parentId,
        familyMemberId,
        color,
      });
      if (familyMemberId) {
        const mem = familyMembers.find((m) => m.id === familyMemberId);
        created.familyMemberName = mem?.fullName;
      }

      // If parentId was specified, expand the parent in the tree automatically
      if (parentId) {
        setExpandedFolderNodes((prev) => ({ ...prev, [parentId]: true }));
      }

      // If this folder name was previously marked deleted, un-delete it
      const lowerName = name.toLowerCase();
      if (deletedFolderNames.includes(lowerName)) {
        const updatedDeleted = deletedFolderNames.filter((d) => d !== lowerName);
        setDeletedFolderNames(updatedDeleted);
        localStorage.setItem("lifenest_deleted_folders", JSON.stringify(updatedDeleted));
      }

      setFolders((prev) => [...prev.filter((f) => f.name.toLowerCase() !== lowerName), created]);
      setTreeSelection({
        type: "folder",
        folderId: created.id,
        folderName: created.name,
        label: created.name,
      });
      formElement?.reset?.();
      setFolderModalParentId(undefined);
      setIsFolderOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setFolderSaving(false);
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
      // Find all nested descendants recursively
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

      // 2. Permanently sync folder deletion with Google Drive
      for (const targetName of namesToDelete) {
        await deleteFolderFromMasterGoogleDrive({
          folderName: targetName,
          folderId: id,
        });
      }

      // 3. Handle documents inside the deleted folders
      const docsInFolder = documents.filter((d) =>
        namesToDelete.has((d.folderName || "").toLowerCase()),
      );

      if (deleteFolderDocs) {
        // Delete each document from database and purge file from Google Drive
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
        // Unfile documents so they remain safely in "All Documents"
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

      // Persist in deletedFolderNames
      const updatedDeleted = Array.from(new Set([...deletedFolderNames, ...namesToDelete]));
      setDeletedFolderNames(updatedDeleted);
      localStorage.setItem("lifenest_deleted_folders", JSON.stringify(updatedDeleted));

      // Reset view to All Documents if active folder or any of its ancestors was deleted
      if (
        treeSelection.type === "folder" &&
        (namesToDelete.has(treeSelection.folderName.toLowerCase()) ||
          (treeSelection.folderId && idsToDelete.has(treeSelection.folderId)))
      ) {
        setTreeSelection({ type: "all", label: "All Vault Documents" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    } finally {
      setIsDeletingFolder(false);
      setFolderToDelete(null);
    }
  };

  const promptDeleteDocument = (doc: DocumentItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocToDelete(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    setError("");
    const doc = docToDelete;
    try {
      // 1. Delete from database / Supabase
      await deleteDocument(doc.id);

      // 2. If uploaded to Google Drive, also permanently delete from Master Drive
      const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
      if (driveId) {
        await deleteDocumentFromMasterGoogleDrive(driveId);
      }

      // 3. Update documents state
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

  // Pre-calculated counts
  const favoriteCount = documents.filter((d) => d.isFavorite).length;
  const expiringCount = documents.filter((d) => {
    if (!d.expiryDate) return false;
    const diff = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff <= 30;
  }).length;

  // Filtered documents matching search + category dropdown + tree node
  const filteredDocuments = documents.filter((doc) => {
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

    // 2. Extra Category Dropdown Filter
    if (selectedCategoryFilter !== "All" && doc.category !== selectedCategoryFilter) {
      return false;
    }

    // 3. Tree Node Filter
    switch (treeSelection.type) {
      case "favorites":
        return doc.isFavorite;
      case "expiring": {
        if (!doc.expiryDate) return false;
        const diff = (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      case "member":
        if (treeSelection.id === "personal") return !doc.familyMemberId;
        return doc.familyMemberId === treeSelection.id;
      case "member_category":
        if (treeSelection.memberId === "personal") {
          return !doc.familyMemberId && doc.category === treeSelection.category;
        }
        return doc.familyMemberId === treeSelection.memberId && doc.category === treeSelection.category;
      case "folder":
        return (doc.folderName || "General").toLowerCase() === treeSelection.folderName.toLowerCase();
      case "category":
        return doc.category === treeSelection.category;
      case "all":
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4 w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 font-display">
            Document Vault
          </h1>
          <p className="text-xs text-slate-500">
            Personal & family records, certificates, and ID documents structured in a folder hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openCreateFolderModal(undefined)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-600" />
            <span>New Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Helpful Supabase table setup banner if schema not executed yet */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* 2-Column Document Vault: Left Tree Navigator + Right Content Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: FOLDER HIERARCHY TREE */}
        <aside className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Folder className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Vault Tree
              </span>
            </div>
            <button
              type="button"
              onClick={() => openCreateFolderModal(undefined)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
              title="Add Custom Folder"
            >
              <Plus className="h-3 w-3" />
              Folder
            </button>
          </div>

          {/* Quick Views */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Overview
            </div>

            <button
              type="button"
              onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                treeSelection.type === "all"
                  ? "bg-slate-900 text-white font-semibold"
                  : "text-slate-700 hover:bg-slate-100/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>All Documents</span>
              </span>
              <span
                className={`text-[10px] rounded-md px-1.5 py-0.2 ${
                  treeSelection.type === "all" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                }`}
              >
                {documents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTreeSelection({ type: "favorites", label: "Starred Documents" })}
              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                treeSelection.type === "favorites"
                  ? "bg-amber-500 text-white font-semibold"
                  : "text-slate-700 hover:bg-slate-100/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span>Favorites</span>
              </span>
              <span
                className={`text-[10px] rounded-md px-1.5 py-0.2 ${
                  treeSelection.type === "favorites"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {favoriteCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTreeSelection({ type: "expiring", label: "Expiring Documents" })}
              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                treeSelection.type === "expiring"
                  ? "bg-rose-600 text-white font-semibold"
                  : "text-slate-700 hover:bg-slate-100/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-rose-500" />
                <span>Expiring (30d)</span>
              </span>
              <span
                className={`text-[10px] rounded-md px-1.5 py-0.2 ${
                  treeSelection.type === "expiring"
                    ? "bg-rose-700 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {expiringCount}
              </span>
            </button>
          </div>

          {/* FAMILY TREE SECTION */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div
              onClick={() => toggleNode("family")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                Family Hierarchy
              </span>
              {expandedNodes.family ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>

            {expandedNodes.family && (
              <div className="space-y-1 pl-1">
                {/* 1. Self / Unassigned */}
                {(() => {
                  const personalDocs = documents.filter((d) => !d.familyMemberId);
                  const isPersonalSelected =
                    treeSelection.type === "member" && treeSelection.id === "personal";
                  const nodeKey = "member_personal";
                  const isExpanded = Boolean(expandedNodes[nodeKey]);

                  return (
                    <div key="personal" className="space-y-0.5">
                      <div
                        onClick={() =>
                          setTreeSelection({
                            type: "member",
                            id: "personal",
                            label: "Personal (Self)",
                          })
                        }
                        className={`group flex items-center justify-between rounded-xl px-2 py-1.5 text-xs transition cursor-pointer ${
                          isPersonalSelected
                            ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80"
                            : "text-slate-800 hover:bg-slate-100/80 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => toggleNode(nodeKey, e)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                          <span className="text-xs">👤</span>
                          <span className="truncate">Personal (Self)</span>
                        </div>
                        <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-500">
                          {personalDocs.length}
                        </span>
                      </div>

                      {/* Sub-categories for Personal */}
                      {isExpanded && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-200/70 ml-3">
                          {categories.map((cat) => {
                            const count = personalDocs.filter((d) => d.category === cat).length;
                            if (count === 0) return null;
                            const Icon = categoryIcons[cat] || FileText;
                            const isSubSelected =
                              treeSelection.type === "member_category" &&
                              treeSelection.memberId === "personal" &&
                              treeSelection.category === cat;

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() =>
                                   setTreeSelection({
                                     type: "member_category",
                                     memberId: "personal",
                                     category: cat,
                                     label: `Personal > ${cat}`,
                                   })
                                }
                                className={`w-full flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition cursor-pointer ${
                                  isSubSelected
                                    ? "bg-indigo-600 text-white font-semibold"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Icon className="h-3 w-3 opacity-70" />
                                  <span>{cat}</span>
                                </span>
                                <span className="text-[10px] opacity-70">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Registered Family Members */}
                {familyMembers.map((member) => {
                  const memberDocs = documents.filter((d) => d.familyMemberId === member.id);
                  const isMemberSelected =
                    treeSelection.type === "member" && treeSelection.id === member.id;
                  const nodeKey = `member_${member.id}`;
                  const isExpanded = Boolean(expandedNodes[nodeKey]);

                  return (
                    <div key={member.id} className="space-y-0.5">
                      <div
                        onClick={() =>
                          setTreeSelection({
                            type: "member",
                            id: member.id,
                            label: member.fullName,
                          })
                        }
                        className={`group flex items-center justify-between rounded-xl px-2 py-1.5 text-xs transition cursor-pointer ${
                          isMemberSelected
                            ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80"
                            : "text-slate-800 hover:bg-slate-100/80 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => toggleNode(nodeKey, e)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                          <span className="text-xs">
                            {member.relationship === "Spouse"
                              ? "💍"
                              : member.relationship === "Child"
                              ? "👶"
                              : member.relationship === "Parent"
                              ? "👵"
                              : "👤"}
                          </span>
                          <span className="truncate">{member.fullName}</span>
                        </div>
                        <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-500">
                          {memberDocs.length}
                        </span>
                      </div>

                      {/* Sub-categories under Member */}
                      {isExpanded && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-200/70 ml-3">
                          {categories.map((cat) => {
                            const count = memberDocs.filter((d) => d.category === cat).length;
                            if (count === 0) return null;
                            const Icon = categoryIcons[cat] || FileText;
                            const isSubSelected =
                              treeSelection.type === "member_category" &&
                              treeSelection.memberId === member.id &&
                              treeSelection.category === cat;

                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() =>
                                  setTreeSelection({
                                    type: "member_category",
                                    memberId: member.id,
                                    category: cat,
                                    label: `${member.fullName} > ${cat}`,
                                  })
                                }
                                className={`w-full flex items-center justify-between rounded-lg px-2 py-1 text-[11px] transition cursor-pointer ${
                                  isSubSelected
                                    ? "bg-indigo-600 text-white font-semibold"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <Icon className="h-3 w-3 opacity-70" />
                                  <span>{cat}</span>
                                </span>
                                <span className="text-[10px] opacity-70">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUSTOM FOLDERS SECTION */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <div
              onClick={() => toggleNode("folders")}
              className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-slate-400" />
                Custom Folders
              </span>
              {expandedNodes.folders ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>

            {expandedNodes.folders && (
              <div className="space-y-0.5 pl-1">
                {(() => {
                  const isGeneralDeleted = deletedFolderNames.includes("general");
                  const hasGeneralInFolders = folders.some((f) => f.name.toLowerCase() === "general");
                  const showGeneral = !isGeneralDeleted && !hasGeneralInFolders;

                  // Root level folders (folders with no parentId, or parentId not existing)
                  const rootFolders: DocumentFolder[] = [
                    ...(showGeneral ? [{ id: "general_default", name: "General", color: "slate" }] : []),
                    ...folders
                      .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
                      .filter(
                        (f) =>
                          !f.parentId ||
                          !folders.some(
                            (p) =>
                              p.id === f.parentId ||
                              p.name.toLowerCase() === f.parentId?.toLowerCase(),
                          ),
                      ),
                  ];

                  if (rootFolders.length === 0) {
                    return (
                      <div className="py-2 px-2 text-[11px] text-slate-400 italic">
                        No custom folders
                      </div>
                    );
                  }

                  // Recursive renderer for up to 3 levels
                  const renderFolderBranch = (folder: DocumentFolder, level: number = 1) => {
                    const children = folders.filter(
                      (f) =>
                        !deletedFolderNames.includes(f.name.toLowerCase()) &&
                        (f.parentId === folder.id ||
                          (folder.name && f.parentId?.toLowerCase() === folder.name.toLowerCase())),
                    );
                    const hasChildren = children.length > 0;
                    const isExpanded = Boolean(expandedFolderNodes[folder.id || folder.name]);
                    const isFolderSelected =
                      treeSelection.type === "folder" &&
                      (treeSelection.folderId === folder.id ||
                        treeSelection.folderName.toLowerCase() === folder.name.toLowerCase());
                    const count = documents.filter(
                      (d) => (d.folderName || "").toLowerCase() === folder.name.toLowerCase(),
                    ).length;

                    const indentClass = level === 1 ? "pl-2" : level === 2 ? "pl-5" : "pl-8";

                    return (
                      <div key={folder.id || folder.name} className="space-y-0.5">
                        <div
                          onClick={() =>
                            setTreeSelection({
                              type: "folder",
                              folderId: folder.id,
                              folderName: folder.name,
                              label: folder.name,
                            })
                          }
                          onDoubleClick={() => {
                            if (hasChildren) toggleFolderNode(folder.id || folder.name);
                          }}
                          className={`group flex items-center justify-between rounded-xl pr-2 py-1.5 text-xs transition cursor-pointer ${indentClass} ${
                            isFolderSelected
                              ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80"
                              : "text-slate-700 hover:bg-slate-100/80 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => toggleFolderNode(folder.id || folder.name, e)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer shrink-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 shrink-0" />
                            )}
                            {isFolderSelected ? (
                              <FolderOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <Folder
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  folder.name === "General" ? "text-slate-400" : "text-indigo-500"
                                }`}
                              />
                            )}
                            <span className="truncate">{folder.name}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 relative">
                            <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-500 font-mono">
                              {count}
                            </span>
                            {folder.id !== "general_default" && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const key = folder.id || folder.name;
                                    setOpenFolderMenuId(openFolderMenuId === key ? null : key);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                                  title="Folder Actions"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {openFolderMenuId === (folder.id || folder.name) && (
                                  <div
                                    className="absolute right-0 top-6 z-40 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {level < 3 && folder.id && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenFolderMenuId(null);
                                          openCreateFolderModal(folder.id, e);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer text-left"
                                      >
                                        <Plus className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>New Subfolder</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFolderMenuId(null);
                                        promptDeleteFolder(folder.name, folder.id, e);
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
                        </div>

                        {/* Render child subfolders if expanded and level < 3 */}
                        {hasChildren && isExpanded && (
                          <div className="relative border-l border-slate-200/70 ml-3.5 pl-1 space-y-0.5">
                            {children.map((child) => renderFolderBranch(child, level + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return rootFolders.map((root) => renderFolderBranch(root, 1));
                })()}

                <button
                  type="button"
                  onClick={() => openCreateFolderModal(undefined)}
                  className="w-full mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create New Folder</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: BREADCRUMBS, SEARCH, AND DOCUMENT TABLE */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3.5">
          {/* Breadcrumbs & Active Tree Selection Banner */}
          {(() => {
            const activeFolder =
              treeSelection.type === "folder"
                ? folders.find(
                    (f) =>
                      (treeSelection.folderId && f.id === treeSelection.folderId) ||
                      f.name.toLowerCase() === treeSelection.folderName.toLowerCase(),
                  )
                : null;
            const activeAncestors = activeFolder ? getFolderAncestors(activeFolder) : [];
            const activeLevel = activeFolder ? getFolderLevel(activeFolder) : 1;

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <button
                    type="button"
                    onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
                    className="text-slate-400 hover:text-indigo-600 font-medium transition cursor-pointer"
                  >
                    Vault Hierarchy
                  </button>

                  {treeSelection.type === "folder" ? (
                    <>
                      {activeAncestors.slice(0, -1).map((ancestor) => (
                        <span key={ancestor.id} className="flex items-center gap-1.5 text-slate-400">
                          <ChevronRight className="h-3 w-3 text-slate-300" />
                          <button
                            type="button"
                            onClick={() =>
                              setTreeSelection({
                                type: "folder",
                                folderId: ancestor.id,
                                folderName: ancestor.name,
                                label: ancestor.name,
                              })
                            }
                            className="hover:text-indigo-600 font-medium transition cursor-pointer"
                          >
                            {ancestor.name}
                          </button>
                        </span>
                      ))}
                      <ChevronRight className="h-3 w-3 text-slate-300" />
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-indigo-600" />
                        {activeFolder?.name || treeSelection.folderName}
                      </span>
                      <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.2 text-[10px] font-bold text-indigo-700">
                        Level {activeLevel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
                      </span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3 text-slate-300" />
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-indigo-600" />
                        {treeSelection.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {treeSelection.type === "folder" && activeLevel < 3 && activeFolder && (
                    <button
                      type="button"
                      onClick={() => openCreateFolderModal(activeFolder.id)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer shadow-2xs"
                      title={`Create a subfolder inside "${activeFolder.name}"`}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Subfolder</span>
                    </button>
                  )}
                  {treeSelection.type === "folder" && (
                    <button
                      type="button"
                      onClick={() => {
                        const match = folders.find(
                          (f) =>
                            (treeSelection.folderId && f.id === treeSelection.folderId) ||
                            f.name.toLowerCase() === treeSelection.folderName.toLowerCase(),
                        );
                        promptDeleteFolder(treeSelection.folderName, match?.id);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                      title={`Delete folder "${treeSelection.folderName}"`}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Folder</span>
                    </button>
                  )}
                  {treeSelection.type !== "all" && (
                    <button
                      type="button"
                      onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>All Documents</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Search Bar, Category Filter, and View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
            <div className="flex-1 w-full">
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents, ID numbers, or authorities..."
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search className="h-4 w-4 text-slate-400" />
                      </InputAdornment>
                    ),
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

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <FormControl size="small" sx={{ minWidth: 140 }} className="flex-1 sm:flex-initial">
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

              {/* View Mode Toggle (Grid vs List like Google Drive) */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shrink-0">
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
                  <span className="hidden md:inline">Grid</span>
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
                  <span className="hidden md:inline">List</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="hidden xl:inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Subfolders Shelf (When viewing a folder that has subfolders OR All Documents) */}
          {(() => {
            const activeFolder =
              treeSelection.type === "folder"
                ? folders.find(
                    (f) =>
                      (treeSelection.folderId && f.id === treeSelection.folderId) ||
                      f.name.toLowerCase() === treeSelection.folderName.toLowerCase(),
                  )
                : null;
            const subfoldersToShow =
              treeSelection.type === "all"
                ? folders
                    .filter((f) => !deletedFolderNames.includes(f.name.toLowerCase()))
                    .filter(
                      (f) =>
                        !f.parentId ||
                        !folders.some(
                          (p) =>
                            p.id === f.parentId ||
                            p.name.toLowerCase() === f.parentId?.toLowerCase(),
                        ),
                    )
                : activeFolder
                ? getChildFolders(activeFolder.id || activeFolder.name)
                : [];

            if (subfoldersToShow.length === 0) return null;

            return (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-indigo-600" />
                    {treeSelection.type === "all" ? "Root Folders" : "Subfolders"}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 lowercase">
                    {subfoldersToShow.length} {subfoldersToShow.length === 1 ? "folder" : "folders"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {subfoldersToShow.map((sub) => {
                    const count = documents.filter(
                      (d) => (d.folderName || "").toLowerCase() === sub.name.toLowerCase(),
                    ).length;
                    const nestedChildren = folders.filter((f) => f.parentId === sub.id).length;
                    const subLevel = getFolderLevel(sub);

                    return (
                      <div
                        key={sub.id}
                        onClick={() =>
                          setTreeSelection({
                            type: "folder",
                            folderId: sub.id,
                            folderName: sub.name,
                            label: sub.name,
                          })
                        }
                        onDoubleClick={() =>
                          setTreeSelection({
                            type: "folder",
                            folderId: sub.id,
                            folderName: sub.name,
                            label: sub.name,
                          })
                        }
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-400 hover:shadow-md hover:bg-slate-50/60 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Folder className="h-4.5 w-4.5 fill-indigo-100" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
                              {sub.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span>
                                {count} {count === 1 ? "file" : "files"}
                              </span>
                              {nestedChildren > 0 && <span>• {nestedChildren} sub</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">
                            L{subLevel}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Files Section Header */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
            <div className="flex items-center gap-1.5">
              <span>Files</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] text-slate-600 font-bold lowercase">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
              </span>
            </div>
          </div>

          {/* Document Content: Grid (Google Drive Cards) OR List View */}
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-2xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3.5 border border-indigo-100/80 shadow-xs">
                <FolderOpen className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {treeSelection.type !== "all"
                  ? `No files directly in "${treeSelection.label}"`
                  : "No documents in your vault yet"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {treeSelection.type === "folder"
                  ? `Upload documents directly into this folder or create subfolders.`
                  : "Securely store ID cards, tax papers, birth certificates, and vehicle registrations."}
              </p>
              <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Upload Document
                </button>
                {treeSelection.type === "folder" && (
                  <button
                    type="button"
                    onClick={() => {
                      const match = folders.find(
                        (f) =>
                          (treeSelection.folderId && f.id === treeSelection.folderId) ||
                          f.name.toLowerCase() === treeSelection.folderName.toLowerCase(),
                      );
                      if (match && getFolderLevel(match) < 3) {
                        openCreateFolderModal(match.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Subfolder
                  </button>
                )}
                {treeSelection.type !== "all" && (
                  <button
                    type="button"
                    onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  >
                    Show All Documents
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* =================== GOOGLE DRIVE STYLE GRID CARDS =================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                const isExpiring =
                  doc.expiryDate &&
                  (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30 &&
                  (new Date(doc.expiryDate).getTime() - Date.now()) >= 0;
                const isExpired =
                  doc.expiryDate && (new Date(doc.expiryDate).getTime() - Date.now()) < 0;

                const thumbnailSrc = driveId && isImage
                  ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
                  : (isImage && doc.fileUrl && !driveId ? doc.fileUrl : null);

                return (
                  <div
                    key={doc.id}
                    className="group relative flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-lg hover:border-indigo-300 transition-all duration-200 overflow-hidden"
                  >
                    {/* Card Thumbnail / Preview Header */}
                    <div
                      onClick={() => setPreviewDoc(doc)}
                      className="relative h-36 w-full cursor-pointer bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden"
                    >
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={doc.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1.5 shadow-xs group-hover:scale-110 transition-transform">
                            <FileText className="h-6 w-6" />
                          </div>
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            {doc.fileType === "gdrive" ? "Document" : `${doc.fileType || "PDF"} Document`}
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="rounded-lg bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-2xs border border-slate-200/80">
                          {doc.category}
                        </span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(doc);
                        }}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/95 backdrop-blur-xs hover:bg-white shadow-2xs transition cursor-pointer ${
                          doc.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-400 hover:text-amber-500"
                        }`}
                        title="Star Favorite"
                      >
                        <Star className={`h-3.5 w-3.5 ${doc.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                      </button>

                      {/* Hover Action Ribbon (Quick View / Open) */}
                      <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDoc(doc);
                          }}
                          className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-md hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View File</span>
                        </button>
                        {(doc.fileUrl || doc.driveFileId) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocumentFile(doc);
                            }}
                            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
                            title="Open in Google Drive / New Tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-col flex-1 p-3.5 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => setPreviewDoc(doc)}
                            className="font-bold text-xs text-slate-900 hover:text-indigo-600 transition truncate cursor-pointer flex-1"
                            title={doc.name}
                          >
                            {doc.name}
                          </h4>
                        </div>

                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 truncate">
                            <Folder className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {doc.folderName || "General"}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 truncate text-slate-600">
                            <Users className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {doc.familyMemberName || "Personal / Self"}
                          </span>
                        </div>

                        {doc.documentNumber && (
                          <div className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                            #{doc.documentNumber}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom status & actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          {doc.expiryDate ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isExpired
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isExpiring
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              {isExpired ? "Expired" : isExpiring ? `Exp in ${Math.round((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24))}d` : doc.expiryDate}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Expiry</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {doc.fileUrl || doc.driveFileId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 transition cursor-pointer"
                                title="View Document File"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadDocumentFile(doc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                title="Download Document to Computer"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => promptDeleteDocument(doc, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =================== LIST VIEW (CLASSIC TABLE) =================== */
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Folder</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Owner / Member</th>
                    <th className="py-2.5 px-3">ID / Number</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {filteredDocuments.map((doc) => {
                    const isExpiring =
                      doc.expiryDate &&
                      (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => toggleFavorite(doc)}
                            className={`text-slate-300 hover:text-amber-500 cursor-pointer ${
                              doc.isFavorite ? "text-amber-500" : ""
                            }`}
                          >
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span
                              onClick={() => setPreviewDoc(doc)}
                              className="font-semibold cursor-pointer hover:text-indigo-600 transition"
                              title="Click to view file & details"
                            >
                              {doc.name}
                            </span>
                            {(doc.fileUrl || doc.driveFileId) && (
                              <span
                                onClick={() => setPreviewDoc(doc)}
                                className="cursor-pointer text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 font-medium px-1.5 py-0.5 rounded transition"
                                title="Click to view file"
                              >
                                View
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            <Folder className="h-2.5 w-2.5 text-slate-400" />
                            {doc.folderName || "General"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="rounded bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 text-[10px] font-medium">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {doc.familyMemberName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
                              <Users className="h-3 w-3 text-slate-400" />
                              {doc.familyMemberName}
                            </span>
                          ) : (
                            <span className="text-slate-500">Personal / Self</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {doc.documentNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {doc.expiryDate ? (
                            <span
                              className={
                                isExpiring
                                  ? "font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                                  : "text-slate-600"
                              }
                            >
                              {doc.expiryDate}
                            </span>
                          ) : (
                            <span className="text-slate-400">No Expiry</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {doc.fileUrl || doc.driveFileId ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200/80 transition cursor-pointer shadow-2xs"
                                  title="View Document File & Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View File</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadDocumentFile(doc)}
                                  className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1 rounded-md transition cursor-pointer"
                                  title="Download Document to Computer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDocumentFile(doc)}
                                  className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 p-1 rounded-md transition cursor-pointer"
                                  title={
                                    doc.storageProvider === "google_drive" ||
                                    doc.driveFileId ||
                                    doc.fileUrl?.includes("drive.google.com")
                                      ? "Open in Google Drive"
                                      : "Open in New Tab"
                                  }
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                                  title="Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Details</span>
                                </button>
                                <span className="text-[10px] text-slate-300">No file</span>
                              </>
                            )}
                            <button
                              onClick={(e) => promptDeleteDocument(doc, e)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 1. Create Folder Modal */}
      {isFolderOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => {
            setIsFolderOpen(false);
            setFolderModalParentId(undefined);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Create Folder
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-FOLDER</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  {folderModalParentId ? "Create Subfolder" : "Create New Folder"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFolderOpen(false);
                  setFolderModalParentId(undefined);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
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
                  placeholder="e.g. Passports, Vehicle Invoices, Property Deeds"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Parent Folder (Nesting Location)
                </label>
                <FormControl size="small" fullWidth>
                  <Select
                    name="parentId"
                    key={folderModalParentId || "root-folder"}
                    defaultValue={folderModalParentId || ""}
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
                    <MenuItem value="" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                      📂 Top Level / Root Folder (Level 1)
                    </MenuItem>
                    {getHierarchyFolderOptions()
                      .filter((item) => item.level < 3 && item.folder.id !== "general_default")
                      .map((item) => (
                        <MenuItem
                          key={item.folder.id || item.folder.name}
                          value={item.folder.id}
                          sx={{
                            fontSize: "0.75rem",
                            pl: item.level === 2 ? 3 : 1.5,
                            fontWeight: item.level === 1 ? 600 : 400,
                          }}
                        >
                          {item.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select a parent to nest up to 3 levels deep (Root → Subfolder → Sub-subfolder).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Associated Family Member (Optional)
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
                    <MenuItem value="" sx={{ fontSize: "0.75rem" }}>General / Shared / Self</MenuItem>
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
                  Folder Color
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { id: "indigo", bg: "bg-indigo-500" },
                    { id: "emerald", bg: "bg-emerald-500" },
                    { id: "amber", bg: "bg-amber-500" },
                    { id: "rose", bg: "bg-rose-500" },
                    { id: "purple", bg: "bg-purple-500" },
                    { id: "sky", bg: "bg-sky-500" },
                    { id: "slate", bg: "bg-slate-600" },
                  ].map((c) => (
                    <label
                      key={c.id}
                      className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-400 has-checked:border-slate-900 has-checked:bg-slate-50 transition"
                    >
                      <input
                        type="radio"
                        name="color"
                        value={c.id}
                        defaultChecked={c.id === "indigo"}
                        className="sr-only"
                      />
                      <span className={`h-4 w-4 rounded-full ${c.bg}`} />
                      <span className="text-[10px] mt-1 text-slate-500 capitalize">{c.id}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFolderOpen(false);
                    setFolderModalParentId(undefined);
                  }}
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

      {/* 2. Upload Document Modal */}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Upload Document
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-DOC</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">Upload New Document</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. National ID, Passport, BSc Certificate, Land Mutation"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Folder / Shelf
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="folderName"
                      key={treeSelection.type === "folder" ? treeSelection.folderName : "default-folder"}
                      defaultValue={
                        treeSelection.type === "folder"
                          ? treeSelection.folderName
                          : !deletedFolderNames.includes("general")
                          ? "General"
                          : ""
                      }
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
                        Unfiled / No Folder
                      </MenuItem>
                      {getHierarchyFolderOptions().map((item) => (
                        <MenuItem
                          key={item.folder.id || item.folder.name}
                          value={item.folder.name}
                          sx={{
                            fontSize: "0.75rem",
                            pl: item.level === 1 ? 1.5 : item.level === 2 ? 3 : 4.5,
                            fontWeight: item.level === 1 ? 600 : 400,
                          }}
                        >
                          {item.label}
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
                      defaultValue={
                        treeSelection.type === "member_category" || treeSelection.type === "category"
                          ? treeSelection.category
                          : categories[0]
                      }
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
                    Family Member
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      name="familyMemberId"
                      defaultValue={
                        treeSelection.type === "member" && treeSelection.id !== "personal"
                          ? treeSelection.id
                          : treeSelection.type === "member_category" && treeSelection.memberId !== "personal"
                          ? treeSelection.memberId
                          : ""
                      }
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
                    Issuing Authority
                  </label>
                  <input
                    name="issuingAuthority"
                    placeholder="e.g. Election Commission, BRTA"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

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
                    Expiry Date
                  </label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Item-Wise Automated WhatsApp Reminder */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                    <input
                      name="requiresRenewal"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Automated WhatsApp Expiry Reminder</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="text-[11px] font-medium text-slate-700">Remind Lead Time:</span>
                  <select
                    name="reminderLeadDays"
                    defaultValue={15}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value={3}>3 days before expiry (Urgent)</option>
                    <option value={7}>7 days before expiry (Standard)</option>
                    <option value={15}>15 days before expiry (Recommended)</option>
                    <option value={30}>30 days before expiry (Early warning)</option>
                    <option value={60}>60 days before expiry</option>
                  </select>
                </div>

                <ItemRecipientSelector
                  selectedRecipients={docReminderRecipients}
                  onChange={setDocReminderRecipients}
                  label="Send Expiry Reminder To:"
                  helperText="Choose which recipient alias(es) will be alerted when this document approaches expiry."
                />
              </div>

              {/* File Attachment */}
              <div className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Upload Document File (PDF / Image)
                  </label>
                  <input
                    name="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    className="w-full rounded-xl border border-dashed border-slate-300 bg-white p-2.5 text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Supported formats: PDF, PNG, JPG, JPEG, DOCX.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Or Paste Document Link (Optional)
                  </label>
                  <input
                    name="driveLink"
                    placeholder="https://... (direct file or document URL)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

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

      {/* 3. Delete Folder Confirmation Modal */}
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
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200">
                    DELETE FOLDER
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-VAULT</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  Delete Folder "{folderToDelete.name}"?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the folder <strong>"{folderToDelete.name}"</strong>?
              </p>

              {/* Cloud Sync Status Banner */}
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                <Cloud className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Google Drive sync: Folder will be permanently removed from cloud storage.</span>
              </div>

              {/* Toggle for documents inside this folder */}
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
                          ? "Files will be removed from your Vault and permanently deleted from Google Drive."
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

      {/* 4. Document Preview & Details Modal */}
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
            {/* Header */}
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
                    {(previewDoc.driveFileId || previewDoc.fileUrl?.includes("drive.google.com") || previewDoc.storageProvider === "google_drive") && (
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
                aria-label="Close"
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
                      previewDoc.name?.toLowerCase().endsWith(`.${ext}`)
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
                    Folder & Location
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-indigo-600" />
                    {previewDoc.folderName || "General"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Owner / Family Member
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    {previewDoc.familyMemberName || "Personal / Self"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Document / ID Number
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

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                onClick={() => {
                  const doc = previewDoc;
                  promptDeleteDocument(doc);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Document</span>
              </button>

              <div className="flex items-center gap-2">
                {(previewDoc.fileUrl || previewDoc.driveFileId) && (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadDocumentFile(previewDoc)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                      title="Download to Computer"
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

      {/* 5. Delete Document Confirmation Modal (Custom popup, no browser echo) */}
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
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200">
                    DELETE DOCUMENT
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-VAULT</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  Delete "{docToDelete.name}"?
                </h2>
              </div>
              <button
                type="button"
                disabled={isDeletingDoc}
                onClick={() => setDocToDelete(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                aria-label="Close"
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
                  ? " This will also permanently remove the file from your Master Google Drive."
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
