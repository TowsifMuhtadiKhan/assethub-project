import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import { SqlSetupBanner } from "../components/common/SqlSetupBanner";
import {
  listProperties,
  createProperty,
  listPropertyUnits,
  createPropertyUnit,
  updatePropertyUnit,
  addRentPayment,
} from "../services/propertyService";
import type { Property, PropertyUnit } from "../types";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900";

export function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [selected, setSelected] = useState<Property>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unitGroups, setUnitGroups] = useState([{ type: "Room", count: 1 }]);

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch(showError)
      .finally(() => setLoading(false));
  }, []);

  const showError = (value: unknown) =>
    setError(value instanceof Error ? value.message : "Something went wrong.");

  const loadUnits = async (property: Property) => {
    setSelected(property);
    try {
      setUnits(await listPropertyUnits(property.id));
    } catch (value) {
      showError(value);
    }
  };

  const saveProperty = async (event: React.FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    event.preventDefault();
    setError("");
    const form = new FormData(formElement);
    const count = unitGroups.reduce((total, group) => total + group.count, 0);
    try {
      const property = await createProperty({
        name: String(form.get("name")),
        location: String(form.get("location")),
        type: String(form.get("type")),
        unitsCount: count,
        occupancyRate: 0,
      });

      const createdUnits: PropertyUnit[] = [];
      for (const group of unitGroups) {
        for (let index = 1; index <= group.count; index += 1) {
          createdUnits.push(
            await createPropertyUnit({
              propertyId: property.id,
              unitNumber: `${group.type} ${index}`,
              unitType: group.type,
              monthlyRent: 0,
              tenantName: "",
            }),
          );
        }
      }

      setProperties((current) => [property, ...current]);
      formElement?.reset?.();
      setOpen(false);
      setUnitGroups([{ type: "Room", count: 1 }]);
      setSelected(property);
      setUnits(createdUnits);
    } catch (value) {
      showError(value);
    }
  };

  const updateUnit = async (
    unit: PropertyUnit,
    fieldName: "tenantName" | "monthlyRent",
    value: string,
  ) => {
    if (!selected) return;
    try {
      const updated = await updatePropertyUnit(unit.id, {
        [fieldName]: fieldName === "monthlyRent" ? Number(value) : value,
      });
      setUnits((current) =>
        current.map((item) =>
          item.id === unit.id ? { ...item, ...updated } : item,
        ),
      );
    } catch (value) {
      showError(value);
    }
  };

  const addRent = async (
    unit: PropertyUnit,
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    const formElement = event.currentTarget;
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(formElement);
    try {
      const payment = await addRentPayment({
        unitId: unit.id,
        month: String(form.get("month")),
        amountPaid: Number(form.get("amountPaid")),
      });
      setUnits((current) =>
        current.map((item) =>
          item.id === unit.id
            ? { ...item, rentPayments: [...(item.rentPayments ?? []), payment] }
            : item,
        ),
      );
      formElement?.reset?.();
    } catch (value) {
      showError(value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Real Estate & Rental Properties
          </h1>
          <p className="text-xs text-slate-500">
            Manage flats, plots, commercial floors, tenants, and monthly rent collections.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> Add Property
        </button>
      </div>

      {/* Database Setup Banner */}
      <SqlSetupBanner error={error} />

      {error && !error.toLowerCase().includes("could not find the table") && !error.includes("PGRST205") && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading properties...</div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No properties added yet. Click "Add Property" to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Property</th>
                  <th className="px-3.5 py-2.5">Location</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Units</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">{property.name}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{property.location}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                        {property.type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">{property.unitsCount} units</td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => void loadUnits(property)}
                        className="rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Manage units →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            {selected.name} units and rent
          </h2>
          {units.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No units generated.</p>
          ) : (
            <table className="mt-4 min-w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Unit</th>
                  <th className="py-3 pr-4">Tenant / rent name</th>
                  <th className="py-3 pr-4">Monthly rent</th>
                  <th className="py-3 pr-4">Month paid</th>
                  <th className="py-3">Amount paid</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-semibold">
                      {unit.unitNumber} · {unit.unitType}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        defaultValue={unit.tenantName}
                        onBlur={(event) =>
                          void updateUnit(
                            unit,
                            "tenantName",
                            event.target.value,
                          )
                        }
                        placeholder="Tenant name"
                        className={field}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        defaultValue={Number(unit.monthlyRent)}
                        onBlur={(event) =>
                          void updateUnit(
                            unit,
                            "monthlyRent",
                            event.target.value,
                          )
                        }
                        placeholder="Rent amount"
                        className={`${field} w-32`}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <form
                        onSubmit={(event) => void addRent(unit, event)}
                        className="flex gap-2"
                      >
                        <input
                          name="month"
                          type="month"
                          required
                          className={`${field} w-36`}
                        />
                        <input
                          name="amountPaid"
                          type="number"
                          min="0"
                          required
                          placeholder="Amount"
                          className={`${field} w-28`}
                        />
                        <button className="rounded-xl bg-cyan-600 px-3 py-2 text-white">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="py-3">
                      {unit.rentPayments?.map((payment) => (
                        <div
                          key={payment.id}
                          className="text-xs text-slate-500"
                        >
                          {payment.month}: {String(payment.amountPaid)}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onMouseDown={() => setOpen(false)}
        >
          <form
            onSubmit={saveProperty}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Add Property
                  </span>
                  <span className="text-xs text-slate-400 font-mono">LN-PROP</span>
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                  New Property & Units
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property Name <span className="text-rose-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Green Tower, Dhanmondi Residence"
                  className={field}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location / Address <span className="text-rose-500">*</span>
                </label>
                <input
                  name="location"
                  required
                  placeholder="e.g. Road 12, Banani, Dhaka"
                  className={field}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property Type <span className="text-rose-500">*</span>
                </label>
                <FormControl size="small" fullWidth>
                  <Select
                    name="type"
                    defaultValue="Residential"
                    sx={{
                      fontSize: "0.75rem",
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      borderRadius: "0.75rem",
                      backgroundColor: "#f8fafc",
                      "& .MuiSelect-select": {
                        fontSize: "0.75rem",
                        py: "8px",
                      },
                    }}
                  >
                    <MenuItem value="Residential" sx={{ fontSize: "0.75rem" }}>Residential</MenuItem>
                    <MenuItem value="Commercial" sx={{ fontSize: "0.75rem" }}>Commercial</MenuItem>
                    <MenuItem value="Mixed use" sx={{ fontSize: "0.75rem" }}>Mixed use</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Unit Groups
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setUnitGroups((groups) => [
                        ...groups,
                        { type: "Room", count: 1 },
                      ])
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    + Add Another Type
                  </button>
                </div>
                {unitGroups.map((group, index) => (
                  <div
                    key={`${index}-${group.type}`}
                    className="grid grid-cols-[1fr_100px_auto] gap-2 items-center"
                  >
                    <FormControl size="small" fullWidth>
                      <Select
                        value={group.type}
                        onChange={(event) =>
                          setUnitGroups((groups) =>
                            groups.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, type: event.target.value }
                                : item,
                            ),
                          )
                        }
                        sx={{
                          fontSize: "0.75rem",
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                          borderRadius: "0.75rem",
                          backgroundColor: "#f8fafc",
                          "& .MuiSelect-select": {
                            fontSize: "0.75rem",
                            py: "8px",
                          },
                        }}
                      >
                        <MenuItem value="Room" sx={{ fontSize: "0.75rem" }}>Room</MenuItem>
                        <MenuItem value="Shop" sx={{ fontSize: "0.75rem" }}>Shop</MenuItem>
                        <MenuItem value="Floor" sx={{ fontSize: "0.75rem" }}>Floor</MenuItem>
                        <MenuItem value="Flat" sx={{ fontSize: "0.75rem" }}>Flat</MenuItem>
                        <MenuItem value="Office" sx={{ fontSize: "0.75rem" }}>Office</MenuItem>
                        <MenuItem value="Warehouse" sx={{ fontSize: "0.75rem" }}>Warehouse</MenuItem>
                        <MenuItem value="Other" sx={{ fontSize: "0.75rem" }}>Other</MenuItem>
                      </Select>
                    </FormControl>
                    <input
                      type="number"
                      min="1"
                      value={group.count}
                      onChange={(event) =>
                        setUnitGroups((groups) =>
                          groups.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  count: Number(event.target.value) || 1,
                                }
                              : item,
                          ),
                        )
                      }
                      className={field}
                      aria-label={`${group.type} quantity`}
                    />
                    <button
                      type="button"
                      disabled={unitGroups.length === 1}
                      onClick={() =>
                        setUnitGroups((groups) =>
                          groups.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="px-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer text-lg leading-none"
                      aria-label="Remove unit group"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Example: Room 40, Shop 5, Floor 1.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  Create Property & Units
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
