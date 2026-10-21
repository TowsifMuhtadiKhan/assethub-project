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
  Edit2,
  Download,
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
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 min-h-screen">
      {/* ========================================================================= */}
      {/* 1. OFFICIAL PAGE HEADER (Pattern B Chosen by User) */}
      {/* ========================================================================= */}
      <UiPageHeader
        title="Company Information"
        helpTooltip="Easily update company basic information and ensure accurate records for effective management."
        subtitle="Easily update your company's basic information and ensure accurate records for effective management."
        actions={
          <div className="flex items-center gap-2">
            <UiButton
              variant="outline"
              size="sm"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => alert("Export initiated")}
            >
              Export
            </UiButton>
            <UiButton
              variant="primary"
              size="sm"
              icon={<Edit2 className="h-3.5 w-3.5" />}
              onClick={() => alert("Edit company information")}
            >
              Edit
            </UiButton>
          </div>
        }
      />

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
  );
}
