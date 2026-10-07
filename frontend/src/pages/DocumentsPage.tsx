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
  | { type: "folder"; folderName: string; label: string }
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
  const [saving, setSaving] = useState(false);
  const [folderSaving, setFolderSaving] = useState(false);
  const [error, setError] = useState("");

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
    e.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const file = form.get("file") as File | null;
      let fileUrl = "";
      let fileType = "pdf";

      if (file && file.size > 0) {
        fileType = file.name.split(".").pop() || "pdf";
        const reader = new FileReader();
        fileUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const assignedFolder = String(form.get("folderName") || "General").trim();

      const newDoc = await createDocument({
        name: String(form.get("name")),
        category: String(form.get("category")) as DocumentCategory,
        documentNumber: String(form.get("documentNumber") || ""),
        issuingAuthority: String(form.get("issuingAuthority") || ""),
        issueDate: String(form.get("issueDate") || ""),
        expiryDate: String(form.get("expiryDate") || ""),
        familyMemberId: String(form.get("familyMemberId") || "") || undefined,
        folderName: assignedFolder || "General",
        fileUrl: fileUrl || undefined,
        fileType,
        storageProvider: "supabase",
        isFavorite: false,
        requiresRenewal: Boolean(form.get("requiresRenewal")),
        tags: String(form.get("tags") || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: String(form.get("notes") || ""),
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

      setIsAddOpen(false);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFolderSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("folderName") || "").trim();
    const familyMemberId = String(form.get("familyMemberId") || "") || undefined;
    const color = String(form.get("color") || "indigo");

    if (!name) {
      setFolderSaving(false);
      return;
    }

    try {
      const created = await createDocumentFolder({
        name,
        familyMemberId,
        color,
      });
      if (familyMemberId) {
        const mem = familyMembers.find((m) => m.id === familyMemberId);
        created.familyMemberName = mem?.fullName;
      }
      setFolders((prev) => [...prev, created]);
      setTreeSelection({ type: "folder", folderName: created.name, label: created.name });
      setIsFolderOpen(false);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setFolderSaving(false);
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}"? Documents inside will be kept under General.`)) return;
    try {
      await deleteDocumentFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      if (treeSelection.type === "folder" && treeSelection.folderName === folder.name) {
        setTreeSelection({ type: "all", label: "All Vault Documents" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
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
        return doc.familyMemberId === treeSelection.id;
      case "member_category":
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
    <div className="space-y-4 max-w-7xl">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFolderOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-600" />
            <span>New Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
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
              onClick={() => setIsFolderOpen(true)}
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
                          <span className="truncate">Dewan (Self)</span>
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
                                    label: `Dewan > ${cat}`,
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
                {/* General folder */}
                {(() => {
                  const generalCount = documents.filter(
                    (d) => (d.folderName || "General").toLowerCase() === "general",
                  ).length;
                  const isGeneralSelected =
                    treeSelection.type === "folder" && treeSelection.folderName === "General";

                  return (
                    <button
                      type="button"
                      onClick={() =>
                        setTreeSelection({
                          type: "folder",
                          folderName: "General",
                          label: "Folder: General",
                        })
                      }
                      className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer ${
                        isGeneralSelected
                          ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80"
                          : "text-slate-700 hover:bg-slate-100/80 font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Folder className="h-3.5 w-3.5 text-slate-400" />
                        <span>General</span>
                      </span>
                      <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-500">
                        {generalCount}
                      </span>
                    </button>
                  );
                })()}

                {/* User-created folders */}
                {folders.map((folder) => {
                  const count = documents.filter(
                    (d) => (d.folderName || "").toLowerCase() === folder.name.toLowerCase(),
                  ).length;
                  const isFolderSelected =
                    treeSelection.type === "folder" && treeSelection.folderName === folder.name;

                  return (
                    <div
                      key={folder.id}
                      onClick={() =>
                        setTreeSelection({
                          type: "folder",
                          folderName: folder.name,
                          label: `Folder: ${folder.name}`,
                        })
                      }
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer ${
                        isFolderSelected
                          ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80"
                          : "text-slate-700 hover:bg-slate-100/80 font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Folder className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.2 text-slate-500">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFolder(folder, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                          title="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsFolderOpen(true)}
                  className="w-full mt-1.5 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-800 transition cursor-pointer"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-400 font-medium">Vault Hierarchy</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-indigo-600" />
                {treeSelection.label}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"}
              </span>
            </div>

            {treeSelection.type !== "all" && (
              <button
                type="button"
                onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                Reset Tree View
              </button>
            )}
          </div>

          {/* Search Bar & Secondary Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
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

            <FormControl size="small" sx={{ minWidth: 150 }} className="w-full sm:w-auto">
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

          {/* Document Table / Content */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No documents in this view
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {treeSelection.type !== "all"
                    ? `No records found under "${treeSelection.label}". Upload one directly to this folder.`
                    : "Securely store NID cards, passports, birth certificates, and transcripts."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Upload Document
                  </button>
                  {treeSelection.type !== "all" && (
                    <button
                      onClick={() => setTreeSelection({ type: "all", label: "All Vault Documents" })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      Show All Documents
                    </button>
                  )}
                </div>
              </div>
            ) : (
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
                            <span className="font-semibold">{doc.name}</span>
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
                          <div className="flex items-center justify-end gap-2">
                            {doc.fileUrl ? (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-600 hover:text-slate-900 p-1"
                                title="View / Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-300">No file</span>
                            )}
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer"
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
            )}
          </div>
        </div>
      </div>

      {/* 1. Create Folder Modal */}
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
              <div>
                <h2 className="text-base font-bold text-slate-900">Create New Folder</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organize documents for yourself, a family member, or a specific purpose.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
                  placeholder="e.g. Dewan Passports, Wife University Records, Property Deeds"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
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
                <h2 className="text-base font-bold text-slate-900">Upload New Document</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save PDF, image, or document with expiration tracking and folder assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
                      defaultValue={
                        treeSelection.type === "folder" ? treeSelection.folderName : "General"
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
                      <MenuItem value="General" sx={{ fontSize: "0.75rem" }}>
                        📁 General
                      </MenuItem>
                      {folders.map((f) => (
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
                        Personal / Self (Dewan)
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  File Attachment (PDF / Image)
                </label>
                <input
                  name="file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                  className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
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
                  disabled={saving}
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
