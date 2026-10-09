import { supabase } from "../lib/supabase";
import type { WarrantyItem } from "../types";

const TABLE = "lifenest_warranties";

export async function listWarranties(): Promise<WarrantyItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("expiry_date", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    productName: row.product_name,
    category: row.category,
    purchaseDate: row.purchase_date,
    warrantyStartDate: row.warranty_start_date ?? undefined,
    warrantyDurationMonths: row.warranty_duration_months ?? 12,
    expiryDate: row.expiry_date ?? undefined,
    seller: row.seller ?? "",
    purchasePrice: Number(row.purchase_price ?? 0),
    serialNumber: row.serial_number ?? "",
    invoiceNumber: row.invoice_number ?? "",
    receiptUrl: row.receipt_url ?? undefined,
    warrantyDocumentUrl: row.warranty_document_url ?? undefined,
    relatedAssetType: row.related_asset_type ?? "",
    relatedAssetId: row.related_asset_id ?? "",
    status: row.status,
    notes: row.notes ?? "",
  }));
}

export async function listWarrantiesForVehicle(vehicleId: string): Promise<WarrantyItem[]> {
  let list: WarrantyItem[] = [];
  try {
    const all = await listWarranties();
    list = all.filter((w) => w.relatedAssetId === vehicleId);
  } catch {}

  const raw = localStorage.getItem(`lifenest_veh_warranties_${vehicleId}`);
  const localList: WarrantyItem[] = raw ? JSON.parse(raw) : [];
  const mergedMap = new Map<string, WarrantyItem>();
  localList.forEach((w) => mergedMap.set(w.id, w));
  list.forEach((w) => mergedMap.set(w.id, w));
  return Array.from(mergedMap.values());
}

export async function createWarranty(
  input: Omit<WarrantyItem, "id">,
): Promise<WarrantyItem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // calculate expiry date if not provided
  let calculatedExpiry = input.expiryDate;
  if (!calculatedExpiry && input.purchaseDate && input.warrantyDurationMonths) {
    const pDate = new Date(input.purchaseDate);
    pDate.setMonth(pDate.getMonth() + input.warrantyDurationMonths);
    calculatedExpiry = pDate.toISOString().split("T")[0];
  }

  const rowData = {
    owner_id: user.id,
    product_name: input.productName,
    category: input.category,
    purchase_date: input.purchaseDate,
    warranty_start_date: input.warrantyStartDate || input.purchaseDate,
    warranty_duration_months: input.warrantyDurationMonths || 12,
    expiry_date: calculatedExpiry || null,
    seller: input.seller ?? "",
    purchase_price: input.purchasePrice ?? 0,
    serial_number: input.serialNumber ?? "",
    invoice_number: input.invoiceNumber ?? "",
    receipt_url: input.receiptUrl || null,
    warranty_document_url: input.warrantyDocumentUrl || null,
    related_asset_type: input.relatedAssetType ?? "",
    related_asset_id: input.relatedAssetId ?? "",
    status: input.status || "ACTIVE",
    notes: input.notes ?? "",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rowData)
    .select()
    .single();

  if (error) throw error;
  const item: WarrantyItem = {
    id: data.id,
    productName: data.product_name,
    category: data.category,
    purchaseDate: data.purchase_date,
    warrantyStartDate: data.warranty_start_date ?? undefined,
    warrantyDurationMonths: data.warranty_duration_months,
    expiryDate: data.expiry_date ?? undefined,
    seller: data.seller ?? "",
    purchasePrice: Number(data.purchase_price ?? 0),
    serialNumber: data.serial_number ?? "",
    invoiceNumber: data?.invoice_number ?? input.invoiceNumber ?? "",
    receiptUrl: data?.receipt_url ?? input.receiptUrl,
    warrantyDocumentUrl: data?.warranty_document_url ?? input.warrantyDocumentUrl,
    relatedAssetType: data?.related_asset_type ?? input.relatedAssetType,
    relatedAssetId: data?.related_asset_id ?? input.relatedAssetId,
    status: data?.status ?? input.status,
    notes: data?.notes ?? input.notes,
  };

  if (item.relatedAssetId) {
    try {
      const key = `lifenest_veh_warranties_${item.relatedAssetId}`;
      const raw = localStorage.getItem(key);
      const cur: WarrantyItem[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(key, JSON.stringify([item, ...cur]));
    } catch {}
  }

  return item;
}

export async function deleteWarranty(id: string, vehicleId?: string): Promise<void> {
  if (vehicleId) {
    try {
      const key = `lifenest_veh_warranties_${vehicleId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const cur: WarrantyItem[] = JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(cur.filter((w) => w.id !== id)));
      }
    } catch {}
  }
  try {
    await supabase.from(TABLE).delete().eq("id", id);
  } catch {}
}
