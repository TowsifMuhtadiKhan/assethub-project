import { useState, useEffect } from "react";
import { Users, Check } from "lucide-react";
import { getLocalWhatsAppContacts } from "../../services/settingsService";
import type { WhatsAppContact } from "../../types";

interface ItemRecipientSelectorProps {
  selectedRecipients: string[];
  onChange: (recipients: string[]) => void;
  label?: string;
  helperText?: string;
}

export function ItemRecipientSelector({
  selectedRecipients,
  onChange,
  label = "Send Alert To (Recipients)",
  helperText = "Select which number(s) will receive this reminder.",
}: ItemRecipientSelectorProps) {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);

  useEffect(() => {
    const list = getLocalWhatsAppContacts();
    if (list.length > 0) {
      setContacts(list);
      // If nothing selected yet, select primary default
      if (selectedRecipients.length === 0) {
        const def = list.find((c) => c.isDefault) || list[0];
        if (def) {
          onChange([def.alias]);
        }
      }
    } else {
      // Fallback
      setContacts([
        {
          id: "default",
          alias: "Personal",
          phone: "01777785590",
          countryCode: "+880",
          isDefault: true,
        },
      ]);
      if (selectedRecipients.length === 0) {
        onChange(["Personal"]);
      }
    }
  }, []);

  const isAllSelected =
    contacts.length > 0 && contacts.every((c) => selectedRecipients.includes(c.alias));

  const toggleAll = () => {
    if (isAllSelected) {
      // Keep at least default or none
      const def = contacts.find((c) => c.isDefault) || contacts[0];
      onChange(def ? [def.alias] : []);
    } else {
      onChange(contacts.map((c) => c.alias));
    }
  };

  const toggleRecipient = (alias: string) => {
    if (selectedRecipients.includes(alias)) {
      if (selectedRecipients.length === 1) {
        // Don't deselect last recipient, or allow empty
        onChange([]);
      } else {
        onChange(selectedRecipients.filter((r) => r !== alias));
      }
    } else {
      onChange([...selectedRecipients, alias]);
    }
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </label>
        {contacts.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            {isAllSelected ? "Deselect All" : "Select All Numbers"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {contacts.map((c) => {
          const isSelected = selectedRecipients.includes(c.alias);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleRecipient(c.alias)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                isSelected ? "border-white bg-white/20 text-white" : "border-slate-300 bg-white"
              }`}>
                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </span>
              <span>{c.alias}</span>
              <span className={`text-[10px] font-mono ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                ({c.phone.slice(-4)})
              </span>
            </button>
          );
        })}
      </div>

      {helperText && (
        <p className="text-[10px] text-slate-400">
          {helperText} Configure additional number aliases in Settings.
        </p>
      )}
    </div>
  );
}
