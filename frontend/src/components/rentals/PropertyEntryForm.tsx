import { useState } from "react";
import {
  Building2,
  Users,
  X,
  AlertCircle,
  Home,
  Phone,
  Mail,
  CreditCard,
} from "lucide-react";
import { FormControl, Select, MenuItem } from "@mui/material";
import { supabase } from "../../lib/supabase";
import {
  createRentalProperty,
  saveRentSchedule,
  savePropertyDocument,
  saveRentalMaintenance,
} from "../../services/rentalService";
import { currentMonth } from "../../utils/rentalLedger";

export const BD_PROPERTY_DOC_TYPES = [
  "Title deed / Sale deed (Dalil / দলিল)",
  "Khatian / Record of rights (CS, SA, RS, BS খতিয়ান)",
  "Mutation / Namjari (নামজারি)",
  "Land development tax receipt (Dakhila / দাখিলা)",
  "Holding tax receipt (হোল্ডিং ট্যাক্স)",
  "Lease / Tenancy agreement (ভাড়া চুক্তিপত্র)",
  "Utility connection document (WASA / DESCO / Titas)",
  "Approved building plan",
  "Occupancy / Completion certificate",
  "Other",
];

export const MAINTENANCE_CATEGORIES = [
  "Plumbing & Sanitary",
  "Electrical & Wiring",
  "AC Servicing & Cooling",
  "Painting & Wall Repair",
  "Woodwork & Door/Window Locks",
  "Lift & Generator",
  "Water Motor & Tank",
  "General Servicing",
  "Other",
];

interface PropertyEntryFormProps {
  onSuccess: (propertyId?: string) => Promise<void>;
  onCancel: () => void;
}

export function PropertyEntryForm({ onSuccess, onCancel }: PropertyEntryFormProps) {
  // Step / Section 1: Property Layout & Details
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("Residential");
  const [flatIdentifier, setFlatIdentifier] = useState("Flat 1A");
  const [floor, setFloor] = useState("");
  const [sizeSqft, setSizeSqft] = useState<number | "">("");
  const [rentalMode, setRentalMode] = useState<"whole" | "rooms">("whole");
  const [roomCount, setRoomCount] = useState(2);

  // Step / Section 2: Occupancy & Tenant Details
  const [isOccupied, setIsOccupied] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantNid, setTenantNid] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonth());
  const [endMonth, setEndMonth] = useState("");

  // Step / Section 3: Financials & Rent Breakdown
  const [baseRent, setBaseRent] = useState<number | "">("");
  const [securityDeposit, setSecurityDeposit] = useState<number | "">("");
  const [serviceCharge, setServiceCharge] = useState<number | "">("");
  const [gasBill, setGasBill] = useState<number | "">("");
  const [electricityBill, setElectricityBill] = useState<number | "">("");
  const [waterBill, setWaterBill] = useState<number | "">("");
  const [parkingCharge, setParkingCharge] = useState<number | "">("");

  // Step / Section 4: Bangladeshi Documents
  const [addDoc, setAddDoc] = useState(false);
  const [docCategory, setDocCategory] = useState(BD_PROPERTY_DOC_TYPES[0]);
  const [docTitle, setDocTitle] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFiles, setDocFiles] = useState<File[]>([]);

  // Step / Section 5: Maintenance & Problem Handling
  const [addMaintenance, setAddMaintenance] = useState(false);
  const [maintenanceCategory, setMaintenanceCategory] = useState(MAINTENANCE_CATEGORIES[0]);
  const [maintenanceDesc, setMaintenanceDesc] = useState("");
  const [maintenanceAmount, setMaintenanceAmount] = useState<number | "">("");
  const [maintenanceVendor, setMaintenanceVendor] = useState("");
  const [maintenancePaymentMethod, setMaintenancePaymentMethod] = useState("Cash");
  const [maintenanceFiles, setMaintenanceFiles] = useState<File[]>([]);

  // State & Loading
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Compute Total Monthly Rent Live
  const totalMonthlyRent =
    (Number(baseRent) || 0) +
    (Number(serviceCharge) || 0) +
    (Number(gasBill) || 0) +
    (Number(electricityBill) || 0) +
    (Number(waterBill) || 0) +
    (Number(parkingCharge) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !flatIdentifier.trim()) {
      setError("Property name, address, and flat name are required.");
      return;
    }

    if (isOccupied && (!tenantName.trim() || tenantPhone.trim().length < 6)) {
      setError("For an occupied property, renter name and valid phone number are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create the Property & Unit(s) via RPC
      const propertyId = await createRentalProperty({
        name: name.trim(),
        location: location.trim(),
        type: propertyType,
        flat: flatIdentifier.trim(),
        rooms: rentalMode === "rooms" ? Number(roomCount) : 0,
      });

      // 2. Fetch created unit(s)
      const { data: units } = await supabase
        .from("lifenest_property_units")
        .select("*")
        .eq("property_id", propertyId);

      const targetUnit = units && units.length > 0 ? units[0] : null;

      // 3. Update unit specs & financials (floor, size, rent, deposit)
      if (targetUnit) {
        await supabase
          .from("lifenest_property_units")
          .update({
            floor: floor.trim() || targetUnit.floor || "",
            size_sqft: Number(sizeSqft) || targetUnit.size_sqft || 0,
            monthly_rent: totalMonthlyRent > 0 ? totalMonthlyRent : targetUnit.monthly_rent,
            security_deposit: Number(securityDeposit) || targetUnit.security_deposit || 0,
            status: isOccupied ? "Occupied" : "Vacant",
            tenant_name: isOccupied ? tenantName.trim() : null,
            tenant_phone: isOccupied ? tenantPhone.trim() : null,
            tenant_email: isOccupied ? tenantEmail.trim() : null,
            tenant_nid: isOccupied ? tenantNid.trim() : null,
          })
          .eq("id", targetUnit.id);
      }

      // 4. If Occupied, save Tenancy and Rent Schedule
      if (isOccupied && targetUnit) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: tenancyData } = await supabase
            .from("lifenest_rental_tenancies")
            .insert({
              owner_id: user.id,
              unit_id: targetUnit.id,
              tenant_name: tenantName.trim(),
              tenant_phone: tenantPhone.trim(),
              tenant_nid: tenantNid.trim(),
              start_month: startMonth.slice(0, 7) + "-01",
              end_month: endMonth ? endMonth.slice(0, 7) + "-01" : null,
            })
            .select()
            .single();

          if (tenancyData?.id && (Number(baseRent) > 0 || totalMonthlyRent > 0)) {
            const chargesList = [];
            if (Number(serviceCharge) > 0)
              chargesList.push({ label: "Service charge", amount: Number(serviceCharge) });
            if (Number(gasBill) > 0)
              chargesList.push({ label: "Gas bill", amount: Number(gasBill) });
            if (Number(electricityBill) > 0)
              chargesList.push({ label: "Electricity bill", amount: Number(electricityBill) });
            if (Number(waterBill) > 0)
              chargesList.push({ label: "Water bill", amount: Number(waterBill) });
            if (Number(parkingCharge) > 0)
              chargesList.push({ label: "Parking", amount: Number(parkingCharge) });

            await saveRentSchedule(
              {
                tenancy_id: tenancyData.id,
                from_month: startMonth.slice(0, 7),
                to_month: endMonth ? endMonth.slice(0, 7) : null,
                base_rent: Number(baseRent) || 0,
                charges: chargesList,
              },
              []
            );
          }
        }
      }

      // 5. If Document is entered, save Property Document
      if (addDoc && docTitle.trim()) {
        await savePropertyDocument(
          {
            property_id: propertyId,
            category: docCategory,
            name: docTitle.trim(),
            document_number: docNumber.trim(),
            issue_date: docIssueDate || null,
            expiry_date: docExpiryDate || null,
            notes: docNotes.trim(),
          },
          docFiles
        );
      }

      // 6. If Maintenance Issue is entered, save Initial Maintenance
      if (addMaintenance && maintenanceDesc.trim()) {
        await saveRentalMaintenance(
          {
            property_id: propertyId,
            unit_id: targetUnit ? targetUnit.id : null,
            date: new Date().toISOString().slice(0, 10),
            category: maintenanceCategory,
            amount: Number(maintenanceAmount) || 0,
            vendor: maintenanceVendor.trim(),
            description: maintenanceDesc.trim(),
            payment_method: maintenancePaymentMethod,
            extracted_text: "",
          },
          maintenanceFiles
        );
      }

      await onSuccess(propertyId);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save property. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Add Real Estate & Rental Property
              </h2>
              <p className="text-xs text-slate-500">
                Setup flat layout, renter occupancy, monthly rent, Bangladeshi documents, and maintenance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-rose-700 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: PROPERTY LAYOUT & STRUCTURE                                      */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold border-b border-slate-100 pb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px]">
                1
              </span>
              <span className="text-sm">Property Space & Layout Structure</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Property / Building Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Horizon Residence, Road 12 House"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address / City Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block C, Road 5, Bashundhara R/A, Dhaka"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Property Type
                </label>
                <FormControl size="small" fullWidth>
                  <Select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    sx={{
                      fontSize: "0.8125rem",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      "& .MuiSelect-select": { py: "8px" },
                    }}
                  >
                    <MenuItem value="Residential" sx={{ fontSize: "0.8125rem" }}>Residential Flat / House</MenuItem>
                    <MenuItem value="Commercial" sx={{ fontSize: "0.8125rem" }}>Commercial Office / Floor</MenuItem>
                    <MenuItem value="Shop / Retail" sx={{ fontSize: "0.8125rem" }}>Shop / Retail Space</MenuItem>
                    <MenuItem value="Mixed use" sx={{ fontSize: "0.8125rem" }}>Mixed Use Building</MenuItem>
                    <MenuItem value="Warehouse" sx={{ fontSize: "0.8125rem" }}>Warehouse / Storage</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Flat / Unit Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 4B, Unit 2, Floor 3"
                  value={flatIdentifier}
                  onChange={(e) => setFlatIdentifier(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Size (Sqft) & Floor
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Sqft (e.g. 1450)"
                    value={sizeSqft}
                    onChange={(e) => setSizeSqft(e.target.value ? Number(e.target.value) : "")}
                    className="w-1/2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Floor (e.g. 4th)"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-1/2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Rental Mode: Single unit vs separate rooms */}
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                How is this space rented?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRentalMode("whole")}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                    rentalMode === "whole"
                      ? "border-indigo-600 bg-indigo-50/40 text-slate-900 font-medium"
                      : "border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-white"
                  }`}
                >
                  <Home className={`h-4 w-4 mt-0.5 ${rentalMode === "whole" ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <span className="font-bold block text-slate-900">Single Entire Flat / House</span>
                    <span className="text-[11px] text-slate-500">Rented as a complete single unit to one family or renter</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRentalMode("rooms")}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                    rentalMode === "rooms"
                      ? "border-indigo-600 bg-indigo-50/40 text-slate-900 font-medium"
                      : "border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-white"
                  }`}
                >
                  <Users className={`h-4 w-4 mt-0.5 ${rentalMode === "rooms" ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <span className="font-bold block text-slate-900">Multiple Separate Rooms</span>
                    <span className="text-[11px] text-slate-500">Subdivided into individual rooms rented separately</span>
                  </div>
                </button>
              </div>

              {rentalMode === "rooms" && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Number of separate rooms to generate *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="50"
                    value={roomCount}
                    onChange={(e) => setRoomCount(Number(e.target.value) || 1)}
                    className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-900 outline-none focus:border-slate-900 font-mono font-bold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 2: OCCUPANCY STATUS & RENTER PERSON ("is there any rental person?")  */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold border-b border-slate-100 pb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px]">
                2
              </span>
              <span className="text-sm">Occupancy Status & Renter Details</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Is there currently a renter living here?</span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setIsOccupied(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isOccupied ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Yes (Occupied)
                </button>
                <button
                  type="button"
                  onClick={() => setIsOccupied(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !isOccupied ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  No (Vacant)
                </button>
              </div>
            </div>

            {isOccupied ? (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Renter Full Name *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required={isOccupied}
                        placeholder="e.g. Md. Tariqul Islam"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Renter Phone / WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="tel"
                        required={isOccupied}
                        placeholder="e.g. 01711234567"
                        value={tenantPhone}
                        onChange={(e) => setTenantPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Renter Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="email"
                        inputMode="email"
                        placeholder="e.g. tariqul@company.com"
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      National ID (NID) / Passport
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 19902692518..."
                        value={tenantNid}
                        onChange={(e) => setTenantNid(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rent Start Month *
                    </label>
                    <input
                      type="month"
                      required={isOccupied}
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Agreement End Month (Optional)
                    </label>
                    <input
                      type="month"
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-amber-900">
                <span className="font-bold block">Space marked as Vacant</span>
                <span className="text-[11px] text-amber-800">
                  You can set up expected rent and add renter details later when a new renter moves in.
                </span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STEP 3: RENT, SECURITY ADVANCE & UTILITIES BREAKDOWN                      */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-700 font-bold border-b border-slate-100 pb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px]">
                3
              </span>
              <span className="text-sm">Monthly Rent, Deposit & Utility Bills</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Base Rent (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 28000"
                    value={baseRent}
                    onChange={(e) => setBaseRent(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security Deposit / Advance (৳ BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">
                    ৳
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 56000 (2 months advance)"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Utility Charges Breakdown */}
            <div className="space-y-2 pt-1">
              <span className="block font-semibold text-slate-700">
                Utility Bills & Recurring Monthly Charges (৳)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">Service Charge</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">Gas Bill</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={gasBill}
                    onChange={(e) => setGasBill(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">Electricity</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={electricityBill}
                    onChange={(e) => setElectricityBill(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">Water Bill</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={waterBill}
                    onChange={(e) => setWaterBill(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5 font-medium">Parking / Gen.</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={parkingCharge}
                    onChange={(e) => setParkingCharge(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 font-mono text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Total Rent Summary Capsule */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50 border border-indigo-200/80">
              <div>
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                  Total Monthly Rent Collected
                </span>
                <span className="text-[11px] text-indigo-700">
                  Base rent ৳{(Number(baseRent) || 0).toLocaleString()} + Utilities ৳
                  {(totalMonthlyRent - (Number(baseRent) || 0)).toLocaleString()}
                </span>
              </div>
              <div className="font-mono text-lg font-black text-indigo-950">
                ৳{totalMonthlyRent.toLocaleString()}
                <span className="text-xs font-normal text-indigo-700">/month</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 4: BANGLADESHI DOCUMENTS (Dalil, Khatian, Mutation, Agreement)        */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px]">
                  4
                </span>
                <span className="text-sm">Bangladeshi Property & Tenancy Documents</span>
              </div>
              <button
                type="button"
                onClick={() => setAddDoc(!addDoc)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {addDoc ? "— Hide Document" : "+ Add Document (Optional)"}
              </button>
            </div>

            {addDoc && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Document Category
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={docCategory}
                        onChange={(e) => {
                          setDocCategory(e.target.value);
                          if (!docTitle) setDocTitle(e.target.value.split("(")[0].trim());
                        }}
                        sx={{
                          fontSize: "0.8125rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { py: "8px" },
                        }}
                      >
                        {BD_PROPERTY_DOC_TYPES.map((cat) => (
                          <MenuItem key={cat} value={cat} sx={{ fontSize: "0.8125rem" }}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Registered Sale Deed 4529/2021"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Deed / Khatian / Doc Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Khatian # 1428"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={docIssueDate}
                      onChange={(e) => setDocIssueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Expiry / Renewal Date
                    </label>
                    <input
                      type="date"
                      value={docExpiryDate}
                      onChange={(e) => setDocExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Notes / Location of Original (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Original kept in safety locker, registered in Tejgaon"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attach Scan / PDF Documents
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STEP 5: MAINTENANCE & PROBLEM HANDLING ("problem maintenance")           */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px]">
                  5
                </span>
                <span className="text-sm">Problem Maintenance & Repairs Handling</span>
              </div>
              <button
                type="button"
                onClick={() => setAddMaintenance(!addMaintenance)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {addMaintenance ? "— Hide Maintenance" : "+ Log Problem Issue (Optional)"}
              </button>
            </div>

            {addMaintenance && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Maintenance Category
                    </label>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={maintenanceCategory}
                        onChange={(e) => setMaintenanceCategory(e.target.value)}
                        sx={{
                          fontSize: "0.8125rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": { py: "8px" },
                        }}
                      >
                        {MAINTENANCE_CATEGORIES.map((cat) => (
                          <MenuItem key={cat} value={cat} sx={{ fontSize: "0.8125rem" }}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Cost / Spent Amount (৳ BDT)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2500"
                      value={maintenanceAmount}
                      onChange={(e) =>
                        setMaintenanceAmount(e.target.value ? Number(e.target.value) : "")
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Issue / Fix Description *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bathroom sink pipe leaking, main breaker tripped"
                      value={maintenanceDesc}
                      onChange={(e) => setMaintenanceDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contractor / Technician Vendor
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Technician Rafiq, Bhai Bhai Electric"
                      value={maintenanceVendor}
                      onChange={(e) => setMaintenanceVendor(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={maintenancePaymentMethod}
                      onChange={(e) => setMaintenancePaymentMethod(e.target.value)}
                      sx={{
                        fontSize: "0.8125rem",
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
                        borderRadius: "0.75rem",
                        backgroundColor: "#f8fafc",
                        "& .MuiSelect-select": { py: "8px" },
                      }}
                    >
                      <MenuItem value="Cash" sx={{ fontSize: "0.8125rem" }}>Cash</MenuItem>
                      <MenuItem value="bKash" sx={{ fontSize: "0.8125rem" }}>bKash</MenuItem>
                      <MenuItem value="Nagad" sx={{ fontSize: "0.8125rem" }}>Nagad</MenuItem>
                      <MenuItem value="Bank Transfer" sx={{ fontSize: "0.8125rem" }}>Bank Transfer</MenuItem>
                      <MenuItem value="Card" sx={{ fontSize: "0.8125rem" }}>Card</MenuItem>
                      <MenuItem value="Other" sx={{ fontSize: "0.8125rem" }}>Other</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attach Repair Receipts / Bills
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setMaintenanceFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {submitting ? "Saving Property & Records..." : "Save Property Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
