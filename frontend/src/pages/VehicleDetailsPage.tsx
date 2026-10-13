import { sumMoney } from "../utils/assetReports";
import { VehicleBrandLogo } from "../components/common/VehicleBrandLogo";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Upload,
  AlertCircle,
  Fuel,
  Wrench,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  Send,
  Edit2,
  Bell,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listVehicles,
  updateVehicle,
  parseVehicleSpecsFromNotes,
} from "../services/vehicleService";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import { DocumentViewerModal, type ViewableDocument } from "../components/common/DocumentViewerModal";
import {
  createVehicleExpense,
  createVehicleService,
  listVehicleExpenses,
  listVehicleServices,
  updateVehicleExpense,
  deleteVehicleExpense,
  updateVehicleService,
  deleteVehicleService,
} from "../services/vehicleRecordService";
import {
  listVehicleDocuments,
  createVehicleDocument,
  updateVehicleDocument,
  deleteVehicleDocument,
  extractMaintenanceFromReceipt,
  extractVehicleSpecsFromDocument,
  type ExtractedVehicleSpecs,
} from "../services/vehicleDocumentService";
import {
  listWarrantiesForVehicle,
  createWarranty,
  deleteWarranty,
} from "../services/warrantyService";
import type {
  ServiceType,
  Vehicle,
  VehicleExpense,
  VehicleService,
  VehicleDocument,
  WarrantyItem,
  BangladeshDocType,
} from "../types";
import { getVehicleIcon, getVehicleTypeBadgeClass } from "./VehicleEntryPage";
import { BangladeshNumberPlate } from "../components/common/BangladeshNumberPlate";
import { ItemRecipientSelector } from "../components/common/ItemRecipientSelector";
import {
  dispatchVehicleDocReminderNow,
  checkAndDispatchDueReminders,
  parseLeadMinutes,
} from "../services/reminderDaemon";

const BD_DOC_PRESETS: Record<
  string,
  Array<{ name: string; category: BangladeshDocType; description: string }>
> = {
  Car: [
    { name: "BRTA Tax Token", category: "Tax Token", description: "Mandatory annual BRTA tax clearance token" },
    { name: "Registration Certificate (Form 23)", category: "Registration Certificate", description: "Blue book / vehicle registration paper" },
    { name: "Smart Registration Card", category: "Smart Registration Card", description: "Digital biometric retro-reflective smart card" },
    { name: "Driving License", category: "Driving License", description: "Assigned driver or owner BRTA driving license" },
    { name: "BRTA Fitness Certificate", category: "Fitness Certificate", description: "Vehicle fitness certificate clearance" },
    { name: "Insurance Certificate", category: "Insurance Certificate", description: "Motor insurance / third party certificate" },
  ],
  Bike: [
    { name: "BRTA Tax Token", category: "Tax Token", description: "Motorcycle tax token certificate" },
    { name: "Smart Registration Card", category: "Smart Registration Card", description: "Motorcycle biometric smart registration card" },
    { name: "Driving License", category: "Driving License", description: "Owner or rider BRTA motorcycle license" },
    { name: "Registration Certificate", category: "Registration Certificate", description: "Vehicle registration blue book / paper" },
    { name: "Insurance Certificate", category: "Insurance Certificate", description: "Motorcycle insurance paper" },
  ],
  Commercial: [
    { name: "BRTA Route Permit", category: "Route Permit", description: "Inter-district / metropolitan route permit" },
    { name: "BRTA Fitness Certificate", category: "Fitness Certificate", description: "Commercial vehicle fitness certificate" },
    { name: "BRTA Tax Token", category: "Tax Token", description: "Commercial tax token certificate" },
    { name: "Smart Registration Card", category: "Smart Registration Card", description: "Commercial vehicle smart card" },
    { name: "Heavy / Commercial Driving License", category: "Driving License", description: "Commercial driver license" },
  ],
  Default: [
    { name: "BRTA Tax Token", category: "Tax Token", description: "BRTA vehicle tax token" },
    { name: "Registration Certificate", category: "Registration Certificate", description: "Vehicle registration document" },
    { name: "Smart Registration Card", category: "Smart Registration Card", description: "Biometric registration card" },
    { name: "Driving License", category: "Driving License", description: "Driver's license" },
    { name: "Fitness Certificate", category: "Fitness Certificate", description: "Vehicle inspection clearance" },
  ],
};

const MAINTENANCE_PRESETS = [
  "Mobil change",
  "Oil filter",
  "Air filter",
  "AC servicing",
  "Brake pads",
  "Battery",
  "Wheel alignment",
  "Spark plugs",
  "Suspension",
  "General servicing",
  "Others",
];

const FUEL_TYPES = ["Octane", "Petrol", "Diesel", "CNG", "LPG", "Electricity"];

const BD_FUEL_RATES: Record<string, number> = {
  Octane: 125,
  Petrol: 121,
  Diesel: 105,
  CNG: 43,
  LPG: 115,
  Electricity: 12,
};

function fileToDataUrl(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error("File must be 8 MB or smaller."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function getDaysRemaining(dateStr?: string): { days: number; label: string; tone: "ok" | "warn" | "danger" } {
  if (!dateStr) return { days: 9999, label: "No expiry set", tone: "ok" };
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { days: diff, label: `Expired ${Math.abs(diff)} days ago`, tone: "danger" };
  }
  if (diff <= 30) {
    return { days: diff, label: `Expires in ${diff} days`, tone: "warn" };
  }
  return { days: diff, label: `Valid (${diff} days left)`, tone: "ok" };
}

export function VehicleDetailsPage() {
  const { vehicleId = "" } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<Vehicle>();
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Tabs: fuel, maintenance, documents, warranties, overview
  const [activeTab, setActiveTab] = useState<
    "fuel" | "maintenance" | "documents" | "warranties" | "overview"
  >("fuel");

  // Document modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docPresetSelected, setDocPresetSelected] = useState<{
    name: string;
    category: BangladeshDocType;
  }>({ name: "", category: "Custom Document" });
  const [customDocName, setCustomDocName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docNotes, setDocNotes] = useState("");

  // Document modal reminder state (Upload)
  const [docReminderWhatsapp, setDocReminderWhatsapp] = useState(false);
  const [docReminderLead, setDocReminderLead] = useState("15 days before");
  const [docCustomLeadMinutes, setDocCustomLeadMinutes] = useState(15);
  const [docCustomLeadUnit, setDocCustomLeadUnit] = useState<"minutes" | "hours" | "days">("days");
  const [docDueTime, setDocDueTime] = useState("09:00");
  const [docRecipients, setDocRecipients] = useState<string[]>(["Personal"]);

  // Document Edit modal state
  const [editingDoc, setEditingDoc] = useState<VehicleDocument | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocCategory, setEditDocCategory] = useState<BangladeshDocType>("Tax Token");
  const [editDocNumber, setEditDocNumber] = useState("");
  const [editDocIssueDate, setEditDocIssueDate] = useState("");
  const [editDocExpiryDate, setEditDocExpiryDate] = useState("");
  const [editDocNotes, setEditDocNotes] = useState("");
  const [editDocReminderWhatsapp, setEditDocReminderWhatsapp] = useState(true);
  const [editDocReminderLead, setEditDocReminderLead] = useState("15 days before");
  const [editDocCustomLeadMinutes, setEditDocCustomLeadMinutes] = useState(15);
  const [editDocCustomLeadUnit, setEditDocCustomLeadUnit] = useState<"minutes" | "hours" | "days">("days");
  const [editDocDueTime, setEditDocDueTime] = useState("09:00");
  const [editDocRecipients, setEditDocRecipients] = useState<string[]>(["Personal"]);
  const [isUpdatingDoc, setIsUpdatingDoc] = useState(false);

  // Document manual WhatsApp sending state
  const [sendingDocId, setSendingDocId] = useState<string | null>(null);
  const [sentDocSuccessId, setSentDocSuccessId] = useState<string | null>(null);

  // Document custom delete confirmation state
  const [docToDelete, setDocToDelete] = useState<VehicleDocument | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Auto-extracted vehicle specifications state
  const [specExtractionError, setSpecExtractionError] = useState("");
  const [specsConfirmed, setSpecsConfirmed] = useState(false);
  const [extractedSpecs, setExtractedSpecs] = useState<ExtractedVehicleSpecs | null>(null);
  const [isExtractingSpecs, setIsExtractingSpecs] = useState(false);
  const [isApplyingSpecs, setIsApplyingSpecs] = useState(false);
  const [specsAppliedSuccess, setSpecsAppliedSuccess] = useState(false);
  const [specEngineNo, setSpecEngineNo] = useState("");
  const [specChassisNo, setSpecChassisNo] = useState("");
  const [specCC, setSpecCC] = useState("");
  const [specFuel, setSpecFuel] = useState("");
  const [specSeats, setSpecSeats] = useState("");
  const [specYear, setSpecYear] = useState("");
  const [specColor, setSpecColor] = useState("");
  const [specRegNo, setSpecRegNo] = useState("");
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editSpecsModalOpen, setEditSpecsModalOpen] = useState(false);

  // Universal Document Viewer modal state
  const [viewingDoc, setViewingDoc] = useState<ViewableDocument | null>(null);

  // Warranty modal state
  const [warrantyModalOpen, setWarrantyModalOpen] = useState(false);
  const [warrantyProduct, setWarrantyProduct] = useState("");
  const [warrantySeller, setWarrantySeller] = useState("");
  const [warrantyPurchaseDate, setWarrantyPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyItem["status"]>("ACTIVE");
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [warrantyNotes, setWarrantyNotes] = useState("");

  // Maintenance form receipt scan feedback
  const [scannedExtraction, setScannedExtraction] = useState<{
    workshopName?: string;
    cost?: number;
    serviceDate?: string;
    detectedServiceType?: string;
    description?: string;
  } | null>(null);
  const [maintenanceServiceType, setMaintenanceServiceType] = useState("Mobil change");
  const [maintenanceCustomType, setMaintenanceCustomType] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState<number | "">("");
  const [maintenanceDate, setMaintenanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [maintenanceMileage, setMaintenanceMileage] = useState<number | "">("");
  const [maintenanceWorkshop, setMaintenanceWorkshop] = useState("");
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [maintenanceNextDate, setMaintenanceNextDate] = useState("");
  const [maintenanceFile, setMaintenanceFile] = useState<File | null>(null);

  // Fuel form state
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split("T")[0]);
  const [fuelMileage, setFuelMileage] = useState<number | "">("");
  const [fuelAmount, setFuelAmount] = useState<number | "">("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number | "">(125);
  const [fuelLiters, setFuelLiters] = useState<number | "">("");
  const [fuelType, setFuelType] = useState("Octane");
  const [fuelNotes, setFuelNotes] = useState("");

  // Fuel editing state
  const [editingFuel, setEditingFuel] = useState<VehicleExpense | null>(null);
  const [editFuelDate, setEditFuelDate] = useState("");
  const [editFuelMileage, setEditFuelMileage] = useState<number | "">("");
  const [editFuelAmount, setEditFuelAmount] = useState<number | "">("");
  const [editFuelPricePerLiter, setEditFuelPricePerLiter] = useState<number | "">("");
  const [editFuelLiters, setEditFuelLiters] = useState<number | "">("");
  const [editFuelType, setEditFuelType] = useState("Octane");
  const [editFuelNotes, setEditFuelNotes] = useState("");
  const [isUpdatingFuel, setIsUpdatingFuel] = useState(false);

  // Fuel delete confirmation state
  const [fuelToDelete, setFuelToDelete] = useState<VehicleExpense | null>(null);
  const [isDeletingFuel, setIsDeletingFuel] = useState(false);

  // Maintenance service edit & delete states
  const [editingService, setEditingService] = useState<VehicleService | null>(null);
  const [editServiceDate, setEditServiceDate] = useState("");
  const [editServiceMileage, setEditServiceMileage] = useState<number | "">("");
  const [editServiceCost, setEditServiceCost] = useState<number | "">("");
  const [editServiceType, setEditServiceType] = useState("");
  const [editServiceWorkshop, setEditServiceWorkshop] = useState("");
  const [editServiceDescription, setEditServiceDescription] = useState("");
  const [editServiceNextDate, setEditServiceNextDate] = useState("");
  const [isUpdatingService, setIsUpdatingService] = useState(false);

  const [serviceToDelete, setServiceToDelete] = useState<VehicleService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listVehicles(),
      listVehicleExpenses(vehicleId),
      listVehicleServices(vehicleId),
      listVehicleDocuments(vehicleId),
      listWarrantiesForVehicle(vehicleId),
    ])
      .then(([vehicles, nextExpenses, nextServices, nextDocs, nextWarranties]) => {
        const found = vehicles.find((item) => item.id === vehicleId);
        if (!found) throw new Error("Vehicle record not found.");
        setVehicle(found);
        setExpenses(nextExpenses);
        setServices(nextServices);
        setDocuments(nextDocs);
        setWarranties(nextWarranties);
        if (found.mileage) {
          setMaintenanceMileage(found.mileage);
          setFuelMileage(found.mileage);
        }
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load vehicle profile.",
        ),
      )
      .finally(() => setLoading(false));
  }, [vehicleId]);

  // Aggregate Calculations
  const fuelExpenses = useMemo(
    () => expenses.filter((item) => item.category === "Fuel"),
    [expenses],
  );
  const totalFuelCost = useMemo(
    () => sumMoney(fuelExpenses.map(item => Number(item.amount))),
    [fuelExpenses],
  );
  const totalFuelLiters = useMemo(
    () => fuelExpenses.reduce((sum, item) => sum + (Number(item.fuelLiters) || 0), 0),
    [fuelExpenses],
  );
  const totalMaintenanceCost = useMemo(
    () => sumMoney(services.map(item => Number(item.cost))),
    [services],
  );
  const totalCombinedExpense = sumMoney([...expenses.map(item => Number(item.amount)), totalMaintenanceCost]);

  // Active Warranties & Claims Highlight stats
  const activeWarrantiesCount = useMemo(
    () => warranties.filter((w) => w.status === "ACTIVE").length,
    [warranties],
  );
  const claimsInProgress = useMemo(
    () =>
      warranties.filter(
        (w) =>
          w.status === "CLAIMED" ||
          (w.notes || "").toLowerCase().includes("claim"),
      ),
    [warranties],
  );

  // Expiring Document Warnings
  const expiringDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const status = getDaysRemaining(doc.expiryDate);
      return status.tone === "warn" || status.tone === "danger";
    });
  }, [documents]);

  const presetsForThisVehicle = useMemo(() => {
    if (!vehicle) return BD_DOC_PRESETS.Default;
    const t = (vehicle.type || "").toLowerCase();
    if (t.includes("bike") || t.includes("motorcycle")) return BD_DOC_PRESETS.Bike;
    if (t.includes("truck") || t.includes("commercial")) return BD_DOC_PRESETS.Commercial;
    return BD_DOC_PRESETS.Car;
  }, [vehicle]);

  const formatMoney = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;

  function formatTime12h(timeStr?: string) {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    let hh = parseInt(parts[0], 10);
    const mm = parts[1];
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${mm} ${ampm}`;
  }

  const docReminderPreviewText = useMemo(() => {
    if (!docExpiryDate) return null;
    const baseDate = new Date(docExpiryDate);
    if (docDueTime) {
      const [hh, mm] = docDueTime.split(":").map(Number);
      baseDate.setHours(hh, mm, 0, 0);
    } else {
      baseDate.setHours(9, 0, 0, 0);
    }
    if (isNaN(baseDate.getTime())) return null;

    const triggerDate = new Date(baseDate);
    if (docReminderLead === "custom") {
      const val = Number(docCustomLeadMinutes) || 0;
      if (docCustomLeadUnit === "minutes") triggerDate.setMinutes(triggerDate.getMinutes() - val);
      else if (docCustomLeadUnit === "hours") triggerDate.setHours(triggerDate.getHours() - val);
      else triggerDate.setDate(triggerDate.getDate() - val);
    } else if (docReminderLead === "On exact expiry date") {
      // 0 min
    } else if (docReminderLead === "1 day before") triggerDate.setDate(triggerDate.getDate() - 1);
    else if (docReminderLead === "3 days before") triggerDate.setDate(triggerDate.getDate() - 3);
    else if (docReminderLead === "7 days before") triggerDate.setDate(triggerDate.getDate() - 7);
    else if (docReminderLead === "15 days before") triggerDate.setDate(triggerDate.getDate() - 15);
    else if (docReminderLead === "30 days before") triggerDate.setDate(triggerDate.getDate() - 30);

    const timeStr = triggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = triggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [docExpiryDate, docDueTime, docReminderLead, docCustomLeadMinutes, docCustomLeadUnit]);

  const editDocReminderPreviewText = useMemo(() => {
    if (!editDocExpiryDate) return null;
    const baseDate = new Date(editDocExpiryDate);
    if (editDocDueTime) {
      const [hh, mm] = editDocDueTime.split(":").map(Number);
      baseDate.setHours(hh, mm, 0, 0);
    } else {
      baseDate.setHours(9, 0, 0, 0);
    }
    if (isNaN(baseDate.getTime())) return null;

    const triggerDate = new Date(baseDate);
    if (editDocReminderLead === "custom") {
      const val = Number(editDocCustomLeadMinutes) || 0;
      if (editDocCustomLeadUnit === "minutes") triggerDate.setMinutes(triggerDate.getMinutes() - val);
      else if (editDocCustomLeadUnit === "hours") triggerDate.setHours(triggerDate.getHours() - val);
      else triggerDate.setDate(triggerDate.getDate() - val);
    } else if (editDocReminderLead === "On exact expiry date") {
      // 0 min
    } else if (editDocReminderLead === "1 day before") triggerDate.setDate(triggerDate.getDate() - 1);
    else if (editDocReminderLead === "3 days before") triggerDate.setDate(triggerDate.getDate() - 3);
    else if (editDocReminderLead === "7 days before") triggerDate.setDate(triggerDate.getDate() - 7);
    else if (editDocReminderLead === "15 days before") triggerDate.setDate(triggerDate.getDate() - 15);
    else if (editDocReminderLead === "30 days before") triggerDate.setDate(triggerDate.getDate() - 30);

    const timeStr = triggerDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const dateStr = triggerDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `Notification triggers at ${timeStr} on ${dateStr}`;
  }, [editDocExpiryDate, editDocDueTime, editDocReminderLead, editDocCustomLeadMinutes, editDocCustomLeadUnit]);

  // Extended specs memo
  const parsedVehicleSpecs = useMemo(() => {
    if (!vehicle) return {};
    const fromNotes = parseVehicleSpecsFromNotes(vehicle.notes);
    return {
      cubicCapacity: vehicle.cubicCapacity || fromNotes.cubicCapacity,
      fuelType: vehicle.fuelType || fromNotes.fuelType,
      seatingCapacity: vehicle.seatingCapacity || fromNotes.seatingCapacity,
    };
  }, [vehicle]);

  const handleCopySpec = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDocFileChange = async (file: File) => {
    setDocFile(file);
    setExtractedSpecs(null);
    setSpecExtractionError("");
    setSpecsConfirmed(false);
    setIsExtractingSpecs(true);
    setSpecsAppliedSuccess(false);
    try {
      const extracted = await extractVehicleSpecsFromDocument(file, vehicle);
      setExtractedSpecs(extracted);
      setSpecEngineNo(extracted.engineNumber || vehicle?.engineNumber || "");
      setSpecChassisNo(extracted.chassisNumber || vehicle?.chassisNumber || "");
      setSpecCC(extracted.cubicCapacity || vehicle?.cubicCapacity || "");
      setSpecFuel(extracted.fuelType || vehicle?.fuelType || "");
      setSpecSeats(extracted.seatingCapacity || vehicle?.seatingCapacity || "");
      setSpecYear(extracted.manufacturingYear ? String(extracted.manufacturingYear) : vehicle?.year ? String(vehicle.year) : "");
      setSpecColor(extracted.color || vehicle?.color || "");
      setSpecRegNo(extracted.registrationNumber || vehicle?.registrationNumber || "");

      if (!docNumber && extracted.documentNumber) {
        setDocNumber(extracted.documentNumber);
      }
      if (!docExpiryDate && extracted.expiryDate) {
        setDocExpiryDate(extracted.expiryDate);
      }
    } catch (err) {
      setSpecExtractionError(err instanceof Error ? err.message : "Could not read vehicle details.");
    } finally {
      setIsExtractingSpecs(false);
    }
  };

  const handleEditDocFileChange = async (file: File) => {
    setEditDocFile(file);
    setExtractedSpecs(null);
    setSpecExtractionError("");
    setSpecsConfirmed(false);
    setIsExtractingSpecs(true);
    setSpecsAppliedSuccess(false);
    try {
      const extracted = await extractVehicleSpecsFromDocument(file, vehicle);
      setExtractedSpecs(extracted);
      setSpecEngineNo(extracted.engineNumber || vehicle?.engineNumber || "");
      setSpecChassisNo(extracted.chassisNumber || vehicle?.chassisNumber || "");
      setSpecCC(extracted.cubicCapacity || vehicle?.cubicCapacity || "");
      setSpecFuel(extracted.fuelType || vehicle?.fuelType || "");
      setSpecSeats(extracted.seatingCapacity || vehicle?.seatingCapacity || "");
      setSpecYear(extracted.manufacturingYear ? String(extracted.manufacturingYear) : vehicle?.year ? String(vehicle.year) : "");
      setSpecColor(extracted.color || vehicle?.color || "");
      setSpecRegNo(extracted.registrationNumber || vehicle?.registrationNumber || "");

      if (!editDocNumber && extracted.documentNumber) {
        setEditDocNumber(extracted.documentNumber);
      }
      if (!editDocExpiryDate && extracted.expiryDate) {
        setEditDocExpiryDate(extracted.expiryDate);
      }
    } catch (err) {
      setSpecExtractionError(err instanceof Error ? err.message : "Could not read vehicle details.");
    } finally {
      setIsExtractingSpecs(false);
    }
  };

  const handleAutoExtractFromExistingDocs = async () => {
    if (!vehicle) return;
    setExtractedSpecs(null);
    setSpecExtractionError("");
    setSpecsConfirmed(false);
    setIsExtractingSpecs(true);
    try {
      const bestDoc = documents.find(d => /smart|reg|blue|form/i.test(d.name + " " + (d.category || "")))
        || documents.find(d => /fitness|tax|token/i.test(d.name + " " + (d.category || "")))
        || documents.find(d => d.fileName || d.documentNumber)
        || documents[0];

      if (!bestDoc?.fileUrl) throw new Error("No readable document attached. Enter specifications manually.");
      const response = await fetch(bestDoc.fileUrl);
      if (!response.ok) throw new Error("Could not read the document. Download it and attach it again.");
      const blob = await response.blob();
      const documentFile = new File([blob], bestDoc.fileName || bestDoc.name, { type: blob.type });
      const extracted = await extractVehicleSpecsFromDocument(documentFile, vehicle);
      setExtractedSpecs(extracted);
      if (extracted.engineNumber) setSpecEngineNo(extracted.engineNumber);
      if (extracted.chassisNumber) setSpecChassisNo(extracted.chassisNumber);
      if (extracted.cubicCapacity) setSpecCC(extracted.cubicCapacity);
      if (extracted.fuelType) setSpecFuel(extracted.fuelType);
      if (extracted.seatingCapacity) setSpecSeats(extracted.seatingCapacity);
      if (extracted.manufacturingYear) setSpecYear(String(extracted.manufacturingYear));
      if (extracted.color) setSpecColor(extracted.color);
      if (extracted.registrationNumber) setSpecRegNo(extracted.registrationNumber);
    } catch (err) {
      setSpecExtractionError(err instanceof Error ? err.message : "Could not read vehicle details.");
    } finally {
      setIsExtractingSpecs(false);
    }
  };

  const openEditSpecsModal = (autoScan = false) => {
    if (!vehicle) return;
    setSpecsAppliedSuccess(false);
    setSpecEngineNo(vehicle.engineNumber || "");
    setSpecChassisNo(vehicle.chassisNumber || "");
    setSpecCC(parsedVehicleSpecs.cubicCapacity || "");
    setSpecFuel(parsedVehicleSpecs.fuelType || "");
    setSpecSeats(parsedVehicleSpecs.seatingCapacity || "");
    setSpecYear(vehicle.year ? String(vehicle.year) : "");
    setSpecColor(vehicle.color || "");
    setSpecRegNo(vehicle.registrationNumber || "");
    setEditSpecsModalOpen(true);

    if (autoScan) {
      handleAutoExtractFromExistingDocs();
    }
  };

  const handleConfirmVehicleSpecs = async () => {
    if (!vehicle) return;
    setIsApplyingSpecs(true);
    try {
      const updates = {
        engineNumber: specEngineNo.trim(),
        chassisNumber: specChassisNo.trim(),
        registrationNumber: specRegNo.trim() || vehicle.registrationNumber,
        year: specYear ? parseInt(specYear, 10) : vehicle.year,
        color: specColor.trim() || vehicle.color,
        cubicCapacity: specCC.trim(),
        fuelType: specFuel.trim(),
        seatingCapacity: specSeats.trim(),
      };

      const updated = await updateVehicle(vehicle.id, updates);
      setVehicle(updated);
      setSpecsAppliedSuccess(true);
      setTimeout(() => {
        setEditSpecsModalOpen(false);
        setSpecsAppliedSuccess(false);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle specifications.");
    } finally {
      setIsApplyingSpecs(false);
    }
  };

  // Dynamic calculation handlers for Fuel purchase
  const handleAmountChange = (valStr: string) => {
    if (valStr === "") {
      setFuelAmount("");
      return;
    }
    const val = Number(valStr);
    setFuelAmount(val);
    if (fuelPricePerLiter && Number(fuelPricePerLiter) > 0) {
      const calculatedLiters = Number((val / Number(fuelPricePerLiter)).toFixed(2));
      setFuelLiters(calculatedLiters);
    }
  };

  const handlePricePerLiterChange = (valStr: string) => {
    if (valStr === "") {
      setFuelPricePerLiter("");
      return;
    }
    const price = Number(valStr);
    setFuelPricePerLiter(price);
    if (price > 0 && fuelAmount && Number(fuelAmount) > 0) {
      const calculatedLiters = Number((Number(fuelAmount) / price).toFixed(2));
      setFuelLiters(calculatedLiters);
    } else if (price > 0 && fuelLiters && Number(fuelLiters) > 0) {
      const calculatedAmount = Math.round(Number(fuelLiters) * price);
      setFuelAmount(calculatedAmount);
    }
  };

  const handleLitersChange = (valStr: string) => {
    if (valStr === "") {
      setFuelLiters("");
      return;
    }
    const liters = Number(valStr);
    setFuelLiters(liters);
    if (fuelPricePerLiter && Number(fuelPricePerLiter) > 0) {
      const calculatedAmount = Math.round(liters * Number(fuelPricePerLiter));
      setFuelAmount(calculatedAmount);
    } else if (fuelAmount && Number(fuelAmount) > 0 && liters > 0) {
      const calculatedPrice = Number((Number(fuelAmount) / liters).toFixed(2));
      setFuelPricePerLiter(calculatedPrice);
    }
  };

  const applyPresetRate = (rate: number) => {
    setFuelPricePerLiter(rate);
    if (fuelAmount && Number(fuelAmount) > 0) {
      const calculatedLiters = Number((Number(fuelAmount) / rate).toFixed(2));
      setFuelLiters(calculatedLiters);
    } else if (fuelLiters && Number(fuelLiters) > 0) {
      const calculatedAmount = Math.round(Number(fuelLiters) * rate);
      setFuelAmount(calculatedAmount);
    }
  };

  const handleFuelTypeSelect = (ft: string) => {
    const prevPreset = BD_FUEL_RATES[fuelType];
    setFuelType(ft);
    const newRate = BD_FUEL_RATES[ft];
    if (newRate && (!fuelPricePerLiter || fuelPricePerLiter === prevPreset)) {
      applyPresetRate(newRate);
    }
  };

  // 1. Handle Fuel Log Submission
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelAmount || !fuelMileage) {
      setError("Please specify fuel amount and current mileage.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const rateInfo = fuelPricePerLiter ? ` @ ৳${fuelPricePerLiter}/L` : "";
      const description = `${fuelType} fill-up${rateInfo}${fuelNotes ? ` · ${fuelNotes}` : ""}`;
      const created = await createVehicleExpense({
        vehicleId,
        date: fuelDate,
        category: "Fuel",
        amount: Number(fuelAmount),
        mileage: Number(fuelMileage),
        description,
        paymentMethod: "Cash/Card",
        fuelLiters: fuelLiters ? Number(fuelLiters) : undefined,
      });

      setExpenses((cur) => [created, ...cur]);
      setFuelAmount("");
      setFuelPricePerLiter(BD_FUEL_RATES[fuelType] || "");
      setFuelLiters("");
      setFuelNotes("");
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save fuel expense.");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Fuel modal & populate state
  const openEditFuelModal = (fuel: VehicleExpense) => {
    setEditingFuel(fuel);
    setEditFuelDate(fuel.date);
    setEditFuelMileage(fuel.mileage);
    setEditFuelAmount(fuel.amount);
    setEditFuelLiters(fuel.fuelLiters || "");

    let detectedType = "Octane";
    for (const ft of FUEL_TYPES) {
      if ((fuel.description || "").toLowerCase().includes(ft.toLowerCase())) {
        detectedType = ft;
        break;
      }
    }
    setEditFuelType(detectedType);

    const rateMatch = (fuel.description || "").match(/@\s*৳?(\d+(?:\.\d+)?)/);
    if (rateMatch) {
      setEditFuelPricePerLiter(Number(rateMatch[1]));
    } else if (fuel.amount > 0 && fuel.fuelLiters && fuel.fuelLiters > 0) {
      setEditFuelPricePerLiter(Number((fuel.amount / fuel.fuelLiters).toFixed(2)));
    } else {
      setEditFuelPricePerLiter(BD_FUEL_RATES[detectedType] || "");
    }

    const cleanedNotes = (fuel.description || "")
      .replace(new RegExp(`${detectedType}\\s*fill-up`, "i"), "")
      .replace(/@\s*৳?\d+(?:\.\d+)?(?:\/L)?/i, "")
      .replace(/^[·\s\-_]+|[·\s\-_]+$/g, "")
      .trim();
    setEditFuelNotes(cleanedNotes);
  };

  const handleEditFuelAmountChange = (valStr: string) => {
    if (valStr === "") {
      setEditFuelAmount("");
      return;
    }
    const val = Number(valStr);
    setEditFuelAmount(val);
    if (editFuelPricePerLiter && Number(editFuelPricePerLiter) > 0) {
      const calculatedLiters = Number((val / Number(editFuelPricePerLiter)).toFixed(2));
      setEditFuelLiters(calculatedLiters);
    }
  };

  const handleEditFuelPriceChange = (valStr: string) => {
    if (valStr === "") {
      setEditFuelPricePerLiter("");
      return;
    }
    const price = Number(valStr);
    setEditFuelPricePerLiter(price);
    if (price > 0 && editFuelAmount && Number(editFuelAmount) > 0) {
      const calculatedLiters = Number((Number(editFuelAmount) / price).toFixed(2));
      setEditFuelLiters(calculatedLiters);
    } else if (price > 0 && editFuelLiters && Number(editFuelLiters) > 0) {
      const calculatedAmount = Math.round(Number(editFuelLiters) * price);
      setEditFuelAmount(calculatedAmount);
    }
  };

  const handleEditFuelLitersChange = (valStr: string) => {
    if (valStr === "") {
      setEditFuelLiters("");
      return;
    }
    const liters = Number(valStr);
    setEditFuelLiters(liters);
    if (editFuelPricePerLiter && Number(editFuelPricePerLiter) > 0) {
      const calculatedAmount = Math.round(liters * Number(editFuelPricePerLiter));
      setEditFuelAmount(calculatedAmount);
    } else if (editFuelAmount && Number(editFuelAmount) > 0 && liters > 0) {
      const calculatedPrice = Number((Number(editFuelAmount) / liters).toFixed(2));
      setEditFuelPricePerLiter(calculatedPrice);
    }
  };

  const applyEditFuelPresetRate = (rate: number) => {
    setEditFuelPricePerLiter(rate);
    if (editFuelAmount && Number(editFuelAmount) > 0) {
      const calculatedLiters = Number((Number(editFuelAmount) / rate).toFixed(2));
      setEditFuelLiters(calculatedLiters);
    } else if (editFuelLiters && Number(editFuelLiters) > 0) {
      const calculatedAmount = Math.round(Number(editFuelLiters) * rate);
      setEditFuelAmount(calculatedAmount);
    }
  };

  const handleEditFuelTypeSelect = (ft: string) => {
    const prevPreset = BD_FUEL_RATES[editFuelType];
    setEditFuelType(ft);
    const newRate = BD_FUEL_RATES[ft];
    if (newRate && (!editFuelPricePerLiter || editFuelPricePerLiter === prevPreset)) {
      applyEditFuelPresetRate(newRate);
    }
  };

  const handleUpdateFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFuel || !editFuelAmount || !editFuelMileage) {
      setError("Please specify fuel amount and current mileage.");
      return;
    }
    setIsUpdatingFuel(true);
    setError("");
    try {
      const rateInfo = editFuelPricePerLiter ? ` @ ৳${editFuelPricePerLiter}/L` : "";
      const description = `${editFuelType} fill-up${rateInfo}${editFuelNotes ? ` · ${editFuelNotes}` : ""}`;
      const updated = await updateVehicleExpense(editingFuel.id, {
        date: editFuelDate,
        amount: Number(editFuelAmount),
        mileage: Number(editFuelMileage),
        description,
        fuelLiters: editFuelLiters ? Number(editFuelLiters) : undefined,
      });

      setExpenses((cur) => cur.map((item) => (item.id === updated.id ? updated : item)));
      setEditingFuel(null);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not update fuel expense.");
    } finally {
      setIsUpdatingFuel(false);
    }
  };

  const handleConfirmDeleteFuel = async () => {
    if (!fuelToDelete) return;
    setIsDeletingFuel(true);
    try {
      await deleteVehicleExpense(fuelToDelete.id);
      setExpenses((cur) => cur.filter((item) => item.id !== fuelToDelete.id));
      setFuelToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete fuel record.");
    } finally {
      setIsDeletingFuel(false);
    }
  };

  // Open Edit Service Modal & populate state
  const openEditServiceModal = (item: VehicleService) => {
    setEditingService(item);
    setEditServiceDate(item.serviceDate);
    setEditServiceMileage(item.mileageAtService);
    setEditServiceCost(item.cost);
    setEditServiceType(item.serviceType);
    setEditServiceWorkshop(item.workshopName || "");
    setEditServiceDescription(item.description || "");
    setEditServiceNextDate(item.nextServiceDate || "");
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || editServiceCost === "" || editServiceMileage === "") {
      setError("Please fill in the required fields (Date, Mileage, Cost).");
      return;
    }
    setIsUpdatingService(true);
    try {
      const updated = await updateVehicleService(editingService.id, {
        serviceDate: editServiceDate,
        mileageAtService: Number(editServiceMileage),
        cost: Number(editServiceCost),
        serviceType: editServiceType,
        workshopName: editServiceWorkshop,
        description: editServiceDescription,
        nextServiceDate: editServiceNextDate || undefined,
      });

      setServices((cur) => cur.map((s) => (s.id === updated.id ? updated : s)));

      if (vehicle && Number(editServiceMileage) > vehicle.mileage) {
        await updateVehicle(vehicle.id, { mileage: Number(editServiceMileage) });
        setVehicle((v) => (v ? { ...v, mileage: Number(editServiceMileage) } : undefined));
      }

      setEditingService(null);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not update service record.");
    } finally {
      setIsUpdatingService(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    try {
      await deleteVehicleService(serviceToDelete.id);
      setServices((cur) => cur.filter((item) => item.id !== serviceToDelete.id));
      setServiceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete service record.");
    } finally {
      setIsDeletingService(false);
    }
  };

  // 2. Handle Receipt Upload & Auto-Extract
  const handleMaintenanceReceiptChange = async (file: File) => {
    setMaintenanceFile(file);
    try {
      const extracted = await extractMaintenanceFromReceipt(file);
      setScannedExtraction(extracted);
      if (extracted.cost) setMaintenanceCost(extracted.cost);
      if (extracted.workshopName) setMaintenanceWorkshop(extracted.workshopName);
      if (extracted.serviceDate) setMaintenanceDate(extracted.serviceDate);
      if (extracted.detectedServiceType) {
        if (MAINTENANCE_PRESETS.includes(extracted.detectedServiceType)) {
          setMaintenanceServiceType(extracted.detectedServiceType);
        } else {
          setMaintenanceServiceType("Other");
          setMaintenanceCustomType(extracted.detectedServiceType);
        }
      }
      if (extracted.description) setMaintenanceDescription(extracted.description);
    } catch {}
  };

  // 3. Handle Maintenance Log Submission
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceCost || !maintenanceMileage) {
      setError("Please enter the total maintenance cost and mileage.");
      return;
    }
    const isOther = maintenanceServiceType === "Others" || maintenanceServiceType === "Other";
    if (isOther && !maintenanceCustomType.trim()) {
      setError("Please specify the custom service title.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const receiptUrl = maintenanceFile ? await fileToDataUrl(maintenanceFile) : undefined;
      const effectiveType =
        isOther && maintenanceCustomType.trim()
          ? maintenanceCustomType.trim()
          : maintenanceServiceType;

      const created = await createVehicleService({
        vehicleId,
        serviceType: effectiveType as ServiceType,
        serviceDate: maintenanceDate,
        mileageAtService: Number(maintenanceMileage),
        workshopName: maintenanceWorkshop.trim() || "Local Garage",
        workshopLocation: "",
        mechanicName: "",
        cost: Number(maintenanceCost),
        partsCost: 0,
        laborCost: 0,
        description: maintenanceDescription.trim() || `${effectiveType} performed`,
        notes: "",
        nextServiceDate: maintenanceNextDate || "",
        nextServiceMileage: 0,
        reminderEnabled: Boolean(maintenanceNextDate),
        receiptUrl,
      });

      setServices((cur) => [created, ...cur]);
      setMaintenanceCost("");
      setMaintenanceCustomType("");
      setMaintenanceDescription("");
      setMaintenanceWorkshop("");
      setMaintenanceNextDate("");
      setMaintenanceFile(null);
      setScannedExtraction(null);
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  // 4. Handle Document Add / Upload
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (docPresetSelected.name === "Custom Document" || !docPresetSelected.name)
      ? customDocName.trim()
      : docPresetSelected.name;

    if (!name) {
      setError("Please specify document title.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let finalNotes = docNotes.trim();
      if (docReminderWhatsapp && docExpiryDate) {
        const rawLead = docReminderLead === "custom"
          ? `${docCustomLeadMinutes} ${docCustomLeadUnit} before`
          : docReminderLead;
        const timeNote = docDueTime ? `, Due Time: ${formatTime12h(docDueTime)}` : "";
        const rec = docRecipients.length > 0 ? `, Recipients: ${docRecipients.join(", ")}` : "";
        finalNotes = `${finalNotes} [Reminder: ${rawLead}${timeNote}${rec}]`.trim();
      }

      const fileUrl = docFile ? await fileToDataUrl(docFile) : undefined;
      const created = await createVehicleDocument({
        vehicleId,
        name,
        category: docPresetSelected.category,
        documentNumber: docNumber.trim(),
        issueDate: docIssueDate || undefined,
        expiryDate: docExpiryDate || undefined,
        issuingAuthority: "BRTA Bangladesh",
        fileUrl,
        fileName: docFile?.name,
        fileType: docFile?.type || "pdf",
        notes: finalNotes,
      });

      setDocuments((cur) => [created, ...cur]);
      setDocModalOpen(false);
      setCustomDocName("");
      setDocNumber("");
      setDocExpiryDate("");
      setDocIssueDate("");
      setDocFile(null);
      setDocNotes("");
      setDocReminderLead("15 days before");
      setDocCustomLeadMinutes(15);
      setDocCustomLeadUnit("days");
      // Auto-persist extracted specs to vehicle if available
      if (vehicle && extractedSpecs && specsConfirmed && (specEngineNo || specChassisNo || specCC || specFuel)) {
        try {
          const specUpdates: Record<string, any> = {};
          if (specEngineNo && specEngineNo !== vehicle.engineNumber) specUpdates.engineNumber = specEngineNo.trim();
          if (specChassisNo && specChassisNo !== vehicle.chassisNumber) specUpdates.chassisNumber = specChassisNo.trim();
          if (specCC) specUpdates.cubicCapacity = specCC.trim();
          if (specFuel) specUpdates.fuelType = specFuel.trim();
          if (specSeats) specUpdates.seatingCapacity = specSeats.trim();
          if (specYear) specUpdates.year = parseInt(specYear, 10);
          if (specColor) specUpdates.color = specColor.trim();
          if (Object.keys(specUpdates).length > 0) {
            const updatedVeh = await updateVehicle(vehicle.id, specUpdates);
            setVehicle(updatedVeh);
          }
        } catch (specErr) {
          console.warn("Could not auto-save specs during document save:", specErr);
        }
      }

      checkAndDispatchDueReminders().catch(() => {});
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save document.");
    } finally {
      setSaving(false);
    }
  };

  const openEditDocModal = (doc: VehicleDocument) => {
    setExtractedSpecs(null); setSpecExtractionError(""); setSpecsConfirmed(false);
    setEditingDoc(doc);
    setEditDocName(doc.name);
    setEditDocCategory((doc.category as BangladeshDocType) || "Tax Token");
    setEditDocNumber(doc.documentNumber || "");
    setEditDocIssueDate(doc.issueDate || "");
    setEditDocExpiryDate(doc.expiryDate || "");

    const cleanNotes = (doc.notes || "").replace(/\s*\[Reminder:[^\]]+\]/gi, "").trim();
    setEditDocNotes(cleanNotes);

    const hasReminder = Boolean(doc.notes && /\[Reminder:[^\]]+\]/i.test(doc.notes));
    setEditDocReminderWhatsapp(hasReminder || Boolean(doc.expiryDate));

    const minutes = parseLeadMinutes(doc.notes);
    if (minutes === 0) setEditDocReminderLead("On exact expiry date");
    else if (minutes === 1440) setEditDocReminderLead("1 day before");
    else if (minutes === 4320) setEditDocReminderLead("3 days before");
    else if (minutes === 10080) setEditDocReminderLead("7 days before");
    else if (minutes === 21600) setEditDocReminderLead("15 days before");
    else if (minutes === 43200) setEditDocReminderLead("30 days before");
    else {
      setEditDocReminderLead("custom");
      setEditDocCustomLeadMinutes(Math.round(minutes / 1440) || minutes || 15);
      setEditDocCustomLeadUnit(minutes >= 1440 ? "days" : minutes >= 60 ? "hours" : "minutes");
    }

    const timeMatch = doc.notes?.match(/Due Time:\s*([^,\]\n]+)/i);
    setEditDocDueTime(timeMatch ? timeMatch[1] : "09:00");

    const recMatch = doc.notes?.match(/Recipients:\s*([^\]\n]+)/i);
    if (recMatch) {
      const parsed = recMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      setEditDocRecipients(parsed.length > 0 ? parsed : ["Personal"]);
    } else {
      setEditDocRecipients(["Personal"]);
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setIsUpdatingDoc(true);
    setError("");

    try {
      let finalNotes = editDocNotes.trim();
      if (editDocReminderWhatsapp && editDocExpiryDate) {
        const rawLead = editDocReminderLead === "custom"
          ? `${editDocCustomLeadMinutes} ${editDocCustomLeadUnit} before`
          : editDocReminderLead;
        const timeNote = editDocDueTime ? `, Due Time: ${formatTime12h(editDocDueTime)}` : "";
        const rec = editDocRecipients.length > 0 ? `, Recipients: ${editDocRecipients.join(", ")}` : "";
        finalNotes = `${finalNotes} [Reminder: ${rawLead}${timeNote}${rec}]`.trim();
      }

      const updated = await updateVehicleDocument(vehicleId, editingDoc.id, {
        name: editDocName.trim(),
        category: editDocCategory,
        documentNumber: editDocNumber.trim() || undefined,
        issueDate: editDocIssueDate || undefined,
        expiryDate: editDocExpiryDate || undefined,
        notes: finalNotes,
      });

      localStorage.removeItem(`lifenest_vehdoc_dispatched_${editingDoc.id}`);
      setDocuments((cur) => cur.map((d) => (d.id === updated.id ? updated : d)));
      // Auto-persist extracted specs to vehicle if available
      if (vehicle && extractedSpecs && specsConfirmed && (specEngineNo || specChassisNo || specCC || specFuel)) {
        try {
          const specUpdates: Record<string, any> = {};
          if (specEngineNo && specEngineNo !== vehicle.engineNumber) specUpdates.engineNumber = specEngineNo.trim();
          if (specChassisNo && specChassisNo !== vehicle.chassisNumber) specUpdates.chassisNumber = specChassisNo.trim();
          if (specCC) specUpdates.cubicCapacity = specCC.trim();
          if (specFuel) specUpdates.fuelType = specFuel.trim();
          if (specSeats) specUpdates.seatingCapacity = specSeats.trim();
          if (specYear) specUpdates.year = parseInt(specYear, 10);
          if (specColor) specUpdates.color = specColor.trim();
          if (Object.keys(specUpdates).length > 0) {
            const updatedVeh = await updateVehicle(vehicle.id, specUpdates);
            setVehicle(updatedVeh);
          }
        } catch (specErr) {
          console.warn("Could not auto-save specs during document update:", specErr);
        }
      }

      checkAndDispatchDueReminders().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update document.");
    } finally {
      setIsUpdatingDoc(false);
    }
  };

  const handleSendDocWhatsApp = async (doc: VehicleDocument) => {
    setSendingDocId(doc.id);
    try {
      const res = await dispatchVehicleDocReminderNow(doc, vehicle);
      if (res.success) {
        setSentDocSuccessId(doc.id);
        setTimeout(() => setSentDocSuccessId(null), 3000);
      } else {
        alert(res.error || "WhatsApp gateway could not deliver alert. Check connection.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to dispatch WhatsApp alert");
    } finally {
      setSendingDocId(null);
    }
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    try {
      await deleteVehicleDocument(vehicleId, docToDelete.id);
      setDocuments((cur) => cur.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // 5. Handle Warranty / Claim Add
  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyProduct || !warrantySeller) {
      setError("Please provide product/component name and seller.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const receiptUrl = warrantyFile ? await fileToDataUrl(warrantyFile) : undefined;
      const pDate = new Date(warrantyPurchaseDate);
      pDate.setMonth(pDate.getMonth() + Number(warrantyMonths));
      const calculatedExpiry = pDate.toISOString().split("T")[0];

      const created = await createWarranty({
        productName: warrantyProduct.trim(),
        category: "Vehicle Component",
        seller: warrantySeller.trim(),
        purchaseDate: warrantyPurchaseDate,
        warrantyDurationMonths: Number(warrantyMonths),
        expiryDate: calculatedExpiry,
        status: warrantyStatus,
        purchasePrice: 0,
        serialNumber: "",
        invoiceNumber: "",
        receiptUrl,
        relatedAssetType: "vehicle",
        relatedAssetId: vehicleId,
        notes: warrantyNotes.trim(),
      });

      setWarranties((cur) => [created, ...cur]);
      setWarrantyModalOpen(false);
      setWarrantyProduct("");
      setWarrantySeller("");
      setWarrantyFile(null);
      setWarrantyNotes("");
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save warranty.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        <p className="text-xs font-medium text-slate-500">Loading vehicle profile...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Vehicle Not Found</h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          {error || "The requested vehicle record could not be found or has been removed."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/assets/vehicles")}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
        >
          Back to All Vehicles
        </button>
      </div>
    );
  }

  const VehicleIcon = getVehicleIcon(vehicle.type);

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/assets/vehicles")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Vehicles
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800">
              <VehicleBrandLogo brand={vehicle.brand} type={vehicle.type} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  {vehicle.name}
                </h1>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getVehicleTypeBadgeClass(
                    vehicle.type,
                  )}`}
                >
                  {vehicle.type}
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700 border border-emerald-200/50">
                  {vehicle.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber || "Unregistered"} · {vehicle.year}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDocPresetSelected({ name: "", category: "Custom Document" });
              setExtractedSpecs(null); setSpecExtractionError(""); setSpecsConfirmed(false);
              setDocModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" /> Add Document
          </button>
          <button
            type="button"
            onClick={() => setWarrantyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Warranty & Claim
          </button>
        </div>
      </div>

      {/* Setup banner for database */}
      <SqlSetupBanner error={error} />

      {/* Critical Alert Banners (Highlighted Claims / Expiring Tax Token & Fitness) */}
      {claimsInProgress.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 shadow-2xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold">Active Warranty Claim Highlighted:</span>{" "}
            You have {claimsInProgress.length} component claim(s) in progress (
            {claimsInProgress.map((c) => c.productName).join(", ")}).
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("warranties")}
            className="shrink-0 text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
          >
            View Claim
          </button>
        </div>
      )}

      {expiringDocs.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 shadow-2xs text-rose-900 flex items-start gap-2.5">
          <Clock className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold">BRTA Document Attention:</span>{" "}
            {expiringDocs.map((d) => `${d.name} (${getDaysRemaining(d.expiryDate).label})`).join(", ")}.
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className="shrink-0 text-xs font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
          >
            View Documents
          </button>
        </div>
      )}

      {/* Highlighted Cost & Compliance Metric Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Fuel Expense</span>
            <Fuel className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalFuelCost)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalFuelLiters > 0 ? `${totalFuelLiters.toFixed(1)} L recorded` : `${fuelExpenses.length} fill-ups`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Maintenance</span>
            <Wrench className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalMaintenanceCost)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {services.length} servicing / repair records
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Vehicle Cost</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {formatMoney(totalCombinedExpense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Fuel + repairs + all bills
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">BRTA Papers & Warranties</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {documents.length} Papers · {activeWarrantiesCount} Warranties
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {claimsInProgress.length > 0 ? `${claimsInProgress.length} active claims` : "All papers up to date"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200/80">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("fuel")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "fuel"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Fuel className="h-3.5 w-3.5" />
            <span>Fuel & Gas</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
              {fuelExpenses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("maintenance")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "maintenance"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Repairs & Servicing</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
              {services.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "documents"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            <span>Vehicle Papers (BRTA)</span>
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.2 text-[10px] font-mono font-bold text-indigo-700 border border-indigo-200/60">
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("warranties")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "warranties"
                ? "border-amber-600 text-amber-800 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>Warranty Cards</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                claimsInProgress.length > 0
                  ? "bg-amber-100 text-amber-900 animate-pulse border border-amber-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {warranties.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-1.5 pb-2.5 pt-1 border-b-2 transition cursor-pointer ${
              activeTab === "overview"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <VehicleIcon className="h-3.5 w-3.5" />
            <span>Vehicle Details & Specs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FUEL CONSUMPTION                                                   */}
      {/* ========================================================================= */}
      {activeTab === "fuel" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Fuel Entry Form */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Record Fuel Purchase
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Track date, odometer mileage, and amount spent.
              </p>
            </div>

            <form onSubmit={handleSaveFuel} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Odometer Mileage (km) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45200"
                  value={fuelMileage}
                  onChange={(e) => setFuelMileage(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Amount Paid (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={fuelAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Per Liter Price (৳)
                    </label>
                    {BD_FUEL_RATES[fuelType] && (
                      <button
                        type="button"
                        onClick={() => applyPresetRate(BD_FUEL_RATES[fuelType])}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline decoration-dotted"
                        title={`Apply standard BD ${fuelType} rate (৳${BD_FUEL_RATES[fuelType]}/L)`}
                      >
                        ৳{BD_FUEL_RATES[fuelType]} BD
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${BD_FUEL_RATES[fuelType] || 125}`}
                    value={fuelPricePerLiter}
                    onChange={(e) => handlePricePerLiterChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Liters (Auto-Calculated)
                  </label>
                  {fuelAmount && fuelPricePerLiter && (
                    <span className="text-[10px] font-mono text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      ৳{fuelAmount} ÷ ৳{fuelPricePerLiter} = {fuelLiters || 0} L
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 40.00"
                    value={fuelLiters}
                    onChange={(e) => handleLitersChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-slate-800 focus:bg-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Fuel Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FUEL_TYPES.map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => handleFuelTypeSelect(ft)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                        fuelType === ft
                          ? "bg-slate-900 text-white font-semibold shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {ft}
                      {BD_FUEL_RATES[ft] && (
                        <span className="ml-1 text-[9px] opacity-75 font-mono">
                          ৳{BD_FUEL_RATES[ft]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Fuel Station / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Padma Oil, Banani Pump"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Add Fuel Entry"}
              </button>
            </form>
          </div>

          {/* Fuel History Table */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Fuel Purchase History
                </h2>
                <p className="text-[11px] text-slate-500">
                  Logged receipts, odometer readings, and consumption.
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-slate-900">
                {formatMoney(totalFuelCost)}
              </span>
            </div>

            {fuelExpenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
                <Fuel className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                No fuel purchases logged yet. Fill out the form on the left to add your first fuel entry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Odometer</th>
                      <th className="px-3 py-2">Details / Pump</th>
                      <th className="px-3 py-2 font-mono">Liters</th>
                      <th className="px-3 py-2 font-mono text-right">Amount</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fuelExpenses.map((fuel) => (
                      <tr key={fuel.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-600">
                          {fuel.date}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-800">
                          {fuel.mileage.toLocaleString()} km
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {fuel.description || "Fuel fill-up"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-600">
                          {fuel.fuelLiters ? (
                            <div>
                              <span>{fuel.fuelLiters} L</span>
                              {fuel.amount > 0 && fuel.fuelLiters > 0 && (
                                <span className="block text-[10px] text-slate-400">
                                  ৳{(fuel.amount / fuel.fuelLiters).toFixed(1)}/L
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono font-bold text-slate-900 text-right">
                          {formatMoney(fuel.amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => openEditFuelModal(fuel)}
                              className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit fuel entry"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFuelToDelete(fuel)}
                              className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Delete fuel entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MAINTENANCE & SERVICING (WITH AUTO-EXTRACT FROM RECEIPT)          */}
      {/* ========================================================================= */}
      {activeTab === "maintenance" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Maintenance Entry Form */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Log Maintenance / Servicing
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Attach receipt or bill to automatically extract workshop details & cost.
              </p>
            </div>

            {/* Smart Bill / Document Upload & Extraction */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Bill / Memo Scanner
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">Auto-Extracts Details</span>
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-indigo-200 bg-white p-3 hover:bg-indigo-50/50 transition">
                <Upload className="h-4 w-4 text-indigo-500 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700">
                  {maintenanceFile ? maintenanceFile.name : "Upload Receipt / Invoice (Image or PDF)"}
                </span>
                <span className="text-[10px] text-slate-400">
                  Scans Mobil change, brake pads, workshop name & cost
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleMaintenanceReceiptChange(f);
                  }}
                />
              </label>

              {scannedExtraction && (
                <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[11px] text-emerald-800">
                  <div className="font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Details Extracted from Bill:
                  </div>
                  <div className="mt-0.5 text-[10px] text-emerald-700">
                    {scannedExtraction.detectedServiceType} · {scannedExtraction.workshopName} · {scannedExtraction.cost ? `৳${scannedExtraction.cost}` : "Amount detected"}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Service / Maintenance Type *
                </label>
                <select
                  value={maintenanceServiceType}
                  onChange={(e) => setMaintenanceServiceType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                >
                  {MAINTENANCE_PRESETS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {(maintenanceServiceType === "Others" || maintenanceServiceType === "Other") && (
                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/50 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Wrench className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Other Service Details</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Service Title / Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chain sprocket change, Fuel pump repair, Radiator flush"
                      value={maintenanceCustomType}
                      onChange={(e) => setMaintenanceCustomType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Service Details / Work Done *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Replaced worn sprocket, adjusted chain tension, lubricated with high-grade chain wax"
                      value={maintenanceDescription}
                      onChange={(e) => setMaintenanceDescription(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={maintenanceDate}
                    onChange={(e) => setMaintenanceDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mileage (km) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45200"
                    value={maintenanceMileage}
                    onChange={(e) =>
                      setMaintenanceMileage(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Total Cost (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500"
                    value={maintenanceCost}
                    onChange={(e) =>
                      setMaintenanceCost(e.target.value ? Number(e.target.value) : "")
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Workshop / Garage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Navana, Rahimafrooz"
                    value={maintenanceWorkshop}
                    onChange={(e) => setMaintenanceWorkshop(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              {maintenanceServiceType !== "Others" && maintenanceServiceType !== "Other" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Work Done / Replaced Parts (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 4L Mobil 1 5W-30 + OEM Oil filter replaced"
                    value={maintenanceDescription}
                    onChange={(e) => setMaintenanceDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Next Service Due (Optional)
                </label>
                <input
                  type="date"
                  value={maintenanceNextDate}
                  onChange={(e) => setMaintenanceNextDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Maintenance Record"}
              </button>
            </form>
          </div>

          {/* Maintenance Records List */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Maintenance History
                </h2>
                <p className="text-[11px] text-slate-500">
                  Track all periodic servicing, oil changes, parts replacements, and attached bills.
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-slate-900">
                {formatMoney(totalMaintenanceCost)}
              </span>
            </div>

            {services.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
                <Wrench className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                No maintenance records yet. Attach a bill or log your first Mobil/service entry on the left.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5">Date & Mileage</th>
                      <th className="px-3 py-2.5">Service Type</th>
                      <th className="px-3 py-2.5">Workshop</th>
                      <th className="px-3 py-2.5">Work Done / Next Due</th>
                      <th className="px-3 py-2.5 font-mono text-right">Cost</th>
                      <th className="px-3 py-2.5 text-center">Bill</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <div className="font-mono text-[11px] font-semibold text-slate-800">
                            {item.serviceDate}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {item.mileageAtService.toLocaleString()} km
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/60 whitespace-nowrap">
                            {item.serviceType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {item.workshopName || "Workshop"}
                          </div>
                          {(item.mechanicName || item.workshopLocation) && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {[item.mechanicName, item.workshopLocation].filter(Boolean).join(" • ")}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <div className="text-slate-700 text-[11px] line-clamp-2">
                            {item.description || "Service completed"}
                          </div>
                          {item.nextServiceDate ? (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                              <Clock className="h-2.5 w-2.5 text-amber-600" />
                              <span>Next: {item.nextServiceDate}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Regular servicing</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono font-bold text-slate-900 text-right">
                          {formatMoney(item.cost)}
                          {item.partsCost > 0 || item.laborCost > 0 ? (
                            <div className="text-[10px] text-slate-400 font-normal">
                              P: {formatMoney(item.partsCost)} | L: {formatMoney(item.laborCost)}
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-center">
                          {item.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingDoc({
                                  name: `${item.serviceType || "Maintenance"} Bill`,
                                  fileUrl: item.receiptUrl,
                                  fileType: "pdf",
                                  category: "Maintenance Receipt",
                                })
                              }
                              className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                              title="View Attached Bill"
                            >
                              <FileText className="h-3 w-3" /> Bill
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => openEditServiceModal(item)}
                              className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit service entry"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setServiceToDelete(item)}
                              className="rounded p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Delete service entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BANGLADESH VEHICLE DOCUMENTS (TAX TOKEN, SMART CARD, LICENSE, ETC.) */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {/* Presets & Quick Add Bar */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-blue-50/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-indigo-600" />
                  Car Papers & BRTA Documents
                </h2>
                <p className="text-[11px] text-indigo-700/80 mt-0.5">
                  Save your Tax Token, Smart Registration Card, Driving License, and Fitness Certificate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocPresetSelected({ name: "", category: "Custom Document" });
                  setExtractedSpecs(null); setSpecExtractionError(""); setSpecsConfirmed(false);
              setDocModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-800 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> + Upload Other Document
              </button>
            </div>

            {/* Presets Checklist / Quick Upload Shortcuts */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {presetsForThisVehicle.map((preset) => {
                const existing = documents.find(
                  (d) =>
                    d.category === preset.category ||
                    d.name.toLowerCase().includes(preset.name.toLowerCase()),
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setDocPresetSelected({
                        name: preset.name,
                        category: preset.category,
                      });
                      setExtractedSpecs(null); setSpecExtractionError(""); setSpecsConfirmed(false);
              setDocModalOpen(true);
                    }}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      existing
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-2xs"
                        : "border-slate-200/90 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {existing ? "Added" : "Required"}
                      </span>
                      {existing ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="text-xs font-bold leading-tight">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uploaded Documents Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Saved Vehicle Papers ({documents.length} files)
              </h3>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">No documents uploaded for this vehicle yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click on any paper above or "+ Upload Other Document" to save your Tax Token, Smart Card, or Driving License.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => {
                  const expiryInfo = getDaysRemaining(doc.expiryDate);
                  const reminderMatch = doc.notes?.match(/\[Reminder:\s*([^\]]+)\]/i);
                  const cleanNotes = (doc.notes || "").replace(/\s*\[Reminder:[^\]]+\]/gi, "").trim();

                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                              {doc.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                              {doc.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDocModal(doc)}
                              className="rounded p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                              title="Edit document & notification options"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDocToDelete(doc)}
                              className="rounded p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer"
                              title="Delete document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {doc.documentNumber && (
                          <div className="mt-2 font-mono text-[11px] text-slate-600">
                            No: <strong className="text-slate-800">{doc.documentNumber}</strong>
                          </div>
                        )}

                        <div className="mt-2.5 space-y-1 text-[11px]">
                          {doc.issueDate && (
                            <div className="text-slate-500">
                              Issued: <span className="font-mono">{doc.issueDate}</span>
                            </div>
                          )}
                          {doc.expiryDate && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Expiry:</span>
                              <span
                                className={`font-mono font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                                  expiryInfo.tone === "danger"
                                    ? "bg-rose-100 text-rose-800"
                                    : expiryInfo.tone === "warn"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {expiryInfo.label}
                              </span>
                            </div>
                          )}
                          {cleanNotes && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              {cleanNotes}
                            </div>
                          )}
                        </div>

                        {/* WhatsApp Reminder Status & Trigger Toolbar */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                          {reminderMatch ? (
                            <div
                              onClick={() => openEditDocModal(doc)}
                              className="flex items-center gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/60 truncate cursor-pointer transition"
                              title="Click to edit reminder schedule"
                            >
                              <Bell className="h-3 w-3 shrink-0 text-emerald-600" />
                              <span className="truncate font-medium">{reminderMatch[1]}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditDocModal(doc)}
                              className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 font-medium cursor-pointer"
                              title="Set WhatsApp renewal reminder"
                            >
                              <Bell className="h-3 w-3" /> Set WhatsApp Alert
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={sendingDocId === doc.id}
                            onClick={() => handleSendDocWhatsApp(doc)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer shrink-0 shadow-2xs ${
                              sentDocSuccessId === doc.id
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70"
                            }`}
                            title="Send WhatsApp document expiry alert now"
                          >
                            <Send className={`h-2.5 w-2.5 ${sendingDocId === doc.id ? "animate-spin" : ""}`} />
                            <span>
                              {sendingDocId === doc.id
                                ? "Sending..."
                                : sentDocSuccessId === doc.id
                                ? "Alert Sent!"
                                : "WA Alert"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {doc.fileType?.toUpperCase() || "FILE"}
                        </span>
                        {doc.fileUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setViewingDoc({
                                name: doc.name,
                                fileUrl: doc.fileUrl,
                                fileType: doc.fileType || "pdf",
                                category: doc.category,
                                documentNumber: doc.documentNumber,
                                expiryDate: doc.expiryDate,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" /> View / Download File
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No attachment</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HIGHLIGHTED WARRANTIES & CLAIMS                                     */}
      {/* ========================================================================= */}
      {activeTab === "warranties" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                Vehicle Warranties & Active Claims
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track battery, tire, engine, tracking device, or parts replacement warranty periods and claim statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWarrantyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Warranty / Claim
            </button>
          </div>

          {warranties.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <ShieldCheck className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">No warranties or claims added</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Protect your vehicle by tracking warranty on Battery (e.g. Rahimafrooz), Tires (e.g. Yokohama), or official dealer engine guarantee.
              </p>
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Record First Warranty
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {warranties.map((w) => {
                const days = getDaysRemaining(w.expiryDate);
                const isClaim =
                  w.status === "CLAIMED" ||
                  (w.notes || "").toLowerCase().includes("claim");

                return (
                  <div
                    key={w.id}
                    className={`rounded-xl border p-4 shadow-2xs flex flex-col justify-between transition ${
                      isClaim
                        ? "border-amber-300 bg-gradient-to-br from-amber-50/80 to-orange-50/50 ring-1 ring-amber-300/60"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isClaim
                              ? "bg-amber-200 text-amber-900"
                              : w.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isClaim ? "CLAIM IN PROGRESS" : w.status}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Remove warranty record for ${w.productName}?`)) {
                              await deleteWarranty(w.id, vehicleId);
                              setWarranties((cur) => cur.filter((item) => item.id !== w.id));
                            }
                          }}
                          className="rounded p-1 text-slate-300 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {w.productName}
                      </h3>
                      <div className="text-xs text-slate-600 mt-0.5 font-medium">
                        Seller / Provider: <strong>{w.seller}</strong>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Purchase / Install:</span>
                          <span className="font-mono">{w.purchaseDate}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Warranty Duration:</span>
                          <span className="font-mono font-semibold">{w.warrantyDurationMonths} Months</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Expiry:</span>
                          <span
                            className={`font-mono font-semibold text-[11px] ${
                              days.tone === "danger"
                                ? "text-rose-600"
                                : days.tone === "warn"
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {w.expiryDate || "—"} ({days.label})
                          </span>
                        </div>
                      </div>

                      {w.notes && (
                        <div className="mt-2.5 rounded-lg bg-slate-50/80 p-2 text-[11px] text-slate-600 border border-slate-100">
                          {w.notes}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Component Warranty
                      </span>
                      {w.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingDoc({
                              name: `${w.productName} Warranty Card`,
                              fileUrl: w.receiptUrl,
                              fileType: "pdf",
                              category: "Warranty & Claim",
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" /> View Warranty Card
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No warranty doc</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SPECS & OVERVIEW                                                   */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Vehicle Identity & Specifications
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditSpecsModal(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                  title="Auto-extract specs from uploaded documents"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Read document details</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditSpecsModal(false)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                  title="Manually edit vehicle specifications"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit Specs</span>
                </button>
              </div>
            </div>

            {/* Official Bangladesh Digital Retroreflective Number Plate */}
            {vehicle.registrationNumber && (
              <div className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <BangladeshNumberPlate
                  registrationNumber={vehicle.registrationNumber}
                  size="md"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-mono font-bold text-slate-700">
                    {vehicle.registrationNumber}
                  </span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                    Retroreflective Aluminum
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Vehicle Name</span>
                <span className="font-semibold text-slate-900">{vehicle.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Vehicle Type</span>
                <span className="font-semibold text-slate-900">{vehicle.type}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Brand & Model</span>
                <span className="font-semibold text-slate-900">
                  {vehicle.brand} {vehicle.model}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Manufacturing Year</span>
                <span className="font-mono font-semibold text-slate-900">{vehicle.year}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Registration Number</span>
                <span className="font-mono font-semibold text-slate-900">
                  {vehicle.registrationNumber || "Unregistered"}
                </span>
              </div>

              {/* Engine Number */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Engine Number</span>
                <div className="flex items-center gap-1.5">
                  {vehicle.engineNumber ? (
                    <span className="font-mono font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {vehicle.engineNumber}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditSpecsModal(true)}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                      title="Click to auto-extract or record Engine Number"
                    >
                      <span>Not recorded</span>
                      <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                    </button>
                  )}
                  {vehicle.engineNumber ? (
                    <button
                      type="button"
                      onClick={() => handleCopySpec(vehicle.engineNumber, "engine")}
                      className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                      title="Copy Engine Number"
                    >
                      {copiedField === "engine" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditSpecsModal(false)}
                      className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                      title="Edit Engine Number"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chassis Number (VIN) */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Chassis / VIN Number</span>
                <div className="flex items-center gap-1.5">
                  {vehicle.chassisNumber ? (
                    <span className="font-mono font-bold text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {vehicle.chassisNumber}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditSpecsModal(true)}
                      className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition cursor-pointer"
                      title="Click to auto-extract or record Chassis Number"
                    >
                      <span>Not recorded</span>
                      <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                    </button>
                  )}
                  {vehicle.chassisNumber ? (
                    <button
                      type="button"
                      onClick={() => handleCopySpec(vehicle.chassisNumber, "chassis")}
                      className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                      title="Copy Chassis Number"
                    >
                      {copiedField === "chassis" ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEditSpecsModal(false)}
                      className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                      title="Edit Chassis Number"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Engine Displacement (CC) */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Engine Displacement</span>
                <span className="font-mono font-semibold text-indigo-900 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100 text-xs">
                  {parsedVehicleSpecs.cubicCapacity || "Not recorded"}
                </span>
              </div>

              {/* Fuel Type */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Primary Fuel Type</span>
                <span className="font-semibold text-slate-900">
                  {parsedVehicleSpecs.fuelType || "Not recorded"}
                </span>
              </div>

              {/* Seating Capacity */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Seating Capacity</span>
                <span className="font-semibold text-slate-900">
                  {parsedVehicleSpecs.seatingCapacity || "Not recorded"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Current Odometer</span>
                <span className="font-mono font-semibold text-slate-900">
                  {vehicle.mileage.toLocaleString()} km
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Color</span>
                <span className="font-semibold text-slate-900">{vehicle.color || "Not specified"}</span>
              </div>
              {vehicle.notes && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1">Notes:</span>
                  <p className="rounded-lg bg-slate-50 p-2 text-slate-700">
                    {vehicle.notes.replace(/\[Specs:[^\]]*\]/gi, "").trim() || vehicle.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Financial & Lifecycle Summary
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Lifetime Fuel Cost</span>
                <span className="font-mono font-bold text-slate-900">{formatMoney(totalFuelCost)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Lifetime Maintenance Cost</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(totalMaintenanceCost)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50"><span className="text-slate-500">Other recorded expenses</span><span className="font-mono font-bold">{formatMoney(sumMoney(expenses.filter(item => item.category !== "Fuel").map(item => Number(item.amount))))}</span></div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-bold">Total Vehicle Operational Cost</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  {formatMoney(totalCombinedExpense)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Documents Stored</span>
                <span className="font-semibold text-slate-900">{documents.length} legal documents</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Component Warranties</span>
                <span className="font-semibold text-slate-900">{warranties.length} active warranties</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: ADD BANGLADESH VEHICLE DOCUMENT                                  */}
      {/* ========================================================================= */}
      {docModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setDocModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                {docPresetSelected.name || "Upload Vehicle Document"}
              </h2>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={docPresetSelected.name || customDocName}
                  onChange={(e) => {
                    setCustomDocName(e.target.value);
                    if (docPresetSelected.name) {
                      setDocPresetSelected((cur) => ({ ...cur, name: e.target.value }));
                    }
                  }}
                  placeholder="e.g. BRTA Tax Token (2026-2027), Smart Card, Driving License"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Category
                </label>
                <select
                  value={docPresetSelected.category}
                  onChange={(e) =>
                    setDocPresetSelected((cur) => ({
                      ...cur,
                      category: e.target.value as BangladeshDocType,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Tax Token">Tax Token (BRTA)</option>
                  <option value="Registration Certificate">Registration Paper / Certificate</option>
                  <option value="Smart Registration Card">Smart Registration Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Fitness Certificate">Fitness Certificate</option>
                  <option value="Insurance Certificate">Insurance Certificate</option>
                  <option value="Route Permit">Route Permit (BRTA)</option>
                  <option value="Custom Document">Other / Custom Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document / Token / License Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TT-984210, DL-0043128"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={docIssueDate}
                    onChange={(e) => setDocIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expiry Date (Renewal Alert)
                  </label>
                  <input
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Upload Document File (PDF, Image or Text)
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Text extraction; images/PDFs require manual entry
                  </span>
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 hover:bg-slate-100 transition">
                  <Upload className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-xs font-medium text-slate-700">
                    {docFile ? docFile.name : "Choose Smart Card, Blue Book, Token, or Photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleDocFileChange(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Extraction Progress */}
              {isExtractingSpecs && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-center text-xs text-indigo-900 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" />
                  <span>Scanning document & extracting Engine No, Chassis No, and Specs...</span>
                </div>
              )}

              {extractedSpecs && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={specsConfirmed} onChange={e => setSpecsConfirmed(e.target.checked)} />I checked these specifications against this vehicle's document. Apply them when saving.</label>}
              {/* Extracted Specifications Review & Confirmation Card */}
              {specExtractionError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{specExtractionError}</p>}
              {extractedSpecs && !isExtractingSpecs && (
                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-indigo-950">
                        Document suggestions - verify before applying
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                      Review & Confirm
                    </span>
                  </div>

                  <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                    Detected Engine No, Chassis No, and specifications from this document. Verify details below and confirm to sync to Vehicle Specs.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Engine Number
                      </label>
                      <input
                        type="text"
                        value={specEngineNo}
                        onChange={(e) => setSpecEngineNo(e.target.value)}
                        placeholder="Engine number from your document"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Chassis / VIN Number
                      </label>
                      <input
                        type="text"
                        value={specChassisNo}
                        onChange={(e) => setSpecChassisNo(e.target.value)}
                        placeholder="Chassis number from your document"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Displacement (CC)
                      </label>
                      <input
                        type="text"
                        value={specCC}
                        onChange={(e) => setSpecCC(e.target.value)}
                        placeholder={/bike|motorcycle|scooter/i.test(vehicle.type) ? "Enter documented cc" : "Enter documented engine capacity"}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Primary Fuel Type
                      </label>
                      <input
                        type="text"
                        value={specFuel}
                        onChange={(e) => setSpecFuel(e.target.value)}
                        placeholder="e.g. Octane"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Manufacturing Year
                      </label>
                      <input
                        type="text"
                        value={specYear}
                        onChange={(e) => setSpecYear(e.target.value)}
                        placeholder="e.g. 2010"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Color
                      </label>
                      <input
                        type="text"
                        value={specColor}
                        onChange={(e) => setSpecColor(e.target.value)}
                        placeholder="e.g. Black"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {specsAppliedSuccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Specs Confirmed & Saved to Vehicle!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Click confirm to apply to Specs
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isApplyingSpecs || specsAppliedSuccess}
                      onClick={handleConfirmVehicleSpecs}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isApplyingSpecs ? "Saving..." : specsAppliedSuccess ? "Confirmed ✓" : "Confirm & Update Vehicle Specs"}
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp Renewal Alert Card */}
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="docReminderWhatsapp"
                      checked={docReminderWhatsapp}
                      onChange={(e) => setDocReminderWhatsapp(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="docReminderWhatsapp" className="text-xs font-bold text-emerald-950 cursor-pointer">
                      Send WhatsApp reminder for document renewal
                    </label>
                  </div>
                  {docDueTime && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-white/80 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      ⏰ Time: {formatTime12h(docDueTime)}
                    </span>
                  )}
                </div>

                {docReminderWhatsapp && (
                  <div className="space-y-2.5 pl-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Remind Lead
                        </label>
                        <select
                          value={docReminderLead}
                          onChange={(e) => setDocReminderLead(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="30 days before">30 days before (Recommended for BRTA)</option>
                          <option value="15 days before">15 days before</option>
                          <option value="7 days before">7 days before</option>
                          <option value="3 days before">3 days before</option>
                          <option value="1 day before">1 day before</option>
                          <option value="On exact expiry date">On exact expiry date</option>
                          <option value="custom">Custom Days / Hours / Mins...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Alert Time
                        </label>
                        <input
                          type="time"
                          value={docDueTime}
                          onChange={(e) => setDocDueTime(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                        />
                      </div>
                    </div>

                    {docReminderLead === "custom" && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-600 shrink-0">Custom Lead:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={docCustomLeadMinutes}
                          onChange={(e) => setDocCustomLeadMinutes(Number(e.target.value))}
                          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 font-mono text-center outline-none focus:border-emerald-600"
                        />
                        <select
                          value={docCustomLeadUnit}
                          onChange={(e) => setDocCustomLeadUnit(e.target.value as any)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="minutes">Minutes before</option>
                          <option value="hours">Hours before</option>
                          <option value="days">Days before</option>
                        </select>
                      </div>
                    )}

                    {docReminderPreviewText && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/90 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{docReminderPreviewText}</span>
                      </div>
                    )}

                    <ItemRecipientSelector
                      selectedRecipients={docRecipients}
                      onChange={setDocRecipients}
                      label="Send Document Alert To:"
                      helperText="Pick which number alias(es) will receive the renewal reminder."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Renewed at Mirpur BRTA circle"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDocModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD VEHICLE WARRANTY OR CLAIM                                    */}
      {/* ========================================================================= */}
      {warrantyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setWarrantyModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                Add Component Warranty / Claim
              </h2>
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWarranty} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product / Component Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucas Din 60 Battery, Yokohama BlueEarth Tires, Engine Warranty"
                  value={warrantyProduct}
                  onChange={(e) => setWarrantyProduct(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Seller / Provider / Brand <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahimafrooz, Navana Motors, Authorized Dealer"
                  value={warrantySeller}
                  onChange={(e) => setWarrantySeller(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Purchase / Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={warrantyPurchaseDate}
                    onChange={(e) => setWarrantyPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warranty Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Warranty Status / Claim Progress
                </label>
                <select
                  value={warrantyStatus}
                  onChange={(e) => setWarrantyStatus(e.target.value as WarrantyItem["status"])}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ACTIVE">ACTIVE (Protected under warranty)</option>
                  <option value="CLAIMED">CLAIM IN PROGRESS (Claim submitted / replacement awaited)</option>
                  <option value="EXPIRING SOON">EXPIRING SOON</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Upload Warranty Card / Guarantee Paper
                </label>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 hover:bg-slate-100 transition">
                  <Upload className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-xs font-medium text-slate-700">
                    {warrantyFile ? warrantyFile.name : "Attach photo or PDF of warranty card"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setWarrantyFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Claim Notes / Memo No
                </label>
                <input
                  type="text"
                  placeholder="e.g. Battery replaced under warranty claim on 2026-04, free service token"
                  value={warrantyNotes}
                  onChange={(e) => setWarrantyNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWarrantyModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Warranty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT DOCUMENT & NOTIFICATION OPTIONS */}
      {editingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setEditingDoc(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  {editingDoc.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sendingDocId === editingDoc.id}
                  onClick={() => handleSendDocWhatsApp(editingDoc)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    sentDocSuccessId === editingDoc.id
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                  title="Send WhatsApp document alert now"
                >
                  <Send className={`h-3 w-3 ${sendingDocId === editingDoc.id ? "animate-spin" : ""}`} />
                  {sendingDocId === editingDoc.id
                    ? "Sending..."
                    : sentDocSuccessId === editingDoc.id
                    ? "Alert Sent!"
                    : "WA Alert Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateDocument} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="e.g. BRTA Tax Token (2026-2027), Smart Card, Driving License"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Category
                </label>
                <select
                  value={editDocCategory}
                  onChange={(e) => setEditDocCategory(e.target.value as BangladeshDocType)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Tax Token">Tax Token (BRTA)</option>
                  <option value="Registration Certificate">Registration Paper / Certificate</option>
                  <option value="Smart Registration Card">Smart Registration Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Fitness Certificate">Fitness Certificate</option>
                  <option value="Insurance Certificate">Insurance Certificate</option>
                  <option value="Route Permit">Route Permit (BRTA)</option>
                  <option value="Custom Document">Other / Custom Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document / Token / License Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TT-984210, DL-0043128"
                  value={editDocNumber}
                  onChange={(e) => setEditDocNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={editDocIssueDate}
                    onChange={(e) => setEditDocIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expiry Date (Renewal Alert)
                  </label>
                  <input
                    type="date"
                    value={editDocExpiryDate}
                    onChange={(e) => setEditDocExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Replace Document File / Re-Scan Specs <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Text extraction; images/PDFs require manual entry
                  </span>
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 hover:bg-slate-100 transition">
                  <Upload className="h-4 w-4 text-slate-500 mr-2" />
                  <span className="text-xs font-medium text-slate-700">
                    {editDocFile ? editDocFile.name : (editingDoc.fileName || "Attach new photo or scan to extract specs")}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleEditDocFileChange(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Extraction Progress */}
              {isExtractingSpecs && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-center text-xs text-indigo-900 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" />
                  <span>Scanning document & extracting Engine No, Chassis No, and Specs...</span>
                </div>
              )}

              {extractedSpecs && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={specsConfirmed} onChange={e => setSpecsConfirmed(e.target.checked)} />I checked these specifications against this vehicle's document. Apply them when saving.</label>}
              {/* Extracted Specifications Review & Confirmation Card */}
              {specExtractionError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{specExtractionError}</p>}
              {extractedSpecs && !isExtractingSpecs && (
                <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-indigo-950">
                        Document suggestions - verify before applying
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                      Review & Confirm
                    </span>
                  </div>

                  <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                    Detected Engine No, Chassis No, and specifications from this document. Verify details below and confirm to sync to Vehicle Specs.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Engine Number
                      </label>
                      <input
                        type="text"
                        value={specEngineNo}
                        onChange={(e) => setSpecEngineNo(e.target.value)}
                        placeholder="Engine number from your document"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Chassis / VIN Number
                      </label>
                      <input
                        type="text"
                        value={specChassisNo}
                        onChange={(e) => setSpecChassisNo(e.target.value)}
                        placeholder="Chassis number from your document"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Displacement (CC)
                      </label>
                      <input
                        type="text"
                        value={specCC}
                        onChange={(e) => setSpecCC(e.target.value)}
                        placeholder={/bike|motorcycle|scooter/i.test(vehicle.type) ? "Enter documented cc" : "Enter documented engine capacity"}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Primary Fuel Type
                      </label>
                      <input
                        type="text"
                        value={specFuel}
                        onChange={(e) => setSpecFuel(e.target.value)}
                        placeholder="e.g. Octane"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Manufacturing Year
                      </label>
                      <input
                        type="text"
                        value={specYear}
                        onChange={(e) => setSpecYear(e.target.value)}
                        placeholder="e.g. 2010"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                        Color
                      </label>
                      <input
                        type="text"
                        value={specColor}
                        onChange={(e) => setSpecColor(e.target.value)}
                        placeholder="e.g. Black"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {specsAppliedSuccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Specs Confirmed & Saved to Vehicle!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Click confirm to apply to Specs
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isApplyingSpecs || specsAppliedSuccess}
                      onClick={handleConfirmVehicleSpecs}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isApplyingSpecs ? "Saving..." : specsAppliedSuccess ? "Confirmed ✓" : "Confirm & Update Vehicle Specs"}
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp Renewal Alert Card */}
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editDocReminderWhatsapp"
                      checked={editDocReminderWhatsapp}
                      onChange={(e) => setEditDocReminderWhatsapp(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="editDocReminderWhatsapp" className="text-xs font-bold text-emerald-950 cursor-pointer">
                      Send WhatsApp reminder for document renewal
                    </label>
                  </div>
                  {editDocDueTime && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-white/80 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      ⏰ Time: {formatTime12h(editDocDueTime)}
                    </span>
                  )}
                </div>

                {editDocReminderWhatsapp && (
                  <div className="space-y-2.5 pl-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Remind Lead
                        </label>
                        <select
                          value={editDocReminderLead}
                          onChange={(e) => setEditDocReminderLead(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="30 days before">30 days before (Recommended for BRTA)</option>
                          <option value="15 days before">15 days before</option>
                          <option value="7 days before">7 days before</option>
                          <option value="3 days before">3 days before</option>
                          <option value="1 day before">1 day before</option>
                          <option value="On exact expiry date">On exact expiry date</option>
                          <option value="custom">Custom Days / Hours / Mins...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Alert Time
                        </label>
                        <input
                          type="time"
                          value={editDocDueTime}
                          onChange={(e) => setEditDocDueTime(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono"
                        />
                      </div>
                    </div>

                    {editDocReminderLead === "custom" && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-600 shrink-0">Custom Lead:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={editDocCustomLeadMinutes}
                          onChange={(e) => setEditDocCustomLeadMinutes(Number(e.target.value))}
                          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 font-mono text-center outline-none focus:border-emerald-600"
                        />
                        <select
                          value={editDocCustomLeadUnit}
                          onChange={(e) => setEditDocCustomLeadUnit(e.target.value as any)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-600 font-medium"
                        >
                          <option value="minutes">Minutes before</option>
                          <option value="hours">Hours before</option>
                          <option value="days">Days before</option>
                        </select>
                      </div>
                    )}

                    {editDocReminderPreviewText && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-200/90 rounded-lg px-2.5 py-1 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{editDocReminderPreviewText}</span>
                      </div>
                    )}

                    <ItemRecipientSelector
                      selectedRecipients={editDocRecipients}
                      onChange={setEditDocRecipients}
                      label="Send Document Alert To:"
                      helperText="Pick which number alias(es) will receive the renewal reminder."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Renewed at Mirpur BRTA circle"
                  value={editDocNotes}
                  onChange={(e) => setEditDocNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const doc = editingDoc;
                    setEditingDoc(null);
                    setDocToDelete(doc);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Document
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingDoc}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                  >
                    {isUpdatingDoc ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CUSTOM DELETE DOCUMENT CONFIRMATION */}
      {docToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onMouseDown={() => !isDeletingDoc && setDocToDelete(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Document
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete this document record? This action cannot be undone and will remove any associated renewal reminders.
                </p>
                {docToDelete.name && (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Document
                    </span>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {docToDelete.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
                onClick={handleConfirmDeleteDoc}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeletingDoc ? "Deleting..." : "Yes, Delete Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FUEL PURCHASE */}
      {editingFuel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setEditingFuel(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Edit Fuel Purchase
              </h2>
              <button
                type="button"
                onClick={() => setEditingFuel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFuel} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFuelDate}
                    onChange={(e) => setEditFuelDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Odometer Mileage (km) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 99725"
                    value={editFuelMileage}
                    onChange={(e) => setEditFuelMileage(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Paid (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={editFuelAmount}
                    onChange={(e) => handleEditFuelAmountChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Per Liter Price (৳)
                    </label>
                    {BD_FUEL_RATES[editFuelType] && (
                      <button
                        type="button"
                        onClick={() => applyEditFuelPresetRate(BD_FUEL_RATES[editFuelType])}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline decoration-dotted"
                        title={`Apply standard BD ${editFuelType} rate (৳${BD_FUEL_RATES[editFuelType]}/L)`}
                      >
                        ৳{BD_FUEL_RATES[editFuelType]} BD
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${BD_FUEL_RATES[editFuelType] || 125}`}
                    value={editFuelPricePerLiter}
                    onChange={(e) => handleEditFuelPriceChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Liters (Auto-Calculated)
                  </label>
                  {editFuelAmount && editFuelPricePerLiter && (
                    <span className="text-[10px] font-mono text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      ৳{editFuelAmount} ÷ ৳{editFuelPricePerLiter} = {editFuelLiters || 0} L
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 30.30"
                    value={editFuelLiters}
                    onChange={(e) => handleEditFuelLitersChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white pr-8"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fuel Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FUEL_TYPES.map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => handleEditFuelTypeSelect(ft)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                        editFuelType === ft
                          ? "bg-slate-900 text-white font-semibold shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {ft}
                      {BD_FUEL_RATES[ft] && (
                        <span className="ml-1 text-[10px] opacity-75 font-mono">
                          ৳{BD_FUEL_RATES[ft]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuel Station / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trust Filling Station, Padma Oil"
                  value={editFuelNotes}
                  onChange={(e) => setEditFuelNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingFuel;
                    setEditingFuel(null);
                    setFuelToDelete(toDelete);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Entry
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFuel(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingFuel}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                  >
                    {isUpdatingFuel ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE FUEL PURCHASE CONFIRMATION */}
      {fuelToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onMouseDown={() => setFuelToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Fuel Purchase?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete this fuel record? This will update your total fuel expense calculations.
                </p>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-mono font-semibold text-slate-800">{fuelToDelete.date}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-mono font-bold text-slate-900">{formatMoney(fuelToDelete.amount)}</span>
                  </div>
                  {fuelToDelete.fuelLiters && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Liters:</span>
                      <span className="font-mono text-slate-800">{fuelToDelete.fuelLiters} L</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingFuel}
                onClick={() => setFuelToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingFuel}
                onClick={handleConfirmDeleteFuel}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeletingFuel ? "Deleting..." : "Yes, Delete Fuel Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MAINTENANCE SERVICE */}
      {editingService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => setEditingService(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Edit Maintenance Entry
              </h2>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editServiceDate}
                    onChange={(e) => setEditServiceDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Odometer Mileage (km) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 98564"
                    value={editServiceMileage}
                    onChange={(e) => setEditServiceMileage(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service / Job Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wheel Change, Mobil change"
                    value={editServiceType}
                    onChange={(e) => setEditServiceType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Cost (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 39600"
                    value={editServiceCost}
                    onChange={(e) => setEditServiceCost(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workshop / Garage
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Yume Tyre and Battery"
                    value={editServiceWorkshop}
                    onChange={(e) => setEditServiceWorkshop(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Service Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editServiceNextDate}
                    onChange={(e) => setEditServiceNextDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Done / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Need to replace 4 wheels for the vehicle"
                  value={editServiceDescription}
                  onChange={(e) => setEditServiceDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingService;
                    setEditingService(null);
                    setServiceToDelete(toDelete);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Entry
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingService}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs cursor-pointer"
                  >
                    {isUpdatingService ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE MAINTENANCE SERVICE CONFIRMATION */}
      {serviceToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onMouseDown={() => setServiceToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Maintenance Record?
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to delete this service entry? This will update your vehicle's total maintenance cost calculations.
                </p>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-semibold text-slate-800">{serviceToDelete.serviceType}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Workshop:</span>
                    <span className="text-slate-800">{serviceToDelete.workshopName || "—"}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-mono font-semibold text-slate-800">{serviceToDelete.serviceDate}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Cost:</span>
                    <span className="font-mono font-bold text-slate-900">{formatMoney(serviceToDelete.cost)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingService}
                onClick={() => setServiceToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingService}
                onClick={handleConfirmDeleteService}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeletingService ? "Deleting..." : "Yes, Delete Service Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VEHICLE SPECIFICATIONS */}
      {editSpecsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
          onMouseDown={() => !isApplyingSpecs && setEditSpecsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Vehicle Specs
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{vehicle?.name}</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Vehicle Identity & Specifications
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditSpecsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {specExtractionError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{specExtractionError}</p>}
              {/* Auto-Extract Banner */}
              <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/60 p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>Auto-Extract from Uploaded Documents</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5 leading-relaxed">
                    {documents.length > 0
                      ? "Reads attached plain-text documents. Images and PDFs require manual entry."
                      : "No documents uploaded yet. Enter details from your vehicle document."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isExtractingSpecs}
                  onClick={handleAutoExtractFromExistingDocs}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isExtractingSpecs ? "animate-spin" : ""}`} />
                  {isExtractingSpecs ? "Scanning..." : "Scan Docs"}
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Engine Number */}
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Engine Number
                    </label>
                  </div>
                  <input
                    type="text"
                    value={specEngineNo}
                    onChange={(e) => setSpecEngineNo(e.target.value)}
                    placeholder="Engine number from your document"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Chassis / VIN Number */}
                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Chassis / VIN Number
                    </label>
                  </div>
                  <input
                    type="text"
                    value={specChassisNo}
                    onChange={(e) => setSpecChassisNo(e.target.value)}
                    placeholder="Chassis number from your document"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Registration Number */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={specRegNo}
                    onChange={(e) => setSpecRegNo(e.target.value)}
                    placeholder="e.g. DHAKA METRO GA 33-3617"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Displacement CC */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Displacement (CC)
                  </label>
                  <input
                    type="text"
                    value={specCC}
                    onChange={(e) => setSpecCC(e.target.value)}
                    placeholder={/bike|motorcycle|scooter/i.test(vehicle.type) ? "Enter documented cc" : "Enter documented engine capacity"}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Fuel Type */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Primary Fuel Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Octane", "Hybrid / Octane", "Petrol", "Diesel", "CNG", "LPG", "Electric"].map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => setSpecFuel(ft)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                          specFuel === ft
                            ? "bg-slate-900 text-white font-semibold shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {ft}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manufacturing Year */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Manufacturing Year
                  </label>
                  <input
                    type="text"
                    value={specYear}
                    onChange={(e) => setSpecYear(e.target.value)}
                    placeholder="e.g. 2010"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Exterior Color */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Exterior Color
                  </label>
                  <input
                    type="text"
                    value={specColor}
                    onChange={(e) => setSpecColor(e.target.value)}
                    placeholder="e.g. Black, White, Pearl"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>

                {/* Seating Capacity */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="text"
                    value={specSeats}
                    onChange={(e) => setSpecSeats(e.target.value)}
                    placeholder="Enter documented seat count"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {specsAppliedSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Specifications saved to vehicle successfully!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                disabled={isApplyingSpecs}
                onClick={() => setEditSpecsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApplyingSpecs}
                onClick={handleConfirmVehicleSpecs}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {isApplyingSpecs ? "Saving Specs..." : "Confirm & Save Specifications"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal In-App Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
      />
    </div>
  );
}
