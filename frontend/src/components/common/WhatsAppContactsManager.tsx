import React, { useState } from "react";
import { Plus, Trash2, Phone, Star, Edit2, X } from "lucide-react";
import type { WhatsAppContact } from "../../types";
import { saveLocalWhatsAppContacts } from "../../services/settingsService";

interface WhatsAppContactsManagerProps {
  contacts: WhatsAppContact[];
  onChange: (contacts: WhatsAppContact[]) => void;
  onAutoSave?: (contacts: WhatsAppContact[]) => void;
  className?: string;
}

export function WhatsAppContactsManager({
  contacts,
  onChange,
  onAutoSave,
  className = "",
}: WhatsAppContactsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("+880");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("+880");

  const handleAddContact = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && "preventDefault" in e) e.preventDefault();
    setErrorMsg("");

    const cleanPhone = newPhone.trim().replace(/\s+/g, "");
    const cleanAlias = newAlias.trim();

    if (!cleanAlias) {
      setErrorMsg("Please enter an alias name.");
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }

    const exists = contacts.some(
      (c) => c.alias.trim().toLowerCase() === cleanAlias.toLowerCase(),
    );
    if (exists) {
      setErrorMsg(`An alias named "${cleanAlias}" already exists.`);
      return;
    }

    const newContact: WhatsAppContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alias: cleanAlias,
      phone: cleanPhone,
      countryCode: newCountryCode.trim() || "+880",
      isDefault: newIsDefault,
    };

    let updated = [...contacts];
    if (newContact.isDefault) {
      updated = updated.map((c) => ({ ...c, isDefault: false }));
    }
    updated.push(newContact);

    saveLocalWhatsAppContacts(updated);
    onChange(updated);
    if (onAutoSave) onAutoSave(updated);

    setNewAlias("");
    setNewPhone("");
    setNewIsDefault(false);
    setShowAddForm(false);
  };

  const handleSetDefault = (id: string) => {
    const updated = contacts.map((c) => ({
      ...c,
      isDefault: c.id === id,
    }));
    saveLocalWhatsAppContacts(updated);
    onChange(updated);
    if (onAutoSave) onAutoSave(updated);
  };

  const handleDelete = (id: string) => {
    if (contacts.length <= 1) {
      alert("At least one WhatsApp recipient number must be preserved.");
      return;
    }
    const target = contacts.find((c) => c.id === id);
    const updated = contacts.filter((c) => c.id !== id);
    if (target?.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    saveLocalWhatsAppContacts(updated);
    onChange(updated);
    if (onAutoSave) onAutoSave(updated);
  };

  const startEdit = (c: WhatsAppContact) => {
    setEditingId(c.id);
    setEditAlias(c.alias);
    setEditPhone(c.phone);
    setEditCountryCode(c.countryCode || "+880");
  };

  const saveEdit = (id: string) => {
    const cleanAlias = editAlias.trim();
    const cleanPhone = editPhone.trim().replace(/\s+/g, "");
    if (!cleanAlias || !cleanPhone) return;

    const updated = contacts.map((c) =>
      c.id === id
        ? {
            ...c,
            alias: cleanAlias,
            phone: cleanPhone,
            countryCode: editCountryCode.trim() || "+880",
          }
        : c,
    );
    saveLocalWhatsAppContacts(updated);
    onChange(updated);
    if (onAutoSave) onAutoSave(updated);
    setEditingId(null);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Alert Recipients</h3>
          <p className="text-[11px] text-slate-500">
            Registered phone numbers that receive automated notifications.
          </p>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span>Add Number</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Add New Recipient</span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setErrorMsg("");
              }}
              className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Alias (e.g. Wife, Driver)
              </label>
              <input
                type="text"
                required
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="Personal"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Country Code
              </label>
              <input
                type="text"
                value={newCountryCode}
                onChange={(e) => setNewCountryCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-center font-mono font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span>Set as primary default</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMsg("");
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAddContact()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium">
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {/* Compact List of Numbers */}
      <div className="rounded-xl border border-slate-200/90 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs">
        {contacts.map((contact) => {
          const isEditing = editingId === contact.id;

          if (isEditing) {
            return (
              <div key={contact.id} className="p-3 bg-slate-50/70 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editAlias}
                    onChange={(e) => setEditAlias(e.target.value)}
                    placeholder="Alias"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 font-semibold focus:border-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-mono font-semibold"
                  />
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-900 focus:border-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1 rounded text-slate-500 hover:bg-slate-200 text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(contact.id)}
                    className="px-3 py-1 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {contact.alias}
                    </span>
                    {contact.isDefault && (
                      <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.2 text-[9px] font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {contact.countryCode || "+880"} {contact.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!contact.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(contact.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition cursor-pointer"
                    title="Make Default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(contact)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
