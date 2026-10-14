import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FileText, Upload } from "lucide-react";
import type { PropertyUnit } from "../../types";
import type { RentCharge, RentalFile, RentalTenancy, RentSchedule } from "../../types/rentals";
import { addRentalFlat, createRentalProperty, savePropertyDocument, saveRentalMaintenance, saveRentSchedule, saveTenancy, uploadRentalFiles } from "../../services/rentalService";
import { currentMonth } from "../../utils/rentalLedger";
import { sumMoney } from "../../utils/assetReports";
import { scanMaintenanceReceipt } from "../../services/receiptOcr";

export const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500";
export const button = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40";
export const primary = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
export const money = (n: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(n);
export const errorMessage = (e: unknown) => {
  const message = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
  return /exclusion|conflicting key/i.test(message) ? "This period overlaps an existing tenancy or rent rate. End the previous period in the preceding month." : message;
};
export function Label({ title, children }: { title: string; children: ReactNode }) {
  return <label className="block space-y-1 text-xs font-medium text-slate-600"><span>{title}</span>{children}</label>;
}
export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" className={button} onClick={close} aria-label="Close dialog">Close</button></div>{children}</section></div>;
}
type FormProps = { done: (id?: string) => Promise<void>; close: () => void };
function useSave(done: FormProps["done"]) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const save = async (action: () => Promise<string | void>) => {
    setBusy(true); setError("");
    try { const id = await action(); await done(id || undefined); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return { busy, error, save };
}
function FormError({ error }: { error: string }) { return error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null; }
const value = (form: FormData, key: string) => String(form.get(key) || "").trim();

export function PropertyForm({ propertyId, done, close }: FormProps & { propertyId?: string }) {
  const { busy, error, save } = useSave(done);
  const [separateRooms, setSeparateRooms] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    void save(() => propertyId ? addRentalFlat(propertyId, value(f, "flat"), separateRooms ? Number(f.get("rooms")) : 0) : createRentalProperty({ name: value(f, "name"), location: value(f, "location"), type: value(f, "type"), flat: value(f, "flat"), rooms: separateRooms ? Number(f.get("rooms")) : 0 }));
  };
  return <Modal title={propertyId ? "Add flat" : "Add property"} close={() => !busy && close()}><form onSubmit={submit} className="space-y-4"><FormError error={error} />
    {!propertyId && <><Label title="Property name *"><input required name="name" className={field} /></Label><Label title="Address *"><input required name="location" className={field} /></Label><Label title="Property type"><select name="type" className={field}><option>Residential</option><option>Commercial</option><option>Mixed use</option></select></Label></>}
    <Label title="Flat / rental space name *"><input required name="flat" className={field} placeholder="e.g. Flat A1, 3rd floor" /></Label>
    <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4"><legend className="text-sm font-semibold">How is this flat rented?</legend><label className="flex gap-2 text-sm"><input type="radio" name="mode" checked={!separateRooms} onChange={() => setSeparateRooms(false)} />The whole flat to one tenant</label><label className="flex gap-2 text-sm"><input type="radio" name="mode" checked={separateRooms} onChange={() => setSeparateRooms(true)} />Separate rooms rented individually</label>
      {separateRooms && <Label title="Number of separately rented rooms *"><input required type="number" name="rooms" min="1" max="100" step="1" defaultValue="2" className={field} /></Label>}
    </fieldset><p className="text-xs text-slate-500">You can add more flats to this property later. Tenant details, documents and rent are managed after creation.</p><button disabled={busy} className={primary}>{busy ? "Saving…" : "Save"}</button>
  </form></Modal>;
}

export function TenancyForm({
  unit,
  tenancy,
  schedules = [],
  done,
  close,
}: FormProps & {
  unit: PropertyUnit;
  tenancy?: RentalTenancy;
  schedules?: RentSchedule[];
}) {
  const { busy, error, save } = useSave(done);
  const [rent, setRent] = useState<string>(unit.monthlyRent ? String(unit.monthlyRent) : "");
  const [serviceCharge, setServiceCharge] = useState("");
  const [gasBill, setGasBill] = useState("");
  const [electricityBill, setElectricityBill] = useState("");
  const [waterBill, setWaterBill] = useState("");
  const [nidFiles, setNidFiles] = useState<File[]>([]);

  const totalCalculated =
    (Number(rent) || 0) +
    (Number(serviceCharge) || 0) +
    (Number(gasBill) || 0) +
    (Number(electricityBill) || 0) +
    (Number(waterBill) || 0);

  return (
    <Modal
      title={`${tenancy ? "Edit Renter Details" : "Add Renter & Monthly Rent"} · ${unit.unitNumber.toLowerCase().startsWith("flat") ? unit.unitNumber : `Flat ${unit.unitNumber}`}`}
      close={() => !busy && close()}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const start = value(f, "start");
          const end = value(f, "end");
          const baseRentNum = Number(rent) || 0;
          const tenantName = value(f, "name");
          const tenantPhone = value(f, "phone");
          const tenantNid = value(f, "nid");

          void save(async () => {
            let uploadedNidFiles: RentalFile[] = tenancy?.nid_files ? [...tenancy.nid_files] : [];
            if (nidFiles.length > 0) {
              const uploaded = await uploadRentalFiles(unit.propertyId, nidFiles);
              uploadedNidFiles = [...uploadedNidFiles, ...uploaded];

              // Also archive in property documents with category "Renter NID / Passport (ভাড়াটিয়ার এনআইডি)"
              try {
                await savePropertyDocument(
                  {
                    property_id: unit.propertyId,
                    category: "Renter NID / Passport (ভাড়াটিয়ার এনআইডি)",
                    name: `${tenantName} - NID Card (${unit.unitNumber})`,
                    document_number: tenantNid || "",
                    issue_date: null,
                    expiry_date: null,
                    notes: `Uploaded during renter setup for ${unit.unitNumber}. Contact: ${tenantPhone}`,
                  },
                  nidFiles
                );
              } catch (docErr) {
                console.warn("Could not archive to property documents:", docErr);
              }
            }

            const tenancyId = await saveTenancy({
              id: tenancy?.id,
              unit_id: unit.id,
              property_id: unit.propertyId,
              tenant_name: tenantName,
              tenant_phone: tenantPhone,
              tenant_nid: tenantNid,
              start_month: start,
              end_month: end || null,
              nid_files: uploadedNidFiles,
            });

            if (baseRentNum > 0 && tenancyId) {
              const chargesList: RentCharge[] = [];
              if (Number(serviceCharge) > 0)
                chargesList.push({ label: "Service charge", amount: Number(serviceCharge) });
              if (Number(gasBill) > 0)
                chargesList.push({ label: "Gas bill", amount: Number(gasBill) });
              if (Number(electricityBill) > 0)
                chargesList.push({ label: "Electricity bill", amount: Number(electricityBill) });
              if (Number(waterBill) > 0)
                chargesList.push({ label: "Water bill", amount: Number(waterBill) });

              await saveRentSchedule(
                {
                  tenancy_id: tenancyId,
                  from_month: start.slice(0, 7),
                  to_month: end ? end.slice(0, 7) : null,
                  base_rent: baseRentNum,
                  charges: chargesList,
                },
                schedules
              );
            }
          });
        }}
      >
        <FormError error={error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Label title="Renter name *">
            <input
              name="name"
              required
              placeholder="e.g. Tariqul Islam"
              defaultValue={tenancy?.tenant_name || unit.tenantName}
              className={field}
            />
          </Label>
          <Label title="Phone number *">
            <input
              name="phone"
              type="tel"
              required
              minLength={6}
              maxLength={25}
              placeholder="e.g. 01711234567"
              defaultValue={tenancy?.tenant_phone || unit.tenantPhone}
              className={field}
            />
          </Label>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5">
          <Label title="NID / Passport Number (optional)">
            <input
              name="nid"
              placeholder="e.g. 19902692518... or A01234567"
              defaultValue={tenancy?.tenant_nid || unit.tenantNid}
              className={field}
            />
          </Label>

          <div>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Attach Renter NID / Passport Copy (Photo or PDF)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </span>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50/50 hover:border-indigo-300 transition">
                  <Upload className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{nidFiles.length > 0 ? "Add more scans/photos" : "Upload NID Front & Back / Passport (PDF or Images)"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      if (selected.length) {
                        setNidFiles((prev) => [...prev, ...selected]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </label>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports JPG, PNG, WebP or PDF up to 20 MB. Stored privately and securely.
            </p>

            {nidFiles.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Files ready to upload ({nidFiles.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nidFiles.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-mono text-slate-800 shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="max-w-[150px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setNidFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 ml-1 text-sm font-bold cursor-pointer"
                        title="Remove file"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tenancy?.nid_files && tenancy.nid_files.length > 0 && (
              <div className="mt-2.5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Existing Attached NID Documents
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tenancy.nid_files.map((file) => (
                    <span
                      key={file.path}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-mono text-emerald-800 shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label title="First rental month *">
            <input
              type="month"
              name="start"
              required
              defaultValue={tenancy?.start_month.slice(0, 7) || currentMonth()}
              className={field}
            />
          </Label>
          <Label title="Last rental month (optional)">
            <input
              type="month"
              name="end"
              defaultValue={tenancy?.end_month?.slice(0, 7)}
              className={field}
            />
          </Label>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
            <span className="font-bold text-xs text-indigo-950">
              Monthly Rent & Bills Breakdown (How much they pay)
            </span>
            <span className="text-[11px] text-indigo-600 font-semibold font-mono">
              Total: {money(totalCalculated)}/mo
            </span>
          </div>

          <div>
            <Label title="Monthly Base Rent (৳ BDT) *">
              <input
                type="number"
                min="0"
                step="1"
                required={!tenancy}
                placeholder="e.g. 25000"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className={`${field} font-bold font-mono text-slate-900`}
              />
            </Label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Label title="Service charge">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className={`${field} text-xs font-mono`}
              />
            </Label>
            <Label title="Gas bill">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={gasBill}
                onChange={(e) => setGasBill(e.target.value)}
                className={`${field} text-xs font-mono`}
              />
            </Label>
            <Label title="Electricity">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={electricityBill}
                onChange={(e) => setElectricityBill(e.target.value)}
                className={`${field} text-xs font-mono`}
              />
            </Label>
            <Label title="Water bill">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={waterBill}
                onChange={(e) => setWaterBill(e.target.value)}
                className={`${field} text-xs font-mono`}
              />
            </Label>
          </div>
        </div>

        <button disabled={busy} className={primary}>
          {busy ? "Saving…" : "Save Renter & Rent Rate"}
        </button>
      </form>
    </Modal>
  );
}

export function ScheduleForm({ tenancy, schedule, schedules, done, close }: FormProps & { tenancy: RentalTenancy; schedule?: RentSchedule; schedules: RentSchedule[] }) {
  const { busy, error, save } = useSave(done);
  const [base, setBase] = useState(String(schedule?.base_rent ?? ""));
  const [charges, setCharges] = useState<RentCharge[]>(schedule?.charges || []);
  const total = sumMoney([Number(base) || 0, ...charges.map(c => Number(c.amount) || 0)]);
  return <Modal title={`${schedule ? "Edit" : "Add"} rent period · ${tenancy.tenant_name}`} close={() => !busy && close()}><form className="space-y-4" onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    void save(() => saveRentSchedule({ id: schedule?.id, tenancy_id: tenancy.id, from_month: value(f, "from"), to_month: value(f, "to") || null, base_rent: Number(base), charges }, schedules));
  }}><FormError error={error} /><div className="grid grid-cols-2 gap-3"><Label title="From month *"><input type="month" name="from" required min={tenancy.start_month.slice(0, 7)} defaultValue={schedule?.from_month.slice(0, 7) || tenancy.start_month.slice(0, 7)} className={field} /></Label><Label title="Through month (inclusive)"><input type="month" name="to" defaultValue={schedule?.to_month?.slice(0, 7) || ""} className={field} /></Label></div>
    <p className="text-xs text-slate-500">Leave the end month blank for an ongoing rate. Before an increase, end the previous rate in the preceding month, then add the new period. Earlier months keep their own rates.</p>
    <Label title="Base rent (BDT) *"><input required type="number" min="0" step="0.01" value={base} onChange={e => setBase(e.target.value)} className={field} /></Label>
    <div className="space-y-2"><h3 className="text-sm font-semibold">Optional monthly breakdown</h3><datalist id="charge-names"><option>Service charge</option><option>Gas bill</option><option>Electricity bill</option><option>Water bill</option><option>Parking</option></datalist>
    {charges.map((c, i) => <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2"><input aria-label={`Charge ${i + 1} name`} required list="charge-names" value={c.label} onChange={e => setCharges(charges.map((x, j) => i === j ? { ...x, label: e.target.value } : x))} className={field} /><input aria-label={`Charge ${i + 1} amount`} required type="number" min="0" step="0.01" value={c.amount} onChange={e => setCharges(charges.map((x, j) => i === j ? { ...x, amount: Number(e.target.value) } : x))} className={field} /><button type="button" className={button} onClick={() => setCharges(charges.filter((_, j) => i !== j))}>Remove</button></div>)}
    <button type="button" className={button} onClick={() => setCharges([...charges, { label: "", amount: 0 }])}>+ Add charge</button></div>
    <p className="rounded-xl bg-indigo-50 p-4 text-lg font-semibold">Monthly total: {money(total)}</p><p className="text-xs text-slate-500">Charges apply to each month in this period. For a variable utility bill, add a rate period covering that month.</p><button disabled={busy} className={primary}>{busy ? "Saving…" : "Save rent period"}</button>
  </form></Modal>;
}

export const propertyDocumentTypes = [
  "Title deed / Sale deed (Dalil / দলিল)",
  "Khatian / Record of rights (CS, SA, RS, BS খতিয়ান)",
  "Mutation / Namjari (নামজারি)",
  "Land development tax receipt (Dakhila / দাখিলা)",
  "Holding tax receipt (হোল্ডিং ট্যাক্স)",
  "Lease / Tenancy agreement (ভাড়া চুক্তিপত্র)",
  "Renter NID / Passport (ভাড়াটিয়ার এনআইডি)",
  "Utility connection document (WASA / DESCO / Titas)",
  "Approved building plan (RAJUK / CDA)",
  "Occupancy / Completion certificate",
  "Other"
];

export function DocumentForm({
  propertyId,
  preset,
  done,
  close,
}: FormProps & { propertyId: string; preset?: { name: string; category: string } }) {
  const { busy, error, save } = useSave(done);
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Modal
      title={preset ? `Add ${preset.name}` : "Add property document"}
      close={() => !busy && close()}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void save(
            () =>
              savePropertyDocument(
                {
                  property_id: propertyId,
                  category: value(f, "category"),
                  name: value(f, "name"),
                  document_number: value(f, "number"),
                  issue_date: value(f, "issue") || null,
                  expiry_date: value(f, "expiry") || null,
                  notes: value(f, "notes"),
                },
                files
              )
          );
        }}
      >
        <FormError error={error} />
        <Label title="Document category">
          <select
            name="category"
            defaultValue={preset?.category || propertyDocumentTypes[0]}
            className={field}
          >
            {propertyDocumentTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Label>
        <Label title="Document title *">
          <input
            name="name"
            required
            defaultValue={preset?.name || ""}
            className={field}
            placeholder="e.g. Registered Sale Deed 4529/2021"
          />
        </Label>
        <Label title="Document / deed / receipt number (optional)">
          <input
            name="number"
            className={field}
            placeholder="e.g. Khatian # 1042 / Deed # 8421"
          />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label title="Issue date">
            <input name="issue" type="date" className={field} />
          </Label>
          <Label title="Expiry / renewal date (if any)">
            <input name="expiry" type="date" className={field} />
          </Label>
        </div>
        <Label title="Scan / PDF attachments">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className={field}
          />
        </Label>
        <Label title="Notes / Location of Original">
          <textarea
            name="notes"
            placeholder="e.g. Original deed kept in bank locker, mutation fee paid"
            className={field}
          />
        </Label>
        <p className="text-xs text-slate-500">
          Attachments are private. Each file can be up to 20 MB.
        </p>
        <button disabled={busy} className={primary}>
          {busy ? "Uploading…" : "Save document"}
        </button>
      </form>
    </Modal>
  );
}

export function MaintenanceForm({ propertyId, units, done, close }: FormProps & { propertyId: string; units: PropertyUnit[] }) {
  const { busy, error, save } = useSave(done);
  const [files, setFiles] = useState<File[]>([]), [scanning, setScanning] = useState(false), [progress, setProgress] = useState("");
  const [scanError, setScanError] = useState("");
  const [amount, setAmount] = useState(""), [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [vendor, setVendor] = useState(""), [category, setCategory] = useState("Maintenance"), [text, setText] = useState(""), [reviewed, setReviewed] = useState(false);
  const scan = async (file: File) => {
    setScanning(true); setScanError(""); setReviewed(false); setText(""); setProgress("Preparing text recognition…");
    try {
      const result = await scanMaintenanceReceipt(file, setProgress);
      setText(result.text); setAmount(result.amount === undefined ? "" : String(result.amount));
      if (result.date) setDate(result.date); if (result.vendor) setVendor(result.vendor); if (result.category) setCategory(result.category);
      if (result.amount === undefined) setScanError(result.ambiguousTotal ? "Several totals found. Enter the correct bill total after reviewing the receipt." : "No clear total found. Enter the cost from the receipt.");
    } catch (e) { setScanError(errorMessage(e)); }
    finally { setScanning(false); setProgress(""); }
  };
  return <Modal title="Add maintenance expense" close={() => !busy && !scanning && close()}><form className="space-y-4" onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    void save(() => saveRentalMaintenance({ property_id: propertyId, unit_id: value(f, "unit") || null, date, category: category.trim(), amount: Number(amount), vendor, description: value(f, "description"), payment_method: value(f, "method"), extracted_text: text }, files));
  }}><FormError error={error} /><Label title="Flat / room (optional)"><select name="unit" className={field}><option value="">Entire property / common areas</option>{units.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}</select></Label>
    <Label title="Receipt images / PDFs"><input type="file" multiple disabled={scanning || busy} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => { setFiles(Array.from(e.target.files || [])); setText(""); setReviewed(false); setScanError(""); }} className={field} /></Label>
    {files.map((file, i) => <div key={i} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{file.name}</span><button type="button" disabled={scanning || busy} className={button} onClick={() => void scan(file)}>Extract text & cost</button></div>)}
    <p className="text-xs text-slate-500">Scan one receipt per expense. Additional files can be supporting pages. Recognition runs in your browser; English and Bangla language files download on first use.</p>
    {scanning && <p role="status" className="text-sm text-indigo-700">{progress}</p>}{scanError && <p role="status" className="text-sm text-amber-800">{scanError}</p>}
    {text && <><details open><summary className="text-sm font-semibold">Extracted text</summary><textarea readOnly value={text} className={`${field} mt-2 h-32`} /></details><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I checked the extracted amount and details against the receipt.</label></>}
    <div className="grid grid-cols-2 gap-3"><Label title="Maintenance category *"><input required list="maintenance-categories" value={category} onChange={e => setCategory(e.target.value)} className={field} /><datalist id="maintenance-categories"><option>Plumbing</option><option>Electrical</option><option>Painting</option><option>Cleaning</option><option>Lift servicing</option><option>Security</option></datalist></Label><Label title="Total cost (BDT) *"><input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={field} /></Label><Label title="Expense date *"><input required type="date" value={date} onChange={e => setDate(e.target.value)} className={field} /></Label><Label title="Vendor / contractor"><input value={vendor} onChange={e => setVendor(e.target.value)} className={field} /></Label></div><Label title="Work description"><textarea name="description" className={field} /></Label><Label title="Payment method"><select name="method" className={field}><option>Cash</option><option>Bank Transfer</option><option>bKash</option><option>Nagad</option></select></Label><button disabled={busy || scanning || (!!text && !reviewed)} className={primary}>{busy ? "Saving…" : "Save maintenance expense"}</button>
  </form></Modal>;
}
