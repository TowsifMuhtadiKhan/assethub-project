import { useEffect, useState, useMemo } from "react";
import {
  Car,
  Building2,
  Users,
  Search,
  Check,
  X,
  Fuel,
  Wrench,
  DollarSign,
  Share2,
  Copy,
  AlertCircle,
  KeyRound,
  Info,
  Plus,
  FolderLock,
  CheckSquare,
  ShieldCheck,
  Wallet,
  Eye,
  Edit2,
  Trash2,
  Folder,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
} from "lucide-react";
import {
  listFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  getDefaultMemberAccess,
  getCurrentUserAccess,
} from "../services/familyService";
import { listVehicles } from "../services/vehicleService";
import { listProperties } from "../services/propertyService";
import { listDocumentFolders } from "../services/documentService";
import { UiPageHeader } from "../components/design-system";
import type {
  FamilyMember,
  FamilyMemberAccess,
  RelationshipType,
  Vehicle,
  Property,
  DocumentFolder,
} from "../types";

const RELATIONSHIPS: RelationshipType[] = [
  "Sibling",
  "Spouse",
  "Child",
  "Parent",
  "Self",
  "Other",
];

interface AccessControlPageProps {
  embedMode?: boolean;
}

export function AccessControlPage({ embedMode = false }: AccessControlPageProps = {}) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tabs matching App Sidebar Structure: Dashboard -> Daily Life (Tasks, Expenses) -> Important Papers (Vault) -> Vehicles & Houses (Vehicles, Properties, Warranties) -> Master Matrix
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "tasks"
    | "expenses"
    | "vault"
    | "vehicles"
    | "properties"
    | "warranties"
    | "matrix"
  >("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Member Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRelationship, setAddRelationship] = useState<RelationshipType>("Sibling");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<FamilyMemberAccess["loginRole"]>("Vehicle_Manager");
  const [isAdding, setIsAdding] = useState(false);

  // Document Vault folders and selection state
  const [vaultFolders, setVaultFolders] = useState<DocumentFolder[]>([]);
  const [openFolderPickerMemberId, setOpenFolderPickerMemberId] = useState<string | null>(null);

  // Warranties categories and selection state
  const [openWarrantyPickerMemberId, setOpenWarrantyPickerMemberId] = useState<string | null>(null);
  const DEFAULT_WARRANTY_CATEGORIES = useMemo(
    () => [
      "Electronics & Gadgets",
      "Home Appliances",
      "Vehicles & Batteries",
      "Furniture & Fixtures",
      "Mobile & Computers",
      "Tools & Hardware",
    ],
    []
  );

  // Vehicles fleet selection state
  const [openVehiclePickerMemberId, setOpenVehiclePickerMemberId] = useState<string | null>(null);
  const [vehicleViewMode, setVehicleViewMode] = useState<"members" | "vehicles">("members");

  // Properties selection state
  const [openPropertyPickerMemberId, setOpenPropertyPickerMemberId] = useState<string | null>(null);
  const [propertyViewMode, setPropertyViewMode] = useState<"members" | "properties">("members");

  // Invite modal states
  const [inviteMember, setInviteMember] = useState<FamilyMember | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const DEFAULT_VAULT_CATEGORIES = useMemo(
    () => [
      "Identity",
      "Academic",
      "Employment",
      "Tax/Financial",
      "Health",
      "Legal",
      "Travel",
      "Vehicle",
      "Property",
      "General",
    ],
    []
  );

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [userAcc, mems, vehs, props, flds] = await Promise.all([
        getCurrentUserAccess(),
        listFamilyMembers(),
        listVehicles().catch(() => []),
        listProperties().catch(() => []),
        listDocumentFolders().catch(() => []),
      ]);
      if (!userAcc.isHead && userAcc.access.loginRole !== "Admin") {
        setIsLocked(true);
      }
      setMembers(mems);
      setVehicles(vehs);
      setProperties(props);
      setVaultFolders(flds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access control data.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const allAvailableFolders = useMemo(() => {
    const customNames = vaultFolders.map((f) => f.name.trim()).filter(Boolean);
    const set = new Set([...DEFAULT_VAULT_CATEGORIES, ...customNames]);
    return Array.from(set);
  }, [vaultFolders, DEFAULT_VAULT_CATEGORIES]);

  // Change vault folder scope ('all' vs 'specific')
  const setFolderScope = async (member: FamilyMember, scope: "all" | "specific") => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVaultFolderScope: scope,
      assignedVaultFolders:
        scope === "all"
          ? []
          : currentAcc.assignedVaultFolders && currentAcc.assignedVaultFolders.length > 0
          ? currentAcc.assignedVaultFolders
          : [DEFAULT_VAULT_CATEGORIES[0]],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated folder scope for ${member.fullName}`);
    } catch {
      showToast("Failed to save folder scope");
    } finally {
      setSavingId(null);
    }
  };

  // Toggle single folder access for member
  const toggleFolderAccess = async (member: FamilyMember, folderName: string) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let currentAssigned = currentAcc.assignedVaultFolders || [];
    if (currentAcc.assignedVaultFolderScope !== "specific") {
      currentAssigned = [...allAvailableFolders];
    }

    let newAssigned: string[];
    if (currentAssigned.some((f) => f.toLowerCase() === folderName.toLowerCase())) {
      newAssigned = currentAssigned.filter((f) => f.toLowerCase() !== folderName.toLowerCase());
    } else {
      newAssigned = [...currentAssigned, folderName];
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVaultFolderScope: "specific",
      assignedVaultFolders: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
    } catch {
      showToast("Failed to update folder access");
    } finally {
      setSavingId(null);
    }
  };

  // Select all or clear all folders for member
  const selectAllFoldersForMember = async (member: FamilyMember, selectAll: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVaultFolderScope: "specific",
      assignedVaultFolders: selectAll ? [...allAvailableFolders] : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(
        selectAll
          ? `All folders granted for ${member.fullName}`
          : `All folders cleared for ${member.fullName}`
      );
    } catch {
      showToast("Failed to update folders");
    } finally {
      setSavingId(null);
    }
  };

  // Toggle CRUD permission
  const toggleMemberCrud = async (member: FamilyMember, action: "C" | "R" | "U" | "D") => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = { ...currentAcc };

    if (action === "C") {
      const nextVal = !(currentAcc.canCreateDocuments ?? currentAcc.canWriteDocuments);
      updatedAccess.canCreateDocuments = nextVal;
      updatedAccess.canWriteDocuments = nextVal;
    } else if (action === "R") {
      const nextVal = !(currentAcc.canReadDocuments ?? true);
      updatedAccess.canReadDocuments = nextVal;
    } else if (action === "U") {
      const nextVal = !(currentAcc.canUpdateDocuments ?? currentAcc.loginRole === "Admin");
      updatedAccess.canUpdateDocuments = nextVal;
    } else if (action === "D") {
      const nextVal = !(currentAcc.canDeleteDocuments ?? currentAcc.loginRole === "Admin");
      updatedAccess.canDeleteDocuments = nextVal;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated document permissions for ${member.fullName}`);
    } catch {
      showToast("Failed to update CRUD permission");
    } finally {
      setSavingId(null);
    }
  };

  // Set CRUD preset
  const setMemberCrudPreset = async (
    member: FamilyMember,
    preset: "full" | "contributor" | "readonly" | "none"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = { ...currentAcc };

    if (preset === "full") {
      updatedAccess.canCreateDocuments = true;
      updatedAccess.canWriteDocuments = true;
      updatedAccess.canReadDocuments = true;
      updatedAccess.canUpdateDocuments = true;
      updatedAccess.canDeleteDocuments = true;
    } else if (preset === "contributor") {
      updatedAccess.canCreateDocuments = true;
      updatedAccess.canWriteDocuments = true;
      updatedAccess.canReadDocuments = true;
      updatedAccess.canUpdateDocuments = false;
      updatedAccess.canDeleteDocuments = false;
    } else if (preset === "readonly") {
      updatedAccess.canCreateDocuments = false;
      updatedAccess.canWriteDocuments = false;
      updatedAccess.canReadDocuments = true;
      updatedAccess.canUpdateDocuments = false;
      updatedAccess.canDeleteDocuments = false;
    } else if (preset === "none") {
      updatedAccess.canCreateDocuments = false;
      updatedAccess.canWriteDocuments = false;
      updatedAccess.canReadDocuments = false;
      updatedAccess.canUpdateDocuments = false;
      updatedAccess.canDeleteDocuments = false;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Applied ${preset} preset for ${member.fullName}`);
    } catch {
      showToast("Failed to apply preset");
    } finally {
      setSavingId(null);
    }
  };

  // Warranties scope & CRUD
  const setWarrantyScope = async (member: FamilyMember, scope: "all" | "specific") => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedWarrantyScope: scope,
      assignedWarrantyCategories:
        scope === "all"
          ? []
          : currentAcc.assignedWarrantyCategories && currentAcc.assignedWarrantyCategories.length > 0
          ? currentAcc.assignedWarrantyCategories
          : [DEFAULT_WARRANTY_CATEGORIES[0]],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated warranty scope for ${member.fullName}`);
    } catch {
      showToast("Failed to save warranty scope");
    } finally {
      setSavingId(null);
    }
  };

  const toggleWarrantyCategoryAccess = async (member: FamilyMember, catName: string) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let currentAssigned = currentAcc.assignedWarrantyCategories || [];
    if (currentAcc.assignedWarrantyScope !== "specific") {
      currentAssigned = [...DEFAULT_WARRANTY_CATEGORIES];
    }

    let newAssigned: string[];
    if (currentAssigned.includes(catName)) {
      newAssigned = currentAssigned.filter((c) => c !== catName);
    } else {
      newAssigned = [...currentAssigned, catName];
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedWarrantyScope: "specific",
      assignedWarrantyCategories: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
    } catch {
      showToast("Failed to update category access");
    } finally {
      setSavingId(null);
    }
  };

  const selectAllWarrantyCategories = async (member: FamilyMember, selectAll: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedWarrantyScope: "specific",
      assignedWarrantyCategories: selectAll ? [...DEFAULT_WARRANTY_CATEGORIES] : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(selectAll ? `All warranty categories granted` : `All warranty categories cleared`);
    } catch {
      showToast("Failed to update categories");
    } finally {
      setSavingId(null);
    }
  };

  // Generic Domain CRUD Toggle
  const toggleDomainCrud = async (
    member: FamilyMember,
    domain: "warranties" | "tasks" | "expenses" | "vehicles" | "properties",
    action: "C" | "R" | "U" | "D"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = { ...currentAcc };

    if (domain === "warranties") {
      if (action === "C") updatedAccess.canCreateWarranties = !(currentAcc.canCreateWarranties ?? currentAcc.loginRole === "Admin");
      else if (action === "R") updatedAccess.canReadWarranties = !(currentAcc.canReadWarranties ?? true);
      else if (action === "U") updatedAccess.canUpdateWarranties = !(currentAcc.canUpdateWarranties ?? currentAcc.loginRole === "Admin");
      else if (action === "D") updatedAccess.canDeleteWarranties = !(currentAcc.canDeleteWarranties ?? currentAcc.loginRole === "Admin");
    } else if (domain === "tasks") {
      if (action === "C") updatedAccess.canCreateTasks = !(currentAcc.canCreateTasks ?? true);
      else if (action === "R") updatedAccess.canReadTasks = !(currentAcc.canReadTasks ?? true);
      else if (action === "U") updatedAccess.canUpdateTasks = !(currentAcc.canUpdateTasks ?? true);
      else if (action === "D") updatedAccess.canDeleteTasks = !(currentAcc.canDeleteTasks ?? currentAcc.loginRole === "Admin");
    } else if (domain === "expenses") {
      if (action === "C") updatedAccess.canCreateExpenses = !(currentAcc.canCreateExpenses ?? true);
      else if (action === "R") updatedAccess.canReadExpenses = !(currentAcc.canReadExpenses ?? true);
      else if (action === "U") updatedAccess.canUpdateExpenses = !(currentAcc.canUpdateExpenses ?? true);
      else if (action === "D") updatedAccess.canDeleteExpenses = !(currentAcc.canDeleteExpenses ?? currentAcc.loginRole === "Admin");
    } else if (domain === "vehicles") {
      if (action === "C") {
        const next = !currentAcc.canWriteFuel;
        updatedAccess.canWriteFuel = next;
        updatedAccess.canCreateVehicles = next;
      } else if (action === "R") {
        updatedAccess.canReadVehicles = !(currentAcc.canReadVehicles ?? true);
      } else if (action === "U") {
        const next = !currentAcc.canWriteMaintenance;
        updatedAccess.canWriteMaintenance = next;
        updatedAccess.canUpdateVehicles = next;
      } else if (action === "D") {
        updatedAccess.canDeleteVehicles = !(currentAcc.canDeleteVehicles ?? currentAcc.loginRole === "Admin");
      }
    } else if (domain === "properties") {
      if (action === "C") {
        const next = !currentAcc.canWriteRent;
        updatedAccess.canWriteRent = next;
        updatedAccess.canCreateProperties = next;
      } else if (action === "R") {
        updatedAccess.canReadProperties = !(currentAcc.canReadProperties ?? true);
      } else if (action === "U") {
        const next = !currentAcc.canWritePropertyMaintenance;
        updatedAccess.canWritePropertyMaintenance = next;
        updatedAccess.canUpdateProperties = next;
      } else if (action === "D") {
        updatedAccess.canDeleteProperties = !(currentAcc.canDeleteProperties ?? currentAcc.loginRole === "Admin");
      }
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated ${domain} permissions for ${member.fullName}`);
    } catch {
      showToast("Failed to update CRUD permission");
    } finally {
      setSavingId(null);
    }
  };

  // Generic Domain Preset Setter
  const setDomainPreset = async (
    member: FamilyMember,
    domain: "warranties" | "tasks" | "expenses" | "vehicles" | "properties",
    preset: "full" | "contributor" | "readonly"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = { ...currentAcc };
    const isFull = preset === "full";
    const isContributor = preset === "contributor";

    if (domain === "warranties") {
      updatedAccess.canCreateWarranties = isFull || isContributor;
      updatedAccess.canReadWarranties = true;
      updatedAccess.canUpdateWarranties = isFull;
      updatedAccess.canDeleteWarranties = isFull;
    } else if (domain === "tasks") {
      updatedAccess.canCreateTasks = isFull || isContributor;
      updatedAccess.canReadTasks = true;
      updatedAccess.canUpdateTasks = isFull || isContributor;
      updatedAccess.canDeleteTasks = isFull;
    } else if (domain === "expenses") {
      updatedAccess.canCreateExpenses = isFull || isContributor;
      updatedAccess.canReadExpenses = true;
      updatedAccess.canUpdateExpenses = isFull || isContributor;
      updatedAccess.canDeleteExpenses = isFull;
    } else if (domain === "vehicles") {
      updatedAccess.canWriteFuel = isFull || isContributor;
      updatedAccess.canCreateVehicles = isFull;
      updatedAccess.canReadVehicles = true;
      updatedAccess.canWriteMaintenance = isFull || isContributor;
      updatedAccess.canUpdateVehicles = isFull;
      updatedAccess.canDeleteVehicles = isFull;
    } else if (domain === "properties") {
      updatedAccess.canWriteRent = isFull || isContributor;
      updatedAccess.canCreateProperties = isFull;
      updatedAccess.canReadProperties = true;
      updatedAccess.canWritePropertyMaintenance = isFull || isContributor;
      updatedAccess.canUpdateProperties = isFull;
      updatedAccess.canDeleteProperties = isFull;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Applied ${preset} preset for ${member.fullName}`);
    } catch {
      showToast("Failed to apply preset");
    } finally {
      setSavingId(null);
    }
  };

  // Scope toggles for Tasks, Expenses, Vehicles, Properties
  const setMemberSimpleScope = async (
    member: FamilyMember,
    field: "assignedTaskScope" | "assignedExpenseScope" | "assignedVehicleScope" | "assignedPropertyScope",
    val: "all" | "specific"
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      [field]: val,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated scope for ${member.fullName}`);
    } catch {
      showToast("Failed to update scope");
    } finally {
      setSavingId(null);
    }
  };

  // Helper to test if a member has access to a specific vehicle
  const memberHasVehicleAccess = (member: FamilyMember, vehicleId: string) => {
    const acc = member.access;
    if (!acc || !acc.canAccessVehicles) return false;
    if (!acc.assignedVehicleIds || acc.assignedVehicleIds.length === 0) return true;
    return acc.assignedVehicleIds.includes(vehicleId);
  };

  // Helper to test if a member has access to a specific property
  const memberHasPropertyAccess = (member: FamilyMember, propertyId: string) => {
    const acc = member.access;
    if (!acc || !acc.canAccessProperties) return false;
    if (!acc.assignedPropertyIds || acc.assignedPropertyIds.length === 0) return true;
    return acc.assignedPropertyIds.includes(propertyId);
  };

  // Vehicle Scope & Item Handlers
  const setVehicleScope = async (member: FamilyMember, scope: "all" | "specific") => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allVehicleIds = vehicles.map((v) => v.id);
    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVehicleScope: scope,
      assignedVehicleIds:
        scope === "specific"
          ? currentAcc.assignedVehicleIds && currentAcc.assignedVehicleIds.length > 0
            ? currentAcc.assignedVehicleIds
            : allVehicleIds
          : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated vehicle scope for ${member.fullName}`);
    } catch {
      showToast("Failed to save vehicle scope");
    } finally {
      setSavingId(null);
    }
  };

  const toggleVehicleItemAccess = async (member: FamilyMember, vehicleId: string) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allVehicleIds = vehicles.map((v) => v.id);
    let currentAssigned = currentAcc.assignedVehicleIds || [];
    if (currentAcc.assignedVehicleScope !== "specific") {
      currentAssigned = [...allVehicleIds];
    }

    let newAssigned: string[];
    if (currentAssigned.includes(vehicleId)) {
      newAssigned = currentAssigned.filter((id) => id !== vehicleId);
    } else {
      newAssigned = [...currentAssigned, vehicleId];
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVehicleScope: "specific",
      assignedVehicleIds: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
    } catch {
      showToast("Failed to update vehicle access");
    } finally {
      setSavingId(null);
    }
  };

  const selectAllVehiclesForMember = async (member: FamilyMember, selectAll: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allVehicleIds = vehicles.map((v) => v.id);
    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVehicleScope: "specific",
      assignedVehicleIds: selectAll ? [...allVehicleIds] : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(selectAll ? "All vehicles granted" : "All vehicles cleared");
    } catch {
      showToast("Failed to update vehicles");
    } finally {
      setSavingId(null);
    }
  };

  // Property Scope & Item Handlers
  const setPropertyScope = async (member: FamilyMember, scope: "all" | "specific") => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allPropertyIds = properties.map((p) => p.id);
    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedPropertyScope: scope,
      assignedPropertyIds:
        scope === "specific"
          ? currentAcc.assignedPropertyIds && currentAcc.assignedPropertyIds.length > 0
            ? currentAcc.assignedPropertyIds
            : allPropertyIds
          : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated property scope for ${member.fullName}`);
    } catch {
      showToast("Failed to save property scope");
    } finally {
      setSavingId(null);
    }
  };

  const togglePropertyItemAccess = async (member: FamilyMember, propertyId: string) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allPropertyIds = properties.map((p) => p.id);
    let currentAssigned = currentAcc.assignedPropertyIds || [];
    if (currentAcc.assignedPropertyScope !== "specific") {
      currentAssigned = [...allPropertyIds];
    }

    let newAssigned: string[];
    if (currentAssigned.includes(propertyId)) {
      newAssigned = currentAssigned.filter((id) => id !== propertyId);
    } else {
      newAssigned = [...currentAssigned, propertyId];
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedPropertyScope: "specific",
      assignedPropertyIds: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
    } catch {
      showToast("Failed to update property access");
    } finally {
      setSavingId(null);
    }
  };

  const selectAllPropertiesForMember = async (member: FamilyMember, selectAll: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const allPropertyIds = properties.map((p) => p.id);
    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedPropertyScope: "specific",
      assignedPropertyIds: selectAll ? [...allPropertyIds] : [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(selectAll ? "All properties granted" : "All properties cleared");
    } catch {
      showToast("Failed to update properties");
    } finally {
      setSavingId(null);
    }
  };

  // Toggle vehicle access for a specific member
  const toggleVehicleAccess = async (member: FamilyMember, vehicleId: string, grant: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let newAssigned: string[];
    const allVehicleIds = vehicles.map((v) => v.id);

    if (grant) {
      if (!currentAcc.canAccessVehicles) {
        currentAcc.canAccessVehicles = true;
      }
      if (!currentAcc.assignedVehicleIds || currentAcc.assignedVehicleIds.length === 0) {
        newAssigned = [];
      } else {
        newAssigned = Array.from(new Set([...currentAcc.assignedVehicleIds, vehicleId]));
        if (newAssigned.length === allVehicleIds.length) {
          newAssigned = [];
        }
      }
    } else {
      if (!currentAcc.assignedVehicleIds || currentAcc.assignedVehicleIds.length === 0) {
        newAssigned = allVehicleIds.filter((id) => id !== vehicleId);
      } else {
        newAssigned = currentAcc.assignedVehicleIds.filter((id) => id !== vehicleId);
      }
      if (newAssigned.length === 0 && allVehicleIds.length > 0) {
        currentAcc.canAccessVehicles = false;
      }
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedVehicleIds: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated vehicle access for ${member.fullName}`);
    } catch {
      showToast(`Failed to save access change`);
    } finally {
      setSavingId(null);
    }
  };

  // Toggle property access for a specific member
  const togglePropertyAccess = async (member: FamilyMember, propertyId: string, grant: boolean) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    let newAssigned: string[];
    const allPropertyIds = properties.map((p) => p.id);

    if (grant) {
      if (!currentAcc.canAccessProperties) {
        currentAcc.canAccessProperties = true;
      }
      if (!currentAcc.assignedPropertyIds || currentAcc.assignedPropertyIds.length === 0) {
        newAssigned = [];
      } else {
        newAssigned = Array.from(new Set([...currentAcc.assignedPropertyIds, propertyId]));
        if (newAssigned.length === allPropertyIds.length) {
          newAssigned = [];
        }
      }
    } else {
      if (!currentAcc.assignedPropertyIds || currentAcc.assignedPropertyIds.length === 0) {
        newAssigned = allPropertyIds.filter((id) => id !== propertyId);
      } else {
        newAssigned = currentAcc.assignedPropertyIds.filter((id) => id !== propertyId);
      }
      if (newAssigned.length === 0 && allPropertyIds.length > 0) {
        currentAcc.canAccessProperties = false;
      }
    }

    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      assignedPropertyIds: newAssigned,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated property access for ${member.fullName}`);
    } catch {
      showToast(`Failed to save access change`);
    } finally {
      setSavingId(null);
    }
  };

  // Generic toggle for any boolean permission flag on a member
  const toggleMemberFlag = async (
    member: FamilyMember,
    field: keyof FamilyMemberAccess
  ) => {
    const currentAcc: FamilyMemberAccess = member.access
      ? { ...member.access }
      : getDefaultMemberAccess();

    const currentVal = Boolean(currentAcc[field]);
    const updatedAccess: FamilyMemberAccess = {
      ...currentAcc,
      [field]: !currentVal,
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Updated permission for ${member.fullName}`);
    } catch {
      showToast(`Failed to update permission`);
    } finally {
      setSavingId(null);
    }
  };

  // Batch vehicle access
  const batchVehicleAccess = async (vehicleId: string, grantToAll: boolean) => {
    for (const member of members) {
      await toggleVehicleAccess(member, vehicleId, grantToAll);
    }
    showToast(grantToAll ? "Granted access to all members" : "Restricted all members");
  };

  // Batch property access
  const batchPropertyAccess = async (propertyId: string, grantToAll: boolean) => {
    for (const member of members) {
      await togglePropertyAccess(member, propertyId, grantToAll);
    }
    showToast(grantToAll ? "Granted access to all members" : "Restricted all members");
  };

  // Role change
  const handleRoleChange = async (
    member: FamilyMember,
    newRole: FamilyMemberAccess["loginRole"]
  ) => {
    const base = getDefaultMemberAccess(newRole);
    const updatedAccess: FamilyMemberAccess = {
      ...base,
      assignedVehicleIds: member.access?.assignedVehicleIds || [],
      assignedPropertyIds: member.access?.assignedPropertyIds || [],
    };

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, access: updatedAccess } : m))
    );
    setSavingId(member.id);

    try {
      await updateFamilyMember(member.id, { access: updatedAccess });
      showToast(`Role updated to ${newRole.replace("_", " ")} for ${member.fullName}`);
    } catch {
      showToast(`Failed to update role`);
    } finally {
      setSavingId(null);
    }
  };

  // Add Member submit
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;
    setIsAdding(true);
    try {
      const defaultAccess = getDefaultMemberAccess(addRole);
      const created = await createFamilyMember({
        fullName: addName.trim(),
        relationship: addRelationship,
        phone: addPhone.trim(),
        email: addEmail.trim(),
        nationality: "Bangladeshi",
        access: defaultAccess,
      });

      setMembers((prev) => [...prev, created]);
      showToast(`Added ${created.fullName}! Now configure their permissions.`);
      setIsAddMemberOpen(false);
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      setAddRole("Vehicle_Manager");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setIsAdding(false);
    }
  };

  // Invite text generator
  const getInviteText = (m: FamilyMember) => {
    const roleName = (m.access?.loginRole || "Vehicle_Manager").replace("_", " ");
    const origin =
      typeof window !== "undefined" &&
      !window.location.origin.includes("localhost") &&
      !window.location.origin.includes("capacitor")
        ? window.location.origin
        : "https://likherakho.vercel.app";
    return `Hi ${m.fullName},\n\nYou have been invited to join our family workspace on Likhe Rakho (${roleName})!\n\n🔑 How to sign in:\n1. Open Likhe Rakho: ${origin}\n2. Click "Sign Up" (Create Free Account).\n3. Enter your email: ${m.email}\n4. Set your own password.\n5. You will automatically have access to all assigned vehicles, properties, and family records!\n\nNeed help? Let me know!`;
  };

  const handleCopyInvite = (m: FamilyMember) => {
    navigator.clipboard.writeText(getInviteText(m));
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const shareInviteWhatsApp = (m: FamilyMember) => {
    const cleanPhone = (m.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `88${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(getInviteText(m));
    const url = cleanPhone
      ? `https://wa.me/${formattedPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  // Filtered lists
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.registrationNumber.toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }, [properties, searchQuery]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        m.relationship.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  if (isLocked) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-2xs space-y-3 mt-6">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <KeyRound className="h-7 w-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Access Control Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Only the Family Head and Administrators can view or configure family permissions and access limits.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header (Design System Sticky Pattern B) */}
      {!embedMode && (
        <UiPageHeader
          title="Access Control & Permissions"
          helpTooltip="Control member access to vehicles, properties, document vault, warranties, and daily schedule."
          subtitle="Control access to vehicles, properties, document vault, warranties, and daily schedule."
          sticky={true}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Members</div>
                  <div className="text-sm font-extrabold text-slate-900">{members.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Vehicles</div>
                  <div className="text-sm font-extrabold text-orange-600">{vehicles.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Properties</div>
                  <div className="text-sm font-extrabold text-emerald-600">{properties.length}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Family Member</span>
              </button>
            </div>
          }
        />
      )}

      {/* Main Content Area with Page Padding */}
      <div className="p-3.5 sm:p-5 lg:p-6 space-y-6">

      {/* Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Module Navigation Tabs mirroring App Sidebar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white text-orange-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-orange-500" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-slate-300/80 mx-0.5 hidden sm:block" />

          {/* 2. Daily Life */}
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "tasks"
                ? "bg-white text-amber-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
            <span>To-Do List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "expenses"
                ? "bg-white text-rose-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wallet className="h-3.5 w-3.5 text-rose-500" />
            <span>Daily Expenses</span>
          </button>

          <div className="h-4 w-px bg-slate-300/80 mx-0.5 hidden sm:block" />

          {/* 3. Important Papers */}
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "vault"
                ? "bg-white text-sky-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderLock className="h-3.5 w-3.5 text-sky-500" />
            <span>All Documents (Vault)</span>
          </button>

          <div className="h-4 w-px bg-slate-300/80 mx-0.5 hidden sm:block" />

          {/* 4. Vehicles & Houses */}
          <button
            type="button"
            onClick={() => setActiveTab("vehicles")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "vehicles"
                ? "bg-white text-emerald-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Car className="h-3.5 w-3.5 text-emerald-500" />
            <span>Cars & Bikes ({vehicles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "properties"
                ? "bg-white text-emerald-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Houses & Rent ({properties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("warranties")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "warranties"
                ? "bg-white text-teal-600 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
            <span>Warranties</span>
          </button>

          <div className="h-4 w-px bg-slate-300/80 mx-0.5 hidden sm:block" />

          {/* 5. Master Matrix */}
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "matrix"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-slate-700" />
            <span>All-In-One Matrix</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member, vehicle or property..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-500 border border-slate-200 rounded-2xl bg-white shadow-2xs">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mb-2" />
          <p className="text-xs">Loading access control configuration...</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DASHBOARD ACCESS                                                     */}
      {/* ========================================================================= */}
      {!loading && activeTab === "dashboard" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-orange-600" />
                <span>Central Dashboard & Quick Stats Access</span>
              </h3>
              <p className="text-xs text-slate-500">
                Control which family members can view the workspace overview dashboard, key metrics, and activity cards
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  for (const m of members) {
                    const acc = m.access || getDefaultMemberAccess();
                    if (!acc.canAccessDashboard) {
                      await updateFamilyMember(m.id, { access: { ...acc, canAccessDashboard: true } });
                    }
                  }
                  await loadAllData();
                  showToast("Authorized Dashboard for all members");
                }}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={async () => {
                  for (const m of members) {
                    const acc = m.access || getDefaultMemberAccess();
                    if (acc.loginRole !== "Admin" && m.relationship !== "Self") {
                      await updateFamilyMember(m.id, { access: { ...acc, canAccessDashboard: false } });
                    }
                  }
                  await loadAllData();
                  showToast("Restricted non-admins from Dashboard");
                }}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
              >
                Restrict Non-Admins
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Family Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Dashboard Access</th>
                  <th className="py-2.5 px-4 text-right pr-6">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => {
                  const acc = m.access || getDefaultMemberAccess();
                  const isAuthorized = acc.canAccessDashboard !== false;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-semibold text-slate-900">
                        {m.fullName}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {m.relationship} • {m.email || m.phone || "No login"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {acc.loginRole.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAuthorized}
                            onChange={() => toggleMemberFlag(m, "canAccessDashboard")}
                            className="sr-only peer"
                          />
                          <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                          <span
                            className={`ms-2 text-xs font-semibold ${
                              isAuthorized ? "text-orange-700 font-bold" : "text-slate-400"
                            }`}
                          >
                            {isAuthorized ? "Authorized" : "Restricted"}
                          </span>
                        </label>
                      </td>

                      <td className="py-3 px-4 text-right pr-6">
                        <button
                          type="button"
                          onClick={() => setInviteMember(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-medium"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Invite</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: VEHICLES ACCESS & CRUD PERMISSIONS                                 */}
      {/* ========================================================================= */}
      {!loading && activeTab === "vehicles" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-600" />
                  <span>Cars & Bikes Fleet Access, CRUD & Scope Permissions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control Fuel logging, Read vehicle telemetry, Service maintenance updates, and Delete permissions per member, plus grant access to specific vehicles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  <span>{vehicles.length} Vehicles in Fleet</span>
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setVehicleViewMode("members")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      vehicleViewMode === "members"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleViewMode("vehicles")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      vehicleViewMode === "vehicles"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Vehicle
                  </button>
                </div>
              </div>
            </div>

            {vehicleViewMode === "members" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4 sm:px-6">Member</th>
                      <th className="py-2.5 px-4">Master Fleet</th>
                      <th className="py-2.5 px-4">Fleet Scope & Permitted Vehicles</th>
                      <th className="py-2.5 px-4">CRUD Permissions</th>
                      <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((m) => {
                      const acc = m.access || getDefaultMemberAccess();
                      const isUnlocked = acc.canAccessVehicles;
                      const isScopeSpecific = acc.assignedVehicleScope === "specific";
                      const permittedVehicleIds = isScopeSpecific
                        ? acc.assignedVehicleIds || []
                        : vehicles.map((v) => v.id);
                      const permittedVehicles = vehicles.filter((v) =>
                        permittedVehicleIds.includes(v.id)
                      );

                      const canC = Boolean(acc.canWriteFuel || acc.canCreateVehicles);
                      const canR = Boolean(acc.canReadVehicles ?? true);
                      const canU = Boolean(acc.canWriteMaintenance || acc.canUpdateVehicles);
                      const canD = Boolean(acc.canDeleteVehicles ?? acc.loginRole === "Admin");

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Column 1: Member info */}
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                            <div className="flex items-center gap-2">
                              <span>{m.fullName}</span>
                              {!isUnlocked && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                                  Restricted
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                              {m.relationship} • {m.email || m.phone || "No login"}
                            </span>
                          </td>

                          {/* Column 2: Master Fleet Access Toggle */}
                          <td className="py-3.5 px-4 align-top">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isUnlocked}
                                onChange={() => toggleMemberFlag(m, "canAccessVehicles")}
                                className="sr-only peer"
                              />
                              <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                              <span
                                className={`ms-2 text-xs font-semibold ${
                                  isUnlocked ? "text-emerald-700" : "text-slate-400"
                                }`}
                              >
                                {isUnlocked ? "Authorized" : "Blocked"}
                              </span>
                            </label>
                          </td>

                          {/* Column 3: Fleet Scope & Specific Vehicle Selection */}
                          <td className="py-3.5 px-4 align-top">
                            {!isUnlocked ? (
                              <span className="text-xs text-slate-400 italic">
                                Fleet access must be enabled first
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => setVehicleScope(m, "all")}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                      !isScopeSpecific
                                        ? "bg-white text-emerald-800 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    All Vehicles ({vehicles.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVehicleScope(m, "specific");
                                      setOpenVehiclePickerMemberId((prev) =>
                                        prev === m.id ? null : m.id
                                      );
                                    }}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                      isScopeSpecific
                                        ? "bg-white text-amber-800 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    <span>Specific Vehicles</span>
                                    {isScopeSpecific && (
                                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                        {permittedVehicleIds.length}
                                      </span>
                                    )}
                                  </button>
                                </div>

                                {isScopeSpecific && (
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1 max-w-sm">
                                      {permittedVehicles.length === 0 ? (
                                        <span className="text-[11px] text-rose-600 font-medium">
                                          No vehicles selected (member sees nothing)
                                        </span>
                                      ) : (
                                        permittedVehicles.slice(0, 3).map((v) => (
                                          <span
                                            key={v.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200"
                                          >
                                            <Car className="h-2.5 w-2.5 text-emerald-600" />
                                            <span>{v.name}</span>
                                          </span>
                                        ))
                                      )}
                                      {permittedVehicles.length > 3 && (
                                        <span className="text-[10px] text-slate-500 font-bold">
                                          +{permittedVehicles.length - 3} more
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenVehiclePickerMemberId((prev) =>
                                            prev === m.id ? null : m.id
                                          )
                                        }
                                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 ml-1 cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span>
                                          {openVehiclePickerMemberId === m.id
                                            ? "Done"
                                            : "Edit Vehicles"}
                                        </span>
                                        {openVehiclePickerMemberId === m.id ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>

                                    {openVehiclePickerMemberId === m.id && (
                                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs max-w-md space-y-2">
                                        <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-1.5">
                                          <span className="font-bold text-slate-800">
                                            Select Permitted Vehicles:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => selectAllVehiclesForMember(m, true)}
                                              className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                            >
                                              Select All
                                            </button>
                                            <span className="text-slate-300">•</span>
                                            <button
                                              type="button"
                                              onClick={() => selectAllVehiclesForMember(m, false)}
                                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                            >
                                              Clear All
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                          {vehicles.map((v) => {
                                            const isChecked = permittedVehicleIds.includes(v.id);
                                            return (
                                              <label
                                                key={v.id}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                                  isChecked
                                                    ? "bg-white border-emerald-300 text-emerald-900 font-semibold shadow-2xs"
                                                    : "bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => toggleVehicleItemAccess(m, v.id)}
                                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                                />
                                                <Car
                                                  className={`h-3.5 w-3.5 shrink-0 ${
                                                    isChecked ? "text-emerald-600" : "text-slate-400"
                                                  }`}
                                                />
                                                <div className="truncate">
                                                  <div className="truncate font-semibold">{v.name}</div>
                                                  <div className="text-[10px] text-slate-400 font-mono truncate">
                                                    {v.registrationNumber || v.model}
                                                  </div>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Column 4: CRUD Controls */}
                          <td className="py-3.5 px-4 align-top">
                            {!isUnlocked ? (
                              <span className="text-xs text-slate-400 italic">No permissions</span>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "vehicles", "C")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canC
                                        ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title={
                                      canC
                                        ? "Can Log Fuel & Add Vehicles (Click to revoke)"
                                        : "Cannot Log Fuel (Click to grant)"
                                    }
                                  >
                                    <Fuel className="h-3 w-3" />
                                    <span>+ Fuel/Add</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "vehicles", "R")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canR
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can View Vehicles & Service Telemetry"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Read</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "vehicles", "U")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canU
                                        ? "bg-sky-50 border-sky-300 text-sky-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can Log Service & Edit Details"
                                  >
                                    <Wrench className="h-3 w-3" />
                                    <span>Service</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "vehicles", "D")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canD
                                        ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can Delete Vehicles & Service Records"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>

                                <div className="text-[10px] text-slate-400 font-mono">
                                  ACTIVE: {[canC && "Fuel/Add", canR && "Read", canU && "Service", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 5: Presets & Invite */}
                          <td className="py-3.5 px-4 text-right pr-6 align-top">
                            {isUnlocked ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "vehicles", "full")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="Full Driver & Fleet Manager"
                                  >
                                    Full Driver
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "vehicles", "contributor")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="Allow Fuel Logging & Viewing"
                                  >
                                    Fuel + Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "vehicles", "readonly")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="View Only"
                                  >
                                    View Only
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setInviteMember(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                                >
                                  <Share2 className="h-3 w-3 text-slate-400" />
                                  <span>Invite</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInviteMember(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                              >
                                <Share2 className="h-3 w-3 text-slate-400" />
                                <span>Invite</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* By Vehicle Per-Card Mode */
              <div className="p-4 space-y-4">
                {filteredVehicles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No vehicles found</div>
                ) : (
                  filteredVehicles.map((v) => {
                    const authorizedCount = members.filter((m) =>
                      memberHasVehicleAccess(m, v.id)
                    ).length;

                    return (
                      <div
                        key={v.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                      >
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-orange-600" />
                            <span className="font-bold text-slate-900">{v.name}</span>
                            <span className="text-xs text-slate-400 font-mono">
                              ({v.registrationNumber || v.model})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              {authorizedCount} of {members.length} Authorized
                            </span>
                            <button
                              type="button"
                              onClick={() => batchVehicleAccess(v.id, true)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Grant All
                            </button>
                            <button
                              type="button"
                              onClick={() => batchVehicleAccess(v.id, false)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-rose-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Restrict All
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {members.map((m) => {
                              const hasAccess = memberHasVehicleAccess(m, v.id);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => toggleVehicleItemAccess(m, v.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                                    hasAccess
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                      : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}
                                >
                                  <span>{m.fullName}</span>
                                  {hasAccess && <Check className="h-3 w-3 text-emerald-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROPERTY ACCESS & CRUD PERMISSIONS                                 */}
      {/* ========================================================================= */}
      {!loading && activeTab === "properties" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span>Real Estate, Rental Assets & Scope Permissions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control Rent collection, Read property details, Expense logging, and Delete permissions per member, plus grant access to specific properties
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{properties.length} Properties in Portfolio</span>
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPropertyViewMode("members")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      propertyViewMode === "members"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropertyViewMode("properties")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      propertyViewMode === "properties"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    By Property
                  </button>
                </div>
              </div>
            </div>

            {propertyViewMode === "members" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4 sm:px-6">Member</th>
                      <th className="py-2.5 px-4">Master Properties</th>
                      <th className="py-2.5 px-4">Property Scope & Permitted Units</th>
                      <th className="py-2.5 px-4">CRUD Permissions</th>
                      <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((m) => {
                      const acc = m.access || getDefaultMemberAccess();
                      const isUnlocked = acc.canAccessProperties;
                      const isScopeSpecific = acc.assignedPropertyScope === "specific";
                      const permittedPropertyIds = isScopeSpecific
                        ? acc.assignedPropertyIds || []
                        : properties.map((p) => p.id);
                      const permittedProps = properties.filter((p) =>
                        permittedPropertyIds.includes(p.id)
                      );

                      const canC = Boolean(acc.canWriteRent || acc.canCreateProperties);
                      const canR = Boolean(acc.canReadProperties ?? true);
                      const canU = Boolean(acc.canWritePropertyMaintenance || acc.canUpdateProperties);
                      const canD = Boolean(acc.canDeleteProperties ?? acc.loginRole === "Admin");

                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Column 1: Member info */}
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                            <div className="flex items-center gap-2">
                              <span>{m.fullName}</span>
                              {!isUnlocked && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                                  Restricted
                                </span>
                              )}
                            </div>
                            <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                              {m.relationship} • {m.email || m.phone || "No login"}
                            </span>
                          </td>

                          {/* Column 2: Master Properties Access Toggle */}
                          <td className="py-3.5 px-4 align-top">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isUnlocked}
                                onChange={() => toggleMemberFlag(m, "canAccessProperties")}
                                className="sr-only peer"
                              />
                              <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                              <span
                                className={`ms-2 text-xs font-semibold ${
                                  isUnlocked ? "text-emerald-700" : "text-slate-400"
                                }`}
                              >
                                {isUnlocked ? "Authorized" : "Blocked"}
                              </span>
                            </label>
                          </td>

                          {/* Column 3: Property Scope & Specific Property Selection */}
                          <td className="py-3.5 px-4 align-top">
                            {!isUnlocked ? (
                              <span className="text-xs text-slate-400 italic">
                                Property access must be enabled first
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => setPropertyScope(m, "all")}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                      !isScopeSpecific
                                        ? "bg-white text-emerald-800 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    All Properties ({properties.length})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPropertyScope(m, "specific");
                                      setOpenPropertyPickerMemberId((prev) =>
                                        prev === m.id ? null : m.id
                                      );
                                    }}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                      isScopeSpecific
                                        ? "bg-white text-amber-800 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    <span>Specific Properties</span>
                                    {isScopeSpecific && (
                                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                        {permittedPropertyIds.length}
                                      </span>
                                    )}
                                  </button>
                                </div>

                                {isScopeSpecific && (
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1 max-w-sm">
                                      {permittedProps.length === 0 ? (
                                        <span className="text-[11px] text-rose-600 font-medium">
                                          No properties selected (member sees nothing)
                                        </span>
                                      ) : (
                                        permittedProps.slice(0, 3).map((p) => (
                                          <span
                                            key={p.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200"
                                          >
                                            <Building2 className="h-2.5 w-2.5 text-emerald-600" />
                                            <span>{p.name}</span>
                                          </span>
                                        ))
                                      )}
                                      {permittedProps.length > 3 && (
                                        <span className="text-[10px] text-slate-500 font-bold">
                                          +{permittedProps.length - 3} more
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenPropertyPickerMemberId((prev) =>
                                            prev === m.id ? null : m.id
                                          )
                                        }
                                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 ml-1 cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span>
                                          {openPropertyPickerMemberId === m.id
                                            ? "Done"
                                            : "Edit Properties"}
                                        </span>
                                        {openPropertyPickerMemberId === m.id ? (
                                          <ChevronUp className="h-3 w-3" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>

                                    {openPropertyPickerMemberId === m.id && (
                                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs max-w-md space-y-2">
                                        <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-1.5">
                                          <span className="font-bold text-slate-800">
                                            Select Permitted Properties:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => selectAllPropertiesForMember(m, true)}
                                              className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                            >
                                              Select All
                                            </button>
                                            <span className="text-slate-300">•</span>
                                            <button
                                              type="button"
                                              onClick={() => selectAllPropertiesForMember(m, false)}
                                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                            >
                                              Clear All
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                          {properties.map((p) => {
                                            const isChecked = permittedPropertyIds.includes(p.id);
                                            return (
                                              <label
                                                key={p.id}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                                  isChecked
                                                    ? "bg-white border-emerald-300 text-emerald-900 font-semibold shadow-2xs"
                                                    : "bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => togglePropertyItemAccess(m, p.id)}
                                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                                />
                                                <Building2
                                                  className={`h-3.5 w-3.5 shrink-0 ${
                                                    isChecked ? "text-emerald-600" : "text-slate-400"
                                                  }`}
                                                />
                                                <div className="truncate">
                                                  <div className="truncate font-semibold">{p.name}</div>
                                                  <div className="text-[10px] text-slate-400 truncate">
                                                    {p.location}
                                                  </div>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Column 4: CRUD Controls */}
                          <td className="py-3.5 px-4 align-top">
                            {!isUnlocked ? (
                              <span className="text-xs text-slate-400 italic">No permissions</span>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "properties", "C")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canC
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title={
                                      canC
                                        ? "Can Collect Rent & Add Properties (Click to revoke)"
                                        : "Cannot Collect Rent (Click to grant)"
                                    }
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    <span>+ Rent/Add</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "properties", "R")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canR
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can View Property Details & Tenants"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Read</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "properties", "U")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canU
                                        ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can Log Expenses & Edit Details"
                                  >
                                    <Wrench className="h-3 w-3" />
                                    <span>Expenses</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleDomainCrud(m, "properties", "D")}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                      canD
                                        ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                        : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                    }`}
                                    title="Can Delete Properties & Units"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>

                                <div className="text-[10px] text-slate-400 font-mono">
                                  ACTIVE: {[canC && "Rent/Add", canR && "Read", canU && "Expenses", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 5: Presets & Invite */}
                          <td className="py-3.5 px-4 text-right pr-6 align-top">
                            {isUnlocked ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "properties", "full")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="Full Estate Manager"
                                  >
                                    Full Manager
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "properties", "contributor")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="Allow Rent Collection & Reading"
                                  >
                                    Rent Collector
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDomainPreset(m, "properties", "readonly")}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                    title="View Only"
                                  >
                                    View Only
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setInviteMember(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                                >
                                  <Share2 className="h-3 w-3 text-slate-400" />
                                  <span>Invite</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setInviteMember(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                              >
                                <Share2 className="h-3 w-3 text-slate-400" />
                                <span>Invite</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* By Property Per-Card Mode */
              <div className="p-4 space-y-4">
                {filteredProperties.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No properties found</div>
                ) : (
                  filteredProperties.map((p) => {
                    const authorizedCount = members.filter((m) =>
                      memberHasPropertyAccess(m, p.id)
                    ).length;

                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                      >
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-slate-900">{p.name}</span>
                            <span className="text-xs text-slate-400">
                              ({p.location} • {p.unitsCount} Units)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              {authorizedCount} of {members.length} Authorized
                            </span>
                            <button
                              type="button"
                              onClick={() => batchPropertyAccess(p.id, true)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Grant All
                            </button>
                            <button
                              type="button"
                              onClick={() => batchPropertyAccess(p.id, false)}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-rose-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              Restrict All
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {members.map((m) => {
                              const hasAccess = memberHasPropertyAccess(m, p.id);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => togglePropertyItemAccess(m, p.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                                    hasAccess
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                      : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}
                                >
                                  <span>{m.fullName}</span>
                                  {hasAccess && <Check className="h-3 w-3 text-emerald-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCUMENT VAULT ACCESS & CRUD PERMISSIONS                           */}
      {/* ========================================================================= */}
      {!loading && activeTab === "vault" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderLock className="h-4 w-4 text-sky-600" />
                <span>Document Vault Access, CRUD & Folder Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control Create (upload), Read (view), Update (edit), and Delete permissions per member, plus grant access to specific folders (Passports, NID, Deeds, etc.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-semibold flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5" />
                <span>{allAvailableFolders.length} Folders Available</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Member</th>
                  <th className="py-2.5 px-4">Master Vault</th>
                  <th className="py-2.5 px-4">Folder Scope & Permitted Folders</th>
                  <th className="py-2.5 px-4">CRUD Permissions</th>
                  <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => {
                  const acc = m.access || getDefaultMemberAccess();
                  const isVaultUnlocked = acc.canAccessVault;
                  const isScopeSpecific = acc.assignedVaultFolderScope === "specific";
                  const permittedFolders = isScopeSpecific
                    ? acc.assignedVaultFolders || []
                    : allAvailableFolders;

                  const canC = Boolean(acc.canCreateDocuments ?? acc.canWriteDocuments);
                  const canR = Boolean(acc.canReadDocuments ?? true);
                  const canU = Boolean(acc.canUpdateDocuments ?? acc.loginRole === "Admin");
                  const canD = Boolean(acc.canDeleteDocuments ?? acc.loginRole === "Admin");

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Column 1: Member info */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                        <div className="flex items-center gap-2">
                          <span>{m.fullName}</span>
                          {!isVaultUnlocked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                              Restricted
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                          {m.relationship} • {m.email || m.phone || "No login"}
                        </span>
                      </td>

                      {/* Column 2: Master Vault Access Toggle */}
                      <td className="py-3.5 px-4 align-top">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVaultUnlocked}
                            onChange={() => toggleMemberFlag(m, "canAccessVault")}
                            className="sr-only peer"
                          />
                          <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                          <span
                            className={`ms-2 text-xs font-semibold ${
                              isVaultUnlocked ? "text-sky-700" : "text-slate-400"
                            }`}
                          >
                            {isVaultUnlocked ? "Vault Unlocked" : "Locked"}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Folder Scope & Specific Folder Selection */}
                      <td className="py-3.5 px-4 align-top">
                        {!isVaultUnlocked ? (
                          <span className="text-xs text-slate-400 italic">
                            Vault access must be enabled first
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {/* Scope Selector: All Folders vs Specific Folders */}
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setFolderScope(m, "all")}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  !isScopeSpecific
                                    ? "bg-white text-sky-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                All Folders ({allAvailableFolders.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFolderScope(m, "specific");
                                  setOpenFolderPickerMemberId((prev) =>
                                    prev === m.id ? null : m.id
                                  );
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  isScopeSpecific
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <span>Specific Folders</span>
                                {isScopeSpecific && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    {permittedFolders.length}
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Specific Folders Tag Summary & Accordion Toggle */}
                            {isScopeSpecific && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1 max-w-sm">
                                  {permittedFolders.length === 0 ? (
                                    <span className="text-[11px] text-rose-600 font-medium">
                                      No folders selected (member sees nothing)
                                    </span>
                                  ) : (
                                    permittedFolders.slice(0, 3).map((fName) => (
                                      <span
                                        key={fName}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-semibold border border-sky-200"
                                      >
                                        <Folder className="h-2.5 w-2.5 text-sky-600" />
                                        <span>{fName}</span>
                                      </span>
                                    ))
                                  )}
                                  {permittedFolders.length > 3 && (
                                    <span className="text-[10px] text-slate-500 font-bold">
                                      +{permittedFolders.length - 3} more
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenFolderPickerMemberId((prev) =>
                                        prev === m.id ? null : m.id
                                      )
                                    }
                                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 ml-1 cursor-pointer flex items-center gap-0.5"
                                  >
                                    <span>
                                      {openFolderPickerMemberId === m.id
                                        ? "Done"
                                        : "Edit Folders"}
                                    </span>
                                    {openFolderPickerMemberId === m.id ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                {/* Expanded Folder Picker Panel */}
                                {openFolderPickerMemberId === m.id && (
                                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs max-w-md space-y-2">
                                    <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-1.5">
                                      <span className="font-bold text-slate-800">
                                        Select Permitted Folders:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => selectAllFoldersForMember(m, true)}
                                          className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                                        >
                                          Select All
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={() => selectAllFoldersForMember(m, false)}
                                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Clear All
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                      {allAvailableFolders.map((folderName) => {
                                        const isChecked = permittedFolders.some(
                                          (p) => p.toLowerCase() === folderName.toLowerCase()
                                        );
                                        return (
                                          <label
                                            key={folderName}
                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                              isChecked
                                                ? "bg-white border-sky-300 text-sky-900 font-semibold shadow-2xs"
                                                : "bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleFolderAccess(m, folderName)}
                                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                                            />
                                            <Folder
                                              className={`h-3.5 w-3.5 shrink-0 ${
                                                isChecked ? "text-sky-600" : "text-slate-400"
                                              }`}
                                            />
                                            <span className="truncate">{folderName}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 4: CRUD (Create, Read, Update, Delete) Controls */}
                      <td className="py-3.5 px-4 align-top">
                        {!isVaultUnlocked ? (
                          <span className="text-xs text-slate-400 italic">No permissions</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              {/* C: Create / Upload */}
                              <button
                                type="button"
                                onClick={() => toggleMemberCrud(m, "C")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canC
                                    ? "bg-sky-50 border-sky-300 text-sky-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canC
                                    ? "Can Upload Documents (Click to revoke)"
                                    : "Cannot Upload Documents (Click to grant)"
                                }
                              >
                                <Plus className="h-3 w-3" />
                                <span>Create</span>
                              </button>

                              {/* R: Read / View */}
                              <button
                                type="button"
                                onClick={() => toggleMemberCrud(m, "R")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canR
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canR
                                    ? "Can View Documents (Click to revoke)"
                                    : "Cannot View Documents (Click to grant)"
                                }
                              >
                                <Eye className="h-3 w-3" />
                                <span>Read</span>
                              </button>

                              {/* U: Update / Edit */}
                              <button
                                type="button"
                                onClick={() => toggleMemberCrud(m, "U")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canU
                                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canU
                                    ? "Can Edit Details & Move Folders (Click to revoke)"
                                    : "Cannot Edit Documents (Click to grant)"
                                }
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Update</span>
                              </button>

                              {/* D: Delete */}
                              <button
                                type="button"
                                onClick={() => toggleMemberCrud(m, "D")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canD
                                    ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canD
                                    ? "Can Delete Documents & Folders (Click to revoke)"
                                    : "Cannot Delete Documents (Click to grant)"
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              ACTIVE: {[canC && "Create", canR && "Read", canU && "Update", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Presets & Invite */}
                      <td className="py-3.5 px-4 text-right pr-6 align-top">
                        {isVaultUnlocked ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setMemberCrudPreset(m, "full")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Grant Full CRUD (Create, Read, Update, Delete)"
                              >
                                Full CRUD
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberCrudPreset(m, "contributor")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Allow Upload & Read (No Edit or Delete)"
                              >
                                Upload + Read
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberCrudPreset(m, "readonly")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="View Only (No Upload, Edit or Delete)"
                              >
                                View Only
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInviteMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                            >
                              <Share2 className="h-3 w-3 text-slate-400" />
                              <span>Invite</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInviteMember(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                          >
                            <Share2 className="h-3 w-3 text-slate-400" />
                            <span>Invite</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WARRANTIES & CLAIMS ACCESS                                         */}
      {/* ========================================================================= */}
      {!loading && activeTab === "warranties" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span>Purchases, Warranties & Receipts Access, CRUD & Category Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control Create (add purchases), Read (view receipts), Update (edit warranty details), and Delete permissions per member, plus grant access to specific warranty categories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{DEFAULT_WARRANTY_CATEGORIES.length} Categories Available</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Member</th>
                  <th className="py-2.5 px-4">Master Warranties</th>
                  <th className="py-2.5 px-4">Category Scope & Permitted Categories</th>
                  <th className="py-2.5 px-4">CRUD Permissions</th>
                  <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => {
                  const acc = m.access || getDefaultMemberAccess();
                  const isUnlocked = acc.canAccessWarranties;
                  const isScopeSpecific = acc.assignedWarrantyScope === "specific";
                  const permittedCategories = isScopeSpecific
                    ? acc.assignedWarrantyCategories || []
                    : DEFAULT_WARRANTY_CATEGORIES;

                  const canC = Boolean(acc.canCreateWarranties ?? acc.loginRole === "Admin");
                  const canR = Boolean(acc.canReadWarranties ?? true);
                  const canU = Boolean(acc.canUpdateWarranties ?? acc.loginRole === "Admin");
                  const canD = Boolean(acc.canDeleteWarranties ?? acc.loginRole === "Admin");

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Column 1: Member info */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                        <div className="flex items-center gap-2">
                          <span>{m.fullName}</span>
                          {!isUnlocked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                              Restricted
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                          {m.relationship} • {m.email || m.phone || "No login"}
                        </span>
                      </td>

                      {/* Column 2: Master Access Toggle */}
                      <td className="py-3.5 px-4 align-top">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUnlocked}
                            onChange={() => toggleMemberFlag(m, "canAccessWarranties")}
                            className="sr-only peer"
                          />
                          <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                          <span
                            className={`ms-2 text-xs font-semibold ${
                              isUnlocked ? "text-teal-700" : "text-slate-400"
                            }`}
                          >
                            {isUnlocked ? "Authorized" : "Blocked"}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Category Scope & Specific Category Selection */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">
                            Warranties access must be enabled first
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setWarrantyScope(m, "all")}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  !isScopeSpecific
                                    ? "bg-white text-teal-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                All Categories ({DEFAULT_WARRANTY_CATEGORIES.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWarrantyScope(m, "specific");
                                  setOpenWarrantyPickerMemberId((prev) =>
                                    prev === m.id ? null : m.id
                                  );
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  isScopeSpecific
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <span>Specific Categories</span>
                                {isScopeSpecific && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    {permittedCategories.length}
                                  </span>
                                )}
                              </button>
                            </div>

                            {isScopeSpecific && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1 max-w-sm">
                                  {permittedCategories.length === 0 ? (
                                    <span className="text-[11px] text-rose-600 font-medium">
                                      No categories selected (member sees nothing)
                                    </span>
                                  ) : (
                                    permittedCategories.slice(0, 3).map((cName) => (
                                      <span
                                        key={cName}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-semibold border border-teal-200"
                                      >
                                        <ShieldCheck className="h-2.5 w-2.5 text-teal-600" />
                                        <span>{cName}</span>
                                      </span>
                                    ))
                                  )}
                                  {permittedCategories.length > 3 && (
                                    <span className="text-[10px] text-slate-500 font-bold">
                                      +{permittedCategories.length - 3} more
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenWarrantyPickerMemberId((prev) =>
                                        prev === m.id ? null : m.id
                                      )
                                    }
                                    className="text-[11px] font-bold text-teal-600 hover:text-teal-800 ml-1 cursor-pointer flex items-center gap-0.5"
                                  >
                                    <span>
                                      {openWarrantyPickerMemberId === m.id
                                        ? "Done"
                                        : "Edit Categories"}
                                    </span>
                                    {openWarrantyPickerMemberId === m.id ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                {openWarrantyPickerMemberId === m.id && (
                                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs max-w-md space-y-2">
                                    <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-1.5">
                                      <span className="font-bold text-slate-800">
                                        Select Permitted Categories:
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => selectAllWarrantyCategories(m, true)}
                                          className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                                        >
                                          Select All
                                        </button>
                                        <span className="text-slate-300">•</span>
                                        <button
                                          type="button"
                                          onClick={() => selectAllWarrantyCategories(m, false)}
                                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                        >
                                          Clear All
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                      {DEFAULT_WARRANTY_CATEGORIES.map((catName) => {
                                        const isChecked = permittedCategories.includes(catName);
                                        return (
                                          <label
                                            key={catName}
                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                                              isChecked
                                                ? "bg-white border-teal-300 text-teal-900 font-semibold shadow-2xs"
                                                : "bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() =>
                                                toggleWarrantyCategoryAccess(m, catName)
                                              }
                                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-3.5 w-3.5"
                                            />
                                            <ShieldCheck
                                              className={`h-3.5 w-3.5 shrink-0 ${
                                                isChecked ? "text-teal-600" : "text-slate-400"
                                              }`}
                                            />
                                            <span className="truncate">{catName}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 4: CRUD Controls */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">No permissions</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "warranties", "C")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canC
                                    ? "bg-teal-50 border-teal-300 text-teal-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canC
                                    ? "Can Add Warranties & Receipts (Click to revoke)"
                                    : "Cannot Add Warranties (Click to grant)"
                                }
                              >
                                <Plus className="h-3 w-3" />
                                <span>Create</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "warranties", "R")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canR
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can View Warranties & Receipt Proofs"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Read</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "warranties", "U")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canU
                                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Edit Warranty Dates & Serial Numbers"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Update</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "warranties", "D")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canD
                                    ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Delete Warranty Records"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              ACTIVE: {[canC && "Create", canR && "Read", canU && "Update", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Presets & Invite */}
                      <td className="py-3.5 px-4 text-right pr-6 align-top">
                        {isUnlocked ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "warranties", "full")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Full CRUD Warranty Access"
                              >
                                Full CRUD
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "warranties", "contributor")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Add + Read Receipts"
                              >
                                Add + Read
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "warranties", "readonly")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="View Receipts Only"
                              >
                                View Only
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInviteMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                            >
                              <Share2 className="h-3 w-3 text-slate-400" />
                              <span>Invite</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInviteMember(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                          >
                            <Share2 className="h-3 w-3 text-slate-400" />
                            <span>Invite</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TASKS & SCHEDULE ACCESS                                            */}
      {/* ========================================================================= */}
      {!loading && activeTab === "tasks" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-amber-600" />
                <span>Tasks, To-Do List & Schedule Access, CRUD & Visibility Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control Create, Read, Update, and Delete permissions per member, plus configure whether members manage all family tasks or only assigned tasks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>To-Do & Schedule</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Member</th>
                  <th className="py-2.5 px-4">Master Tasks</th>
                  <th className="py-2.5 px-4">Visibility & Task Scope</th>
                  <th className="py-2.5 px-4">CRUD Permissions</th>
                  <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => {
                  const acc = m.access || getDefaultMemberAccess();
                  const isUnlocked = acc.canAccessTasks !== false;
                  const isScopeSpecific = acc.assignedTaskScope === "specific";

                  const canC = Boolean(acc.canCreateTasks ?? true);
                  const canR = Boolean(acc.canReadTasks ?? true);
                  const canU = Boolean(acc.canUpdateTasks ?? true);
                  const canD = Boolean(acc.canDeleteTasks ?? acc.loginRole === "Admin");

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Column 1: Member info */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                        <div className="flex items-center gap-2">
                          <span>{m.fullName}</span>
                          {!isUnlocked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                              Restricted
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                          {m.relationship} • {m.email || m.phone || "No login"}
                        </span>
                      </td>

                      {/* Column 2: Master Access Toggle */}
                      <td className="py-3.5 px-4 align-top">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUnlocked}
                            onChange={() => toggleMemberFlag(m, "canAccessTasks")}
                            className="sr-only peer"
                          />
                          <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                          <span
                            className={`ms-2 text-xs font-semibold ${
                              isUnlocked ? "text-amber-700" : "text-slate-400"
                            }`}
                          >
                            {isUnlocked ? "Authorized" : "Blocked"}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Task Scope (All Family vs Assigned Only) */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">
                            Tasks access must be enabled first
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setMemberSimpleScope(m, "assignedTaskScope", "all")}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  !isScopeSpecific
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                All Family Tasks
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberSimpleScope(m, "assignedTaskScope", "specific")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  isScopeSpecific
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <span>Assigned Only</span>
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              {isScopeSpecific
                                ? "Member only sees tasks and calendar events directly assigned to them"
                                : "Member can view and interact with all shared family tasks & events"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Column 4: CRUD Controls */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">No permissions</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "tasks", "C")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canC
                                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canC
                                    ? "Can Create New Tasks (Click to revoke)"
                                    : "Cannot Create Tasks (Click to grant)"
                                }
                              >
                                <Plus className="h-3 w-3" />
                                <span>Create</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "tasks", "R")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canR
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can View Tasks & Schedule"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Read</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "tasks", "U")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canU
                                    ? "bg-sky-50 border-sky-300 text-sky-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Edit & Complete Tasks"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Update</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "tasks", "D")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canD
                                    ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Delete Tasks"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              ACTIVE: {[canC && "Create", canR && "Read", canU && "Update", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Presets & Invite */}
                      <td className="py-3.5 px-4 text-right pr-6 align-top">
                        {isUnlocked ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "tasks", "full")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Full CRUD Task Manager"
                              >
                                Full CRUD
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "tasks", "contributor")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Create, Complete & Edit"
                              >
                                Contributor
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "tasks", "readonly")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="View Tasks Only"
                              >
                                View Only
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInviteMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                            >
                              <Share2 className="h-3 w-3 text-slate-400" />
                              <span>Invite</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInviteMember(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                          >
                            <Share2 className="h-3 w-3 text-slate-400" />
                            <span>Invite</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DAILY EXPENSES ACCESS                                                */}
      {/* ========================================================================= */}
      {!loading && activeTab === "expenses" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-rose-600" />
                <span>Daily Expenses & Money Tracker Access, CRUD & Scope Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control Create (log costs), Read (view records), Update (edit details), and Delete permissions per member, plus configure family shared ledger vs private personal ledger scope
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                <span>PIN-Protected Ledgers</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Member</th>
                  <th className="py-2.5 px-4">Master Expenses</th>
                  <th className="py-2.5 px-4">Ledger Scope & Visibility</th>
                  <th className="py-2.5 px-4">CRUD Permissions</th>
                  <th className="py-2.5 px-4 text-right pr-6">Quick Presets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => {
                  const acc = m.access || getDefaultMemberAccess();
                  const isUnlocked = acc.canAccessDailyExpenses !== false;
                  const isScopeSpecific = acc.assignedExpenseScope === "specific";

                  const canC = Boolean(acc.canCreateExpenses ?? true);
                  const canR = Boolean(acc.canReadExpenses ?? true);
                  const canU = Boolean(acc.canUpdateExpenses ?? true);
                  const canD = Boolean(acc.canDeleteExpenses ?? acc.loginRole === "Admin");

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        savingId === m.id ? "opacity-60 bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Column 1: Member info */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900 align-top">
                        <div className="flex items-center gap-2">
                          <span>{m.fullName}</span>
                          {!isUnlocked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
                              Restricted
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                          {m.relationship} • {m.email || m.phone || "No login"}
                        </span>
                      </td>

                      {/* Column 2: Master Access Toggle */}
                      <td className="py-3.5 px-4 align-top">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUnlocked}
                            onChange={() => toggleMemberFlag(m, "canAccessDailyExpenses")}
                            className="sr-only peer"
                          />
                          <div className="relative w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                          <span
                            className={`ms-2 text-xs font-semibold ${
                              isUnlocked ? "text-rose-700" : "text-slate-400"
                            }`}
                          >
                            {isUnlocked ? "Authorized" : "Blocked"}
                          </span>
                        </label>
                      </td>

                      {/* Column 3: Ledger Scope (Family Full vs Personal Only) */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">
                            Expenses access must be enabled first
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setMemberSimpleScope(m, "assignedExpenseScope", "all")}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  !isScopeSpecific
                                    ? "bg-white text-rose-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Family Full Ledger
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberSimpleScope(m, "assignedExpenseScope", "specific")}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                  isScopeSpecific
                                    ? "bg-white text-amber-800 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                <span>Personal Ledger Only</span>
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              {isScopeSpecific
                                ? "Restricted to member's own spending records and private PIN ledger"
                                : "Can view combined family expenses, monthly differentiation graphs & category trends"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Column 4: CRUD Controls */}
                      <td className="py-3.5 px-4 align-top">
                        {!isUnlocked ? (
                          <span className="text-xs text-slate-400 italic">No permissions</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "expenses", "C")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canC
                                    ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title={
                                  canC
                                    ? "Can Log Costs (Click to revoke)"
                                    : "Cannot Log Costs (Click to grant)"
                                }
                              >
                                <Plus className="h-3 w-3" />
                                <span>+ Log Cost</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "expenses", "R")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canR
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can View Expense Records & Trend Graphs"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Read</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "expenses", "U")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canU
                                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Edit Cost Records & Custom Categories"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Update</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleDomainCrud(m, "expenses", "D")}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                  canD
                                    ? "bg-rose-50 border-rose-300 text-rose-800 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                }`}
                                title="Can Delete Expense Records"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                              ACTIVE: {[canC && "Log Cost", canR && "Read", canU && "Update", canD && "Delete"].filter(Boolean).join(" • ") || "None"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Presets & Invite */}
                      <td className="py-3.5 px-4 text-right pr-6 align-top">
                        {isUnlocked ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "expenses", "full")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Full CRUD Expense Access"
                              >
                                Full CRUD
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "expenses", "contributor")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="Log & View Records"
                              >
                                Log + Read
                              </button>
                              <button
                                type="button"
                                onClick={() => setDomainPreset(m, "expenses", "readonly")}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
                                title="View Only"
                              >
                                View Only
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInviteMember(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                            >
                              <Share2 className="h-3 w-3 text-slate-400" />
                              <span>Invite</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInviteMember(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
                          >
                            <Share2 className="h-3 w-3 text-slate-400" />
                            <span>Invite</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ALL-IN-ONE MASTER MATRIX                                           */}
      {/* ========================================================================= */}
      {!loading && activeTab === "matrix" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                All-In-One Workspace Roles & Modules Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Comprehensive overview of all module access across every family member
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 sm:px-6">Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Dashboard</th>
                  <th className="py-2.5 px-4">To-Do</th>
                  <th className="py-2.5 px-4">Expenses</th>
                  <th className="py-2.5 px-4">Documents</th>
                  <th className="py-2.5 px-4">Vehicles</th>
                  <th className="py-2.5 px-4">Houses</th>
                  <th className="py-2.5 px-4">Warranties</th>
                  <th className="py-2.5 px-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const acc = member.access || getDefaultMemberAccess();
                  const isSaving = savingId === member.id;

                  const permittedVehicles =
                    !acc.canAccessVehicles
                      ? []
                      : !acc.assignedVehicleIds || acc.assignedVehicleIds.length === 0
                      ? vehicles
                      : vehicles.filter((v) => acc.assignedVehicleIds.includes(v.id));

                  const permittedProperties =
                    !acc.canAccessProperties
                      ? []
                      : !acc.assignedPropertyIds || acc.assignedPropertyIds.length === 0
                      ? properties
                      : properties.filter((p) => acc.assignedPropertyIds?.includes(p.id));

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{member.fullName}</div>
                            <div className="text-[11px] text-slate-400">
                              {member.relationship} • {member.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={acc.loginRole}
                          disabled={isSaving}
                          onChange={(e) =>
                            handleRoleChange(
                              member,
                              e.target.value as FamilyMemberAccess["loginRole"]
                            )
                          }
                          className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:border-slate-800 shadow-2xs"
                        >
                          <option value="Admin">Admin (Full Access)</option>
                          <option value="Vehicle_Manager">Vehicle Manager</option>
                          <option value="Viewer">Viewer (Read-Only)</option>
                          <option value="Custom">Custom Granular</option>
                        </select>
                      </td>

                      {/* 1. Dashboard */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.canAccessDashboard !== false
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {acc.canAccessDashboard !== false ? "Dashboard OK" : "Locked"}
                        </span>
                      </td>

                      {/* 2. Daily Life: Tasks */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.canAccessTasks !== false
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {acc.canAccessTasks !== false ? "Tasks OK" : "Locked"}
                        </span>
                      </td>

                      {/* 2. Daily Life: Expenses */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.canAccessDailyExpenses !== false
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {acc.canAccessDailyExpenses !== false ? "Expenses OK" : "Locked"}
                        </span>
                      </td>

                      {/* 3. Important Papers: Vault */}
                      <td className="py-3.5 px-4">
                        {!acc.canAccessVault ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400">
                            Locked
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              {acc.assignedVaultFolderScope === "specific"
                                ? `${(acc.assignedVaultFolders || []).length} Folders`
                                : "All Folders"}
                            </span>
                            <div className="text-[9px] font-mono font-bold text-slate-500">
                              {[
                                (acc.canCreateDocuments ?? acc.canWriteDocuments) && "C",
                                (acc.canReadDocuments ?? true) && "R",
                                (acc.canUpdateDocuments ?? acc.loginRole === "Admin") && "U",
                                (acc.canDeleteDocuments ?? acc.loginRole === "Admin") && "D",
                              ]
                                .filter(Boolean)
                                .join("") || "No CRUD"}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 4. Vehicles & Houses: Vehicles */}
                      <td className="py-3.5 px-4">
                        {!acc.canAccessVehicles || permittedVehicles.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">Locked</span>
                        ) : permittedVehicles.length === vehicles.length ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                            All ({vehicles.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            {permittedVehicles.length} of {vehicles.length}
                          </span>
                        )}
                      </td>

                      {/* 4. Vehicles & Houses: Properties */}
                      <td className="py-3.5 px-4">
                        {!acc.canAccessProperties || permittedProperties.length === 0 ? (
                          <span className="text-slate-400 text-[11px]">Locked</span>
                        ) : permittedProperties.length === properties.length ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                            All ({properties.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            {permittedProperties.length} Properties
                          </span>
                        )}
                      </td>

                      {/* 4. Vehicles & Houses: Warranties */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.canAccessWarranties
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {acc.canAccessWarranties ? "Warranties OK" : "Locked"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right pr-6">
                        <button
                          type="button"
                          onClick={() => setInviteMember(member)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
                        >
                          <Share2 className="h-3.5 w-3.5 text-orange-500" />
                          <span>Invite</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD FAMILY MEMBER RIGHT FROM ACCESS CONTROL                        */}
      {/* ========================================================================= */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Family Member</h3>
                  <p className="text-xs text-slate-500">Create member and grant module access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Etisha Habib, Towsif"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={addRelationship}
                    onChange={(e) => setAddRelationship(e.target.value as RelationshipType)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Starting Role
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) =>
                      setAddRole(e.target.value as FamilyMemberAccess["loginRole"])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  >
                    <option value="Vehicle_Manager">Vehicle Manager</option>
                    <option value="Admin">Admin (Full Access)</option>
                    <option value="Viewer">Viewer (Read-Only)</option>
                    <option value="Custom">Custom Granular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Used for LifeNest login)
                </label>
                <input
                  type="email"
                  placeholder="e.g. member@gmail.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone (WhatsApp invitations)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 01700000000"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {isAdding ? "Adding..." : "Add & Configure Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEND INVITE & CREDENTIALS (LIGHT THEME)                           */}
      {/* ========================================================================= */}
      {inviteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Invite {inviteMember.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send sign-in credentials and access instructions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-orange-600" />
                <span>How the invited member signs in:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>
                  They open LifeNest and click <span className="font-semibold text-slate-900">Sign Up</span>.
                </li>
                <li>
                  They enter their registered email:{" "}
                  <span className="font-mono font-bold text-orange-700">
                    {inviteMember.email || "(no email registered yet)"}
                  </span>
                  .
                </li>
                <li>They choose their own password.</li>
                <li>
                  Upon login, they will automatically see all the modules, vehicles, and properties you granted!
                </li>
              </ol>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Message Preview</label>
              <textarea
                readOnly
                value={getInviteText(inviteMember)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 font-mono focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleCopyInvite(inviteMember)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => shareInviteWhatsApp(inviteMember)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-emerald-600/30"
              >
                <Share2 className="h-4 w-4" />
                <span>Share via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
