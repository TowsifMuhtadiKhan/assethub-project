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
  Plus,
  Edit2,
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
];

export function DesignSystemShowcasePage() {
  const [activeTab, setActiveTab] = useState("active_users");
  const [activeProtocol, setActiveProtocol] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"default" | "warning" | "danger" | "success">("warning");
  const [tableSearch, setTableSearch] = useState("");
  const [selectedThemeColor, setSelectedThemeColor] = useState<"orange" | "emerald">("orange");

  // Sample Table Columns (Matching Screenshot 3)
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
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-10 min-h-screen">
      {/* Introduction Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#f97316] text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full">
              Design System & Pattern Lab
            </span>
            <span className="text-xs text-slate-400 font-mono">v1.0 Standard</span>
          </div>
          <h1 className="text-xl font-bold mt-2">Likhe Rakho Central Component Architecture</h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            All buttons, headers, tables, forms, and dialogs are unified into reusable building blocks.
            Changing a style here automatically synchronizes across all pages of the application.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 shrink-0">
          <span className="text-xs text-slate-300 font-semibold px-2">Accent:</span>
          <button
            type="button"
            onClick={() => setSelectedThemeColor("orange")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              selectedThemeColor === "orange" ? "bg-[#f97316] text-white" : "text-slate-400"
            }`}
          >
            Orange SaaS
          </button>
          <button
            type="button"
            onClick={() => setSelectedThemeColor("emerald")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              selectedThemeColor === "emerald" ? "bg-[#064e3b] text-white" : "text-slate-400"
            }`}
          >
            Emerald Theme
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PAGE HEADERS (Pattern from Screenshot 1, 3, 4) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Unified Header Patterns
          </h2>
        </div>

        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          {/* Header Variant A: Standard List Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pattern A: List / Overview Header (Screenshot 3)
            </span>
            <UiPageHeader
              title="All User List"
              helpTooltip="Manage and organize user accounts"
              subtitle="Manage and organize all user accounts within your organization to ensure proper access and role assignments."
              actions={
                <UiButton variant="primary" size="md" icon={<Plus className="h-4 w-4" />}>
                  Add User
                </UiButton>
              }
            />
          </div>

          {/* Header Variant B: Settings / Action Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pattern B: Section / Settings Header (Screenshot 1)
            </span>
            <UiPageHeader
              title="Company Information"
              helpTooltip="Company master profile and registration"
              subtitle="Easily update your company's basic information and ensure accurate records for effective management."
              actions={
                <UiButton variant="primary" size="sm" icon={<Edit2 className="h-3.5 w-3.5" />}>
                  Edit
                </UiButton>
              }
            />
          </div>

          {/* Header Variant C: Detail & Edit View with Back Button */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pattern C: Details / Edit Form Header (Screenshot 4)
            </span>
            <UiPageHeader
              onBack={() => alert("Back button clicked")}
              title="Edit User"
              helpTooltip="Modify user permissions"
              subtitle="Manage and organize all user accounts within your organization to ensure proper access and role assignments."
              actions={
                <>
                  <UiButton variant="outline" size="sm">
                    Cancel
                  </UiButton>
                  <UiButton variant="primary" size="sm">
                    Update
                  </UiButton>
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: TABS PATTERNS (Underline vs Pill) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Tabs & Segmented Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          {/* Underline Tabs */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pattern A: Underline Tabs (Screenshot 3)
              </span>
              <p className="text-xs text-slate-500">Ideal for major view switching (Users, Documents, Activity)</p>
            </div>
            <UiTabs
              variant="underline"
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: "active_users", label: "Active Users", count: 3 },
                { id: "invited_users", label: "Invited Users", count: 0 },
                { id: "archived", label: "Archived" },
              ]}
            />
          </div>

          {/* Pill Segmented Tabs */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pattern B: Pill Filter Controls (Screenshot 2)
              </span>
              <p className="text-xs text-slate-500">Ideal for category, protocol, or tag filters</p>
            </div>
            <UiTabs
              variant="pill"
              labelPrefix="Protocol:"
              activeTab={activeProtocol}
              onChange={setActiveProtocol}
              tabs={[
                { id: "all", label: "All" },
                { id: "rest", label: "REST" },
                { id: "graphql", label: "GraphQL" },
                { id: "grpc", label: "gRPC" },
                { id: "soap", label: "SOAP" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: DATA TABLE PATTERN (Screenshot 2 & 3) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Standardized Enterprise Data Table
          </h2>
        </div>

        <UiTable
          columns={columns}
          data={filteredUsers}
          keyExtractor={(u) => u.id}
          searchPlaceholder="Search by name, email, or role..."
          onSearch={setTableSearch}
          onFilterClick={() => alert("Filter drawer opened")}
        />
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: DETAILS & FORM PATTERNS (Screenshot 1 & 4) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            4. Details & Edit Form Cards
          </h2>
        </div>

        <div className="space-y-5">
          {/* Section 1: Personal Details */}
          <UiCard
            title="Personal details"
            subtitle="The user's name and work email address."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UiInput
                  label="First Name"
                  required
                  defaultValue="Towsif"
                  placeholder="Enter first name"
                />
                <UiInput
                  label="Last Name"
                  defaultValue="Khan"
                  placeholder="Enter last name"
                />
              </div>

              <UiInput
                label="Email ID"
                required
                defaultValue="tkhan+1@pioneeraitech.com"
                placeholder="Enter work email address"
              />
            </div>
          </UiCard>

          {/* Section 2: Access & Department */}
          <UiCard
            title="Access"
            subtitle="Where the user sits in your company and what their role lets them do."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UiSelect
                label="Department"
                required
                defaultValue="default"
                options={[
                  { value: "default", label: "Default Department" },
                  { value: "finance", label: "Finance & Accounts" },
                  { value: "engineering", label: "Engineering" },
                ]}
              />

              <UiSelect
                label="Role"
                required
                defaultValue="admin"
                options={[
                  { value: "admin", label: "Company Admin" },
                  { value: "manager", label: "Manager" },
                  { value: "member", label: "Member" },
                  { value: "viewer", label: "Viewer" },
                ]}
              />
            </div>
          </UiCard>

          {/* Section 3: Active Selection Highlight Card (Screenshot 1: Base Domain style) */}
          <UiCard
            title="Domain Configuration"
            subtitle="Helps users from your corporate domains join your workspace."
          >
            <div className="p-4 rounded-xl border-2 border-[#f97316] bg-orange-50/20 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border-4 border-[#f97316] bg-white shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Base Domain</h4>
                  <p className="text-[11px] text-slate-500">Instantly connect a hosted domain for free</p>
                </div>
              </div>
              <div className="flex gap-2">
                <UiInput
                  label=""
                  defaultValue="likherakho"
                  placeholder="Enter Domain Name"
                  className="flex-1"
                />
                <span className="inline-flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono font-semibold text-slate-600">
                  .web.ata.dev
                </span>
              </div>
            </div>
          </UiCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: BUTTON PALETTE & POPUP SYSTEM */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            5. Button & Modal System
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          {/* Button Sizes & Variants */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900">Standard Button Variants</h3>
            <div className="flex flex-wrap items-center gap-2">
              <UiButton variant="primary">Primary Solid</UiButton>
              <UiButton variant="secondary">Secondary Solid</UiButton>
              <UiButton variant="outline">Outline</UiButton>
              <UiButton variant="ghost">Ghost</UiButton>
              <UiButton variant="danger">Danger</UiButton>
            </div>

            <h3 className="text-xs font-bold text-slate-900 pt-2 border-t border-slate-100">
              Standard Button Sizes
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <UiButton size="xs" variant="outline">Extra Small (xs)</UiButton>
              <UiButton size="sm" variant="outline">Small (sm)</UiButton>
              <UiButton size="md" variant="outline">Medium (md)</UiButton>
              <UiButton size="lg" variant="outline">Large (lg)</UiButton>
            </div>
          </div>

          {/* Unified Popups / Modals */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900">Universal Confirmation Modal</h3>
            <p className="text-xs text-slate-500">
              Single global dialog template used across the entire application for confirmations,
              deletions, and form popups.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <UiButton
                variant="primary"
                onClick={() => {
                  setModalType("default");
                  setShowModal(true);
                }}
              >
                Open Default Modal
              </UiButton>

              <UiButton
                variant="danger"
                onClick={() => {
                  setModalType("danger");
                  setShowModal(true);
                }}
              >
                Open Danger Dialog
              </UiButton>
            </div>
          </div>
        </div>
      </section>

      {/* Live Universal Modal Demo */}
      <UiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={modalType}
        title={modalType === "danger" ? "Delete Record Permanently?" : "Confirm Action"}
        subtitle={
          modalType === "danger"
            ? "This action cannot be undone and will permanently remove this data from your vault."
            : "Please review the details before submitting this request."
        }
        confirmLabel={modalType === "danger" ? "Delete Record" : "Confirm & Proceed"}
        onConfirm={() => {
          alert("Confirmed via global UiModal!");
          setShowModal(false);
        }}
      >
        <p>
          This is the single global modal component. It guarantees 100% consistent border radius,
          backdrop blur, action button positioning, and header typography throughout the entire app.
        </p>
      </UiModal>
    </div>
  );
}
