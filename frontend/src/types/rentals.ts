export type RentCharge = { label: string; amount: number };
export type RentalTenancy = {
  id: string; owner_id: string; unit_id: string; tenant_name: string; tenant_phone: string;
  tenant_nid: string; start_month: string; end_month: string | null;
};
export type RentSchedule = {
  id: string; tenancy_id: string; from_month: string; to_month: string | null;
  base_rent: number; charges: RentCharge[];
};
export type RentalPayment = {
  id: string; unit_id: string; tenancy_id: string | null; month: string;
  amount_paid: number; payment_date: string; payment_method: string; voided_at: string | null;
};
export type RentalFile = { path: string; name: string };
export type PropertyDocument = {
  id: string; property_id: string; category: string; name: string; document_number: string;
  issue_date: string | null; expiry_date: string | null; notes: string; files: RentalFile[];
};
export type RentalMaintenance = {
  id: string; property_id: string; unit_id: string | null; date: string; category: string;
  amount: number; vendor: string; description: string; payment_method: string;
  files: RentalFile[]; extracted_text: string; receipt_url?: string | null;
};
