import { useState } from "react";
import {
  UiButton,
  UiPageHeader,
  UiTabs,
  UiCard,
  UiInput,
  UiSelect,
  UiTable,
  UiModal,
  type UiTableColumn,
} from "../components/design-system";
import {
  ChevronLeft,
  Edit2,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface SampleUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  createdOn: string;
  lastUpdated: string;
  addedBy: string;
  status: "Active" | "Pending" | "Inactive";
}

const SAMPLE_USERS: SampleUser[] = [
  {
    id: "usr_1",
    name: "Towsif Khan",
    email: "tkhan+1@pioneeraitech.com",
    department: "Default Department",
    role: "Company Admin",
    createdOn: "08/10/26",
    lastUpdated: "21/10/26",
    addedBy: "tkhan+1",
    status: "Active",
  },
  {
    id: "usr_2",
    name: "Ayesha Siddiqua",
    email: "ayesha@likherakho.com",
    department: "Finance & Accounts",
    role: "Manager",
    createdOn: "12/10/26",
    lastUpdated: "20/10/26",
    addedBy: "System",
    status: "Active",
  },
  {
    id: "usr_3",
    name: "Farhan Ahmed",
    email: "farhan@pioneeraitech.com",
    department: "Operations",
    role: "Viewer",
    createdOn: "15/10/26",
    lastUpdated: "19/10/26",
    addedBy: "tkhan+1",
    status: "Pending",
  },
  {
    id: "usr_4",
    name: "Sadia Rahman",
    email: "sadia.r@likherakho.com",
    department: "Human Resources",
    role: "Manager",
    createdOn: "16/10/26",
    lastUpdated: "21/10/26",
    addedBy: "tkhan+1",
    status: "Active",
  },
  {
    id: "usr_5",
    name: "Tanvir Hasan",
    email: "tanvir.h@pioneeraitech.com",
    department: "Engineering",
    role: "Editor",
    createdOn: "17/10/26",
    lastUpdated: "21/10/26",
    addedBy: "tkhan+1",
    status: "Active",
  },
  {
    id: "usr_6",
    name: "Nusrat Jahan",
    email: "nusrat@pioneeraitech.com",
    department: "Quality Assurance",
    role: "Viewer",
    createdOn: "18/10/26",
    lastUpdated: "20/10/26",
    addedBy: "tkhan+1",
    status: "Pending",
  },
  {
    id: "usr_7",
    name: "Mahmudul Karim",
    email: "karim@likherakho.com",
    department: "Legal & Compliance",
    role: "Legal Officer",
    createdOn: "19/10/26",
    lastUpdated: "21/10/26",
    addedBy: "System",
    status: "Active",
  },
  {
    id: "usr_8",
    name: "Rifat Chowdhury",
    email: "rifat@pioneeraitech.com",
    department: "Product Design",
    role: "Editor",
    createdOn: "20/10/26",
    lastUpdated: "21/10/26",
    addedBy: "tkhan+1",
    status: "Active",
  },
];

export function DesignSystemShowcasePage() {
  const [activeTab, setActiveTab] = useState("active_users");
  const [activeProtocol, setActiveProtocol] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [modalType] = useState<"default" | "warning" | "danger" | "success">("warning");
  const [tableSearch, setTableSearch] = useState("");

  // Standard Enterprise Table Columns (Matching User Selection)
  const columns: UiTableColumn<SampleUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
            {u.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{u.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (u) => <span className="text-slate-600 font-medium">{u.department}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
          {u.role}
        </span>
      ),
    },
    {
      key: "createdOn",
      header: "Created On",
      render: (u) => <span className="text-slate-500 font-mono text-[11px]">{u.createdOn}</span>,
    },
    {
      key: "lastUpdated",
      header: "Last Updated Date",
      render: (u) => <span className="text-slate-500 font-mono text-[11px]">{u.lastUpdated}</span>,
    },
    {
      key: "addedBy",
      header: "Added By",
      render: (u) => <span className="text-slate-600 font-medium">{u.addedBy}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span
          className={`font-bold text-xs ${
            u.status === "Active"
              ? "text-emerald-600"
              : u.status === "Pending"
              ? "text-amber-600"
              : "text-slate-400"
          }`}
        >
          {u.status}
        </span>
      ),
    },
  ];

  const filteredUsers = SAMPLE_USERS.filter((u) => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800">
      {/* ========================================================================= */}
      {/* 1. EXACT REPLICATION OF USER PATTERN (Top Full-Width Header Bar)           */}
      {/* ========================================================================= */}
      <UiPageHeader
        flush={false}
        leftSlot={
          <div
            className="pr-3.5 border-r border-slate-200/90 mr-1.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition select-none"
            title="Toggle Sidebar Collapse"
          >
            <ChevronLeft className="h-4 w-4" />
          </div>
        }
        title="Company Information"
        helpTooltip="Easily update your company's basic information and ensure accurate records for effective management."
        subtitle="Easily update your company's basic information and ensure accurate records for effective management."
        actions={
          <UiButton
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Edit
          </UiButton>
        }
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Verification & Alignment Banner */}
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Active Global Pattern:</strong> Top Header with pure white background, left sidebar chevron border, Title + circular tooltip (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-emerald-200">?</code>), subtitle, and brand emerald action button (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-emerald-200">#064e3b</code>).
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <span>Unified Central System</span>
          </div>
        </div>

      {/* ========================================================================= */}
      {/* 2. TAB NAVIGATION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
        <UiTabs
          variant="underline"
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "active_users", label: "Active Users", count: filteredUsers.length },
            { id: "invited_users", label: "Invited Users", count: 0 },
            { id: "archived", label: "Archived" },
          ]}
        />
        <div className="pb-2">
          <UiTabs
            variant="pill"
            activeTab={activeProtocol}
            onChange={setActiveProtocol}
            tabs={[
              { id: "all", label: "All Roles" },
              { id: "admin", label: "Admins" },
              { id: "manager", label: "Managers" },
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. OFFICIAL ENTERPRISE DATA TABLE (Chosen by User) */}
      {/* ========================================================================= */}
      <UiTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        searchPlaceholder="Search by name, email, or role..."
        onSearch={setTableSearch}
        onFilterClick={() => alert("Filter drawer")}
        pagination={true}
        pageSize={5}
        pageSizeOptions={[5, 10, 20]}
      />

      {/* ========================================================================= */}
      {/* 4. DETAILS & TWO-COLUMN EDIT CARD (Matching Screenshot 1 & 4) */}
      {/* ========================================================================= */}
      <UiCard
        title="Company details"
        subtitle="The organization's master registration and contact address."
        actions={
          <UiButton
            variant="ghost"
            size="sm"
            icon={<Edit2 className="h-3.5 w-3.5 text-slate-500" />}
            onClick={() => setShowModal(true)}
          >
            Edit Section
          </UiButton>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput
              label="Legal Company Name"
              required
              defaultValue="Likhe Rakho Technologies Ltd."
              placeholder="e.g. Likhe Rakho Ltd."
            />
            <UiInput
              label="Trade License / Registration Number"
              defaultValue="TRAD/DNCC/049281/2026"
              placeholder="Registration or TIN"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput
              label="Primary Work Email"
              type="email"
              required
              defaultValue="support@likherakho.vercel.app"
              placeholder="info@company.com"
            />
            <UiInput
              label="Official WhatsApp Sender Number"
              disabled
              defaultValue="+880 1577-243515"
              helpText="Dedicated automated notification sender gateway."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiSelect
              label="Headquarters Jurisdiction"
              defaultValue="Dhaka, Bangladesh"
              options={[
                { value: "Dhaka, Bangladesh", label: "Dhaka, Bangladesh (UTC+6)" },
                { value: "Chittagong, Bangladesh", label: "Chittagong, Bangladesh" },
                { value: "International", label: "International Office" },
              ]}
            />
            <UiInput
              label="Head Office Address"
              defaultValue="Gulshan-2, Dhaka 1212"
              placeholder="Full physical address"
            />
          </div>
        </div>
      </UiCard>

      {/* ========================================================================= */}
      {/* 5. UNIFIED CONFIRMATION / ACTION MODAL */}
      {/* ========================================================================= */}
      <UiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm Updates"
        subtitle="Are you sure you want to apply these organization changes across all active accounts?"
        type={modalType}
        confirmLabel="Confirm & Save"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowModal(false);
          alert("Changes saved to centralized design state.");
        }}
      >
        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
          This action applies instantly across all linked family and tenant profiles.
        </div>
      </UiModal>
      </div>
    </div>
  );
}
