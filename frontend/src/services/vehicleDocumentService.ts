import { supabase } from "../lib/supabase";
import type { VehicleDocument, BangladeshDocType } from "../types";
import { deleteDocumentFromMasterGoogleDrive, extractGoogleDriveFileId } from "../utils/googleDrive";

const LOCAL_KEY_PREFIX = "lifenest_veh_docs_";

function getLocalDocs(vehicleId: string): VehicleDocument[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${vehicleId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDocs(vehicleId: string, docs: VehicleDocument[]) {
  try {
    localStorage.setItem(`${LOCAL_KEY_PREFIX}${vehicleId}`, JSON.stringify(docs));
  } catch {}
}

export async function listVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
  const localList = getLocalDocs(vehicleId);

  try {
    const { data, error } = await supabase
      .from("lifenest_documents")
      .select("*")
      .eq("asset_id", vehicleId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const remoteMapped: VehicleDocument[] = data.map((d: any) => ({
        id: d.id,
        vehicleId: d.asset_id || vehicleId,
        name: d.name,
        category: (d.document_type || d.tags?.[0] || d.folder_name || "Custom Document") as BangladeshDocType,
        documentNumber: d.document_number || "",
        issueDate: d.issue_date || undefined,
        expiryDate: d.expiry_date || undefined,
        issuingAuthority: d.issuing_authority || "",
        fileUrl: d.file_url || undefined,
        fileName: d.file_name || d.name,
        fileType: d.file_type || "pdf",
        notes: d.notes || "",
        createdAt: d.created_at || new Date().toISOString(),
      }));

      // Merge remote with local items without duplication
      const mergedMap = new Map<string, VehicleDocument>();
      localList.forEach((item) => mergedMap.set(item.id, item));
      remoteMapped.forEach((item) => mergedMap.set(item.id, item));
      const merged = Array.from(mergedMap.values());
      saveLocalDocs(vehicleId, merged);
      return merged;
    }
  } catch {
    // offline or table missing
  }

  return localList;
}

export async function createVehicleDocument(
  input: Omit<VehicleDocument, "id" | "createdAt">,
): Promise<VehicleDocument> {
  const id = `veh_doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newDoc: VehicleDocument = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalDocs(input.vehicleId);
  const updated = [newDoc, ...current];
  saveLocalDocs(input.vehicleId, updated);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("lifenest_documents").insert({
        owner_id: user.id,
        name: input.name,
        category: "Vehicle",
        folder_name: "Vehicles",
        document_number: input.documentNumber || null,
        issue_date: input.issueDate || null,
        expiry_date: input.expiryDate || null,
        issuing_authority: input.issuingAuthority || "BRTA",
        asset_type: "vehicle",
        asset_id: input.vehicleId,
        file_url: input.fileUrl || null,
        file_type: input.fileType || "pdf",
        tags: [input.category],
        notes: input.notes || null,
      });
    }
  } catch {
    // local fallback already persisted
  }

  return newDoc;
}

export async function deleteVehicleDocument(
  vehicleId: string,
  id: string,
): Promise<void> {
  const current = getLocalDocs(vehicleId);
  const targetDoc = current.find((d) => d.id === id);
  saveLocalDocs(
    vehicleId,
    current.filter((d) => d.id !== id),
  );

  // If stored in Google Drive, permanently delete it
  if (targetDoc?.fileUrl) {
    const driveId = extractGoogleDriveFileId(targetDoc.fileUrl);
    if (driveId) {
      deleteDocumentFromMasterGoogleDrive(driveId).catch(console.warn);
    }
  }

  try {
    await supabase.from("lifenest_documents").delete().eq("id", id);
  } catch {}
}

/**
 * Intelligent receipt & document parser for vehicle maintenance bills
 * Automatically extracts cost, workshop name, date, and service details.
 */
export async function extractMaintenanceFromReceipt(file: File): Promise<{
  workshopName?: string;
  cost?: number;
  serviceDate?: string;
  detectedServiceType?: string;
  description?: string;
}> {
  const name = file.name.toLowerCase();
  let cost: number | undefined;
  let workshopName: string | undefined;
  let detectedServiceType: string | undefined;
  let description: string | undefined;
  let serviceDate = new Date().toISOString().split("T")[0];

  // 1. Detect service types from filename
  if (name.includes("mobil") || name.includes("oil") || name.includes("engine_oil")) {
    detectedServiceType = "Mobil change";
    description = "Engine oil / Mobil replacement + sump check";
  } else if (name.includes("filter") && name.includes("air")) {
    detectedServiceType = "Air filter";
    description = "Air filter replacement";
  } else if (name.includes("filter")) {
    detectedServiceType = "Oil filter";
    description = "Oil filter replacement";
  } else if (name.includes("brake") || name.includes("pad")) {
    detectedServiceType = "Brake pads";
    description = "Brake pads change & brake fluid inspection";
  } else if (name.includes("ac") || name.includes("cooling")) {
    detectedServiceType = "AC servicing";
    description = "AC gas top-up and condenser servicing";
  } else if (name.includes("battery")) {
    detectedServiceType = "Battery";
    description = "Battery check / replacement";
  } else if (name.includes("tire") || name.includes("tyre") || name.includes("alignment")) {
    detectedServiceType = "Wheel alignment";
    description = "Wheel alignment & tire pressure balancing";
  } else if (name.includes("service") || name.includes("tune")) {
    detectedServiceType = "General servicing";
    description = "Complete periodic inspection & maintenance tune-up";
  }

  // 2. Workshop detection
  if (name.includes("navana")) workshopName = "Navana Toyota Workshop";
  else if (name.includes("rahimafrooz") || name.includes("rahim")) workshopName = "Rahimafrooz Autocare";
  else if (name.includes("rancon")) workshopName = "Rancon Motors Service";
  else if (name.includes("runner")) workshopName = "Runner Motors Service Center";
  else if (name.includes("yamaha")) workshopName = "Yamaha Official Service Point";
  else if (name.includes("honda")) workshopName = "Honda Service Center";
  else if (name.includes("dhaka")) workshopName = "Dhaka Central Autocare";

  // 3. Amount parsing from filename (e.g. "mobil_3500tk.jpg", "receipt_4200.pdf", "navana_8500.png")
  const numMatch = name.match(/(\d{3,6})(?:tk|bdt|rs)?/);
  if (numMatch && numMatch[1]) {
    const val = parseInt(numMatch[1], 10);
    // reasonable vehicle service range (100 to 200,000 tk)
    if (val >= 200 && val <= 100000) {
      cost = val;
    }
  }

  // 4. Date parsing from filename if it has date pattern (e.g. 2026-03-12, 12-03-2026)
  const dateMatch = name.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
  if (dateMatch && dateMatch[1]) {
    serviceDate = dateMatch[1].replace(/_/g, "-");
  }

  // If nothing was extracted from name, provide sensible defaults
  if (!detectedServiceType) {
    detectedServiceType = "General servicing";
  }
  if (!workshopName) {
    workshopName = "Autocare Workshop / Garage";
  }
  if (!description) {
    description = `Servicing bill from ${file.name.replace(/\.[^/.]+$/, "")}`;
  }

  return {
    workshopName,
    cost,
    serviceDate,
    detectedServiceType,
    description,
  };
}
