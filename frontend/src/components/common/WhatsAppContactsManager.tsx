import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Phone, Star, Edit2, X, Check, Users } from "lucide-react";
import type { WhatsAppContact } from "../../types";

interface WhatsAppContactsManagerProps {
  contacts: WhatsAppContact[];
  onChange: (contacts: WhatsAppContact[]) => void;
  className?: string;
}

export function WhatsAppContactsManager({
  contacts,
  onChange,
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

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanPhone = newPhone.trim().replace(/\s+/g, "");
    const cleanAlias = newAlias.trim();

    if (!cleanAlias) {
      setErrorMsg("Please enter an alias for this number (e.g. Personal, Driver, Spouse).");
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg("Please enter a valid WhatsApp phone number.");
      return;
    }

    const newContact: WhatsAppContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      alias: cleanAlias,
      phone: cleanPhone,
      countryCode: newCountryCode.trim() || "+880",
      isDefault: newIsDefault || contacts.length === 0,
    };

    let updated = [...contacts];
    if (newContact.isDefault) {
      updated = updated.map((c) => ({ ...c, isDefault: false }));
    }
    updated.push(newContact);

    onChange(updated);
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
    onChange(updated);
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
    onChange(updated);
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
    onChange(updated);
    setEditingId(null);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-emerald-600" />
            Recipient WhatsApp Numbers & Aliases ({contacts.length})
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Register multiple WhatsApp numbers with aliases (e.g. Personal, Driver, Family, Caretaker) to select single or multiple numbers for any asset alert.
          </p>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Number with Alias</span>
          </button>
        )}
      </div>

      {/* Contact Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {contacts.map((contact) => {
          const isEditing = editingId === contact.id;

          if (isEditing) {
            return (
              <div
                key={contact.id}
                className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/30 space-y-2 shadow-2xs"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Alias Name
                    </label>
                    <input
                      type="text"
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="e.g. Personal, Driver"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 font-semibold focus:border-emerald-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Phone Number
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editCountryCode}
                        onChange={(e) => setEditCountryCode(e.target.value)}
                        className="w-12 rounded-lg border border-slate-200 bg-slate-100 px-1 py-1 text-[11px] text-center font-mono font-semibold"
                      />
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900 focus:border-emerald-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-slate-500 hover:bg-slate-200 text-xs transition cursor-pointer"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(contact.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={contact.id}
              className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                contact.isDefault
                  ? "border-emerald-300 bg-emerald-50/50 shadow-2xs"
                  : "border-slate-200/90 bg-white hover:border-slate-300"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-slate-900 font-mono">
                    {contact.alias}
                  </span>
                  {contact.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
                      Primary Default
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                  <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>
                    {contact.countryCode || "+880"} {contact.phone}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!contact.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(contact.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold transition cursor-pointer"
                    title="Set as Primary Default"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => startEdit(contact)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Edit contact"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Contact Modal / Inline Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddContact}
          className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3 transition"
        >
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-emerald-600" />
              Add New WhatsApp Recipient Number
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alias / Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                placeholder="e.g. Driver - Kabir, Spouse, Office"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Country Code
              </label>
              <input
                type="text"
                value={newCountryCode}
                onChange={(e) => setNewCountryCode(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-center font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. 01812345678"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Set as Primary Default Number</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Contact</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
              {errorMsg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
