import { listTasks } from "./taskService";
import { listDocuments } from "./documentService";
import { listVehicles } from "./vehicleService";
import { listProperties, listAllPropertyUnits } from "./propertyService";
import { listWarranties } from "./warrantyService";
import { listFamilyMembers } from "./familyService";
import { listDailyExpenses, listMemberLoans } from "./dailyExpenseService";
import type {
  TaskItem,
  DocumentItem,
  Vehicle,
  Property,
  PropertyUnit,
  WarrantyItem,
  FamilyMember,
  DailyExpense,
  MemberLoan,
} from "../types";

export type AiContextData = {
  familyMembers: FamilyMember[];
  tasks: TaskItem[];
  documents: DocumentItem[];
  vehicles: Vehicle[];
  properties: Property[];
  units: PropertyUnit[];
  warranties: WarrantyItem[];
  expenses: DailyExpense[];
  loans: MemberLoan[];
};

export type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

const GEMINI_KEY_STORAGE = "lifenest_gemini_api_key";

export function getStoredGeminiKey(): string {
  try {
    return (
      localStorage.getItem(GEMINI_KEY_STORAGE) ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ""
    );
  } catch {
    return "";
  }
}

export function saveStoredGeminiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } catch {}
}

/**
 * Fetch all available user data across domains to feed into the AI context
 */
export async function loadFullAiContext(): Promise<AiContextData> {
  const [
    familyMembers,
    tasks,
    documents,
    vehicles,
    properties,
    units,
    warranties,
    expenses,
    loans,
  ] = await Promise.all([
    listFamilyMembers().catch(() => []),
    listTasks().catch(() => []),
    listDocuments().catch(() => []),
    listVehicles().catch(() => []),
    listProperties().catch(() => []),
    listAllPropertyUnits().catch(() => []),
    listWarranties().catch(() => []),
    listDailyExpenses().catch(() => []),
    listMemberLoans().catch(() => []),
  ]);

  return {
    familyMembers,
    tasks,
    documents,
    vehicles,
    properties,
    units,
    warranties,
    expenses,
    loans,
  };
}

/**
 * Format structured data into a prompt-friendly context summary
 */
function buildSystemContextText(data: AiContextData): string {
  const familySummary = data.familyMembers
    .map(
      (m) =>
        `- ${m.fullName} (${m.relationship || "Member"}): Phone: ${m.phone || "N/A"}, Email: ${m.email || "N/A"}, Notes: ${m.notes || "None"}`,
    )
    .join("\n");

  const pendingTasks = data.tasks.filter((t) => t.status !== "Completed");
  const tasksSummary = pendingTasks
    .map(
      (t) =>
        `- "${t.title}" (Priority: ${t.priority || "Medium"}, Due: ${t.dueDate || "No date"}${t.dueTime ? " " + t.dueTime : ""}, Assignee: ${t.familyMemberName || "Self"}, Category: ${t.category || "General"})`,
    )
    .join("\n");

  const docsSummary = data.documents
    .map(
      (d) =>
        `- "${d.name}" (${d.category}): Expiry: ${d.expiryDate || "None/Lifetime"}, Authority: ${d.issuingAuthority || "N/A"}, Number: ${d.documentNumber || "N/A"}, Person: ${d.familyMemberName || "Family"}`,
    )
    .join("\n");

  const vehiclesSummary = data.vehicles
    .map(
      (v) =>
        `- ${v.name} (${v.brand} ${v.model}, ${v.type || "Vehicle"}, Reg: ${v.registrationNumber || "Unregistered"}): Chassis/VIN: ${v.chassisNumber || "N/A"}, Engine No: ${v.engineNumber || "N/A"}, Fitness Expiry: ${v.fitnessExpiry || "N/A"}, Tax Token Expiry: ${v.taxTokenExpiry || "N/A"}, Insurance Expiry: ${v.insuranceExpiry || "N/A"}, Mileage: ${v.mileage || 0} km, Year: ${v.year || "N/A"}, Color: ${v.color || "N/A"}`,
    )
    .join("\n");

  const unitsSummary = data.units
    .map(
      (u) =>
        `- Unit ${u.unitNumber} (${u.unitName || "Flat"}, Status: ${u.status}): Rent: ৳${u.monthlyRent || 0}/mo, Tenant: ${u.tenantName || u.currentTenant || "Vacant"}, Phone: ${u.tenantPhone || "N/A"}`,
    )
    .join("\n");

  const warrantiesSummary = data.warranties
    .map(
      (w) =>
        `- "${w.productName}" (${w.category || "Product"}): Expiry: ${w.expiryDate || "N/A"}, Seller: ${w.seller || "N/A"}, Status: ${w.status || "Active"}`,
    )
    .join("\n");

  const totalSpent = data.expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const expensesSummary = `Total Recorded: ৳${totalSpent.toLocaleString()} across ${data.expenses.length} transactions. Recent entries: ${data.expenses
    .slice(0, 5)
    .map((e) => `${e.description || e.category} (৳${e.amount} on ${e.date})`)
    .join("; ")}`;

  return `
### CURRENT USER REAL-TIME RECORDS:
Today's Date: ${new Date().toISOString().split("T")[0]}

[FAMILY MEMBERS (${data.familyMembers.length})]
${familySummary || "No family members registered."}

[ACTIVE TASKS (${pendingTasks.length} pending of ${data.tasks.length} total)]
${tasksSummary || "No pending tasks."}

[VAULT DOCUMENTS (${data.documents.length})]
${docsSummary || "No documents in vault."}

[VEHICLES & FLEET (${data.vehicles.length})]
${vehiclesSummary || "No vehicles registered."}

[REAL ESTATE & RENTAL UNITS (${data.units.length})]
${unitsSummary || "No rental units."}

[WARRANTIES & CLAIMS (${data.warranties.length})]
${warrantiesSummary || "No warranties recorded."}

[DAILY EXPENSES & LOANS]
${expensesSummary}
Active Loans: ${data.loans.length} recorded.
`;
}

/**
 * Built-in Intelligent Local Query Analyzer
 * Runs 100% offline & without external API keys, answering queries grounded strictly in live user records.
 */
function runBuiltInContextQuery(query: string, data: AiContextData): string {
  const q = query.toLowerCase().trim();

  // 1. Executive / General Overview
  if (
    q.includes("overview") ||
    q.includes("summary") ||
    q.includes("attention") ||
    q.includes("status") ||
    q.includes("what's up") ||
    q.includes("dashboard")
  ) {
    const pendingTasks = data.tasks.filter((t) => t.status !== "Completed");
    const urgentTasks = pendingTasks.filter((t) => t.priority === "Urgent" || t.priority === "High");
    const expiringDocs = data.documents.filter((d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return days > 0 && days <= 30;
    });

    return `### 📊 LifeNest Executive Summary

Here is the current snapshot of your personal and family hub:

* **Tasks:** **${pendingTasks.length} pending** (${urgentTasks.length} marked High/Urgent).
* **Vault Documents:** **${data.documents.length} recorded** (${expiringDocs.length > 0 ? `⚠️ **${expiringDocs.length} expiring within 30 days**` : "all up to date"}).
* **Vehicles & Fleet:** **${data.vehicles.length} vehicle(s)** registered.
* **Properties & Rentals:** **${data.units.length} unit(s)** across **${data.properties.length} property(s)**.
* **Warranties:** **${data.warranties.length} active warranties**.
* **Family Members:** **${data.familyMembers.length} member(s)** enrolled.

*Tip: You can ask me specific questions like "When is my car fitness due?", "Who are my family members?", or "List urgent tasks".*`;
  }

  // 2. Family Members
  if (
    q.includes("family") ||
    q.includes("member") ||
    q.includes("relative") ||
    q.includes("who is in") ||
    q.includes("members")
  ) {
    if (data.familyMembers.length === 0) {
      return `ℹ️ You currently do not have any registered family members. You can add them under **Profile & Family Directory**.`;
    }
    const list = data.familyMembers
      .map(
        (m, idx) =>
          `${idx + 1}. **${m.fullName}** — *${m.relationship || "Member"}*\n   • Phone: \`${m.phone || "Not set"}\`\n   • Email: \`${m.email || "Not set"}\`${m.notes ? `\n   • Notes: ${m.notes}` : ""}`,
      )
      .join("\n\n");
    return `### 👨‍👩‍👧‍👦 Family Access Directory (${data.familyMembers.length} members)\n\n${list}`;
  }

  // 3. Vehicles, Fitness, Tax Token, Servicing, Chassis, Engine
  const isChassisQuery = /chassis|cahasis|chasis|chassi|vin/i.test(q);
  const isEngineQuery = /engine|motor\s*no|engin/i.test(q);
  const isFitnessQuery = /fitness|renewal|brta/i.test(q);
  const isTaxQuery = /tax\s*token|token/i.test(q);
  const isMileageQuery = /mileage|odometer|km|kilometer/i.test(q);
  const isRegQuery = /reg|registration|number\s*plate|plate/i.test(q) && !q.includes("tax");
  const mentionsVehicleKeyword =
    q.includes("vehicle") ||
    q.includes("car") ||
    q.includes("bike") ||
    q.includes("motorcycle") ||
    q.includes("scooter") ||
    q.includes("fleet") ||
    q.includes("fuel");

  const matchesAnyVehicleName = data.vehicles.some(
    (v) =>
      (v.name && q.includes(v.name.toLowerCase())) ||
      (v.brand && q.includes(v.brand.toLowerCase())) ||
      (v.model && q.includes(v.model.toLowerCase())) ||
      (v.registrationNumber && q.includes(v.registrationNumber.toLowerCase())),
  );

  if (
    mentionsVehicleKeyword ||
    isChassisQuery ||
    isEngineQuery ||
    isFitnessQuery ||
    isTaxQuery ||
    isMileageQuery ||
    isRegQuery ||
    matchesAnyVehicleName
  ) {
    if (data.vehicles.length === 0) {
      return `🚗 No vehicles or bikes are currently registered in your fleet. You can add one from **Assets ➔ Vehicles & Fuel**.`;
    }

    // Determine targeted vehicles (e.g. bike, car, specific model/brand/name)
    const targetVehicles = data.vehicles.filter((v) => {
      const vText = `${v.name} ${v.brand} ${v.model} ${v.type}`.toLowerCase();
      if (
        (q.includes("bike") || q.includes("motorcycle") || q.includes("scooter")) &&
        (v.type?.toLowerCase().includes("bike") ||
          v.type?.toLowerCase().includes("motorcycle") ||
          vText.includes("bike") ||
          vText.includes("motorcycle"))
      ) {
        return true;
      }
      if (
        (q.includes("car") || q.includes("auto")) &&
        (v.type?.toLowerCase().includes("car") || vText.includes("car"))
      ) {
        return true;
      }
      if (v.name && q.includes(v.name.toLowerCase())) return true;
      if (v.brand && q.includes(v.brand.toLowerCase())) return true;
      if (v.model && q.includes(v.model.toLowerCase())) return true;
      if (v.registrationNumber && q.includes(v.registrationNumber.toLowerCase())) return true;
      return false;
    });

    const activeList =
      targetVehicles.length > 0
        ? targetVehicles
        : data.vehicles.length === 1
          ? data.vehicles
          : data.vehicles;

    // A. Chassis / VIN query
    if (isChassisQuery) {
      const list = activeList
        .map((v) => {
          const chassis = v.chassisNumber ? `**\`${v.chassisNumber}\`**` : "*Not recorded in system*";
          const engine = v.engineNumber ? `\`${v.engineNumber}\`` : "*N/A*";
          const reg = v.registrationNumber ? `\`${v.registrationNumber}\`` : "*Unregistered*";
          return `* **${v.name}** (${v.brand} ${v.model} • ${v.type || "Vehicle"}):\n  • 🔑 **Chassis / VIN Number:** ${chassis}\n  • ⚙️ Engine Number: ${engine}\n  • 🚘 Registration: ${reg}`;
        })
        .join("\n\n");

      return `### 🔍 Chassis (VIN) Number Details\n\n${list}\n\n*Manage your vehicles anytime in **Assets ➔ Vehicles & Fuel**.*`;
    }

    // B. Engine Number query
    if (isEngineQuery) {
      const list = activeList
        .map((v) => {
          const engine = v.engineNumber ? `**\`${v.engineNumber}\`**` : "*Not recorded in system*";
          const chassis = v.chassisNumber ? `\`${v.chassisNumber}\`` : "*N/A*";
          const reg = v.registrationNumber ? `\`${v.registrationNumber}\`` : "*Unregistered*";
          return `* **${v.name}** (${v.brand} ${v.model} • ${v.type || "Vehicle"}):\n  • ⚙️ **Engine Number:** ${engine}\n  • 🔑 Chassis / VIN: ${chassis}\n  • 🚘 Registration: ${reg}`;
        })
        .join("\n\n");

      return `### ⚙️ Engine Number Details\n\n${list}\n\n*Manage your vehicles anytime in **Assets ➔ Vehicles & Fuel**.*`;
    }

    // C. Registration Number query
    if (isRegQuery) {
      const list = activeList
        .map((v) => {
          const reg = v.registrationNumber ? `**\`${v.registrationNumber}\`**` : "*Not set*";
          return `* **${v.name}** (${v.brand} ${v.model}):\n  • 🚘 **Registration Plate:** ${reg}\n  • Chassis: \`${v.chassisNumber || "N/A"}\``;
        })
        .join("\n\n");

      return `### 🚘 Registration Details\n\n${list}`;
    }

    // D. Fitness query
    if (isFitnessQuery) {
      const list = activeList
        .map((v) => {
          const fitness = v.fitnessExpiry ? `**Due: ${v.fitnessExpiry}**` : "*No renewal scheduled*";
          return `* **${v.name}** (${v.brand} ${v.model}):\n  • 🛠️ **BRTA Fitness Expiry:** ${fitness}\n  • Tax Token Expiry: ${v.taxTokenExpiry || "N/A"}`;
        })
        .join("\n\n");

      return `### 🛠️ BRTA Fitness & Renewal Status\n\n${list}`;
    }

    // E. Tax Token query
    if (isTaxQuery) {
      const list = activeList
        .map((v) => {
          const tax = v.taxTokenExpiry ? `**Due: ${v.taxTokenExpiry}**` : "*No expiry recorded*";
          return `* **${v.name}** (${v.brand} ${v.model}):\n  • 📄 **Tax Token Expiry:** ${tax}\n  • Fitness Expiry: ${v.fitnessExpiry || "N/A"}`;
        })
        .join("\n\n");

      return `### 📄 Tax Token Expiry Status\n\n${list}`;
    }

    // F. Mileage / Odometer query
    if (isMileageQuery) {
      const list = activeList
        .map((v) => `* **${v.name}** (${v.brand} ${v.model}): **\`${v.mileage || 0} km\`**`)
        .join("\n");

      return `### 🛣️ Odometer / Mileage\n\n${list}`;
    }

    // G. General or Fleet listing
    const items = activeList.map((v) => {
      const fitness = v.fitnessExpiry ? `**Due: ${v.fitnessExpiry}**` : "Not scheduled";
      const taxToken = v.taxTokenExpiry ? `**Due: ${v.taxTokenExpiry}**` : "Not scheduled";
      const reg = v.registrationNumber ? `(Reg: ${v.registrationNumber})` : "";
      const chassis = v.chassisNumber ? `\`${v.chassisNumber}\`` : "Not recorded";
      const engine = v.engineNumber ? `\`${v.engineNumber}\`` : "Not recorded";
      return `* **${v.name}** — ${v.brand} ${v.model} ${reg}\n  • Type: *${v.type || "Vehicle"}*\n  • Chassis / VIN: ${chassis}\n  • Engine No: ${engine}\n  • BRTA Fitness Renewal: ${fitness}\n  • Tax Token Expiry: ${taxToken}\n  • Odometer Mileage: \`${v.mileage || 0} km\``;
    });

    const header =
      targetVehicles.length > 0 && targetVehicles.length < data.vehicles.length
        ? `### 🚗 ${targetVehicles.map((v) => v.name).join(", ")} Details`
        : `### 🚗 Fleet & Vehicle Status (${data.vehicles.length} vehicle${data.vehicles.length === 1 ? "" : "s"})`;

    return `${header}\n\n${items.join("\n\n")}`;
  }

  // 4. Tasks, Deadlines, To-Do
  if (
    q.includes("task") ||
    q.includes("todo") ||
    q.includes("to-do") ||
    q.includes("pending") ||
    q.includes("urgent") ||
    q.includes("deadline") ||
    q.includes("schedule")
  ) {
    const pending = data.tasks.filter((t) => t.status !== "Completed");
    if (pending.length === 0) {
      return `✅ **All caught up!** You have 0 pending tasks right now. All ${data.tasks.length} tasks are completed.`;
    }

    const list = pending
      .map(
        (t) =>
          `* [${t.priority}] **${t.title}**\n  • Due: **${t.dueDate || "No due date"}**${t.dueTime ? ` at ${t.dueTime}` : ""}\n  • Assigned to: *${t.familyMemberName || "Self"}*\n  • Category: ${t.category || "General"}`,
      )
      .join("\n\n");

    return `### 📋 Active Tasks & Action Items (${pending.length} pending)\n\n${list}`;
  }

  // 5. Documents, Passports, NIDs, Expiries
  if (
    q.includes("document") ||
    q.includes("passport") ||
    q.includes("nid") ||
    q.includes("license") ||
    q.includes("vault") ||
    q.includes("certificate") ||
    q.includes("expir")
  ) {
    if (data.documents.length === 0) {
      return `📁 Your Document Vault is currently empty. You can securely store passports, NIDs, and contracts in **Vault ➔ Document Vault**.`;
    }

    const expiring = data.documents.filter((d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return days <= 45;
    });

    const docList = (expiring.length > 0 ? expiring : data.documents.slice(0, 8))
      .map(
        (d) =>
          `* **${d.name}** (*${d.category}*)\n  • Expiry: **${d.expiryDate || "Lifetime / No Expiry"}**\n  • Issuing Authority: ${d.issuingAuthority || "N/A"}\n  • Number: \`${d.documentNumber || "N/A"}\``,
      )
      .join("\n\n");

    const header = expiring.length > 0
      ? `### ⚠️ Expiring & Critical Documents (${expiring.length} due soon)`
      : `### 📄 Document Vault Records (${data.documents.length} items)`;

    return `${header}\n\n${docList}`;
  }

  // 6. Properties, Rentals, Tenants, Flats
  if (
    q.includes("property") ||
    q.includes("unit") ||
    q.includes("flat") ||
    q.includes("tenant") ||
    q.includes("rent") ||
    q.includes("rental")
  ) {
    if (data.units.length === 0 && data.properties.length === 0) {
      return `🏢 No properties or rental units recorded. Add your apartments and tenants under **Assets ➔ Properties & Rent**.`;
    }

    const unitsList = data.units.map((u) => {
      const tenant = u.tenantName || u.currentTenant || "Vacant";
      const statusBadge = u.status === "Occupied" ? "🟢 Occupied" : "⚪ Vacant";
      return `* **Unit ${u.unitNumber}** (${u.unitName || "Flat"}): ${statusBadge}\n  • Monthly Rent: **৳${(u.monthlyRent || 0).toLocaleString()}**\n  • Tenant: **${tenant}** ${u.tenantPhone ? `(\`${u.tenantPhone}\`)` : ""}`;
    });

    return `### 🏢 Real Estate & Tenant Roll (${data.units.length} units)\n\n${unitsList.join("\n\n")}`;
  }

  // 7. Warranties
  if (q.includes("warranty") || q.includes("claim") || q.includes("guarantee")) {
    if (data.warranties.length === 0) {
      return `🛡️ No warranties recorded yet. You can track device invoices and warranty coverage under **Assets ➔ Warranties & Claims**.`;
    }

    const list = data.warranties
      .map(
        (w) =>
          `* **${w.productName}** (*${w.category || "Item"}*)\n  • Expiry Date: **${w.expiryDate || "N/A"}**\n  • Seller / Store: ${w.seller || "N/A"}\n  • Status: \`${w.status || "Active"}\``,
      )
      .join("\n\n");

    return `### 🛡️ Product Warranties & Claims (${data.warranties.length} recorded)\n\n${list}`;
  }

  // 8. Expenses & Loans
  if (
    q.includes("expense") ||
    q.includes("spent") ||
    q.includes("cost") ||
    q.includes("money") ||
    q.includes("loan") ||
    q.includes("emi")
  ) {
    const total = data.expenses.reduce((a, b) => a + (b.amount || 0), 0);
    const recent = data.expenses.slice(0, 5).map((e) => `• ৳${e.amount} - ${e.description || e.category} (${e.date})`);

    return `### 💳 Daily Expenses & Financial Overview

* **Total Recorded Expenses:** **৳${total.toLocaleString()}** (${data.expenses.length} entries)
* **Active Loans:** **${data.loans.length} loans tracked**

**Recent Expenses:**
${recent.length > 0 ? recent.join("\n") : "No recent expenses logged."}`;
  }

  // 9. Fallback search across everything
  const allHits: string[] = [];
  data.tasks.forEach((t) => {
    if (t.title.toLowerCase().includes(q)) allHits.push(`• Task: **${t.title}** (Due: ${t.dueDate || "N/A"})`);
  });
  data.documents.forEach((d) => {
    if (d.name.toLowerCase().includes(q)) allHits.push(`• Document: **${d.name}** (Expiry: ${d.expiryDate || "N/A"})`);
  });
  data.vehicles.forEach((v) => {
    if (`${v.name} ${v.brand} ${v.model} ${v.chassisNumber || ""} ${v.engineNumber || ""}`.toLowerCase().includes(q))
      allHits.push(`• Vehicle: **${v.name}** (${v.brand} ${v.model}, Reg: ${v.registrationNumber || "N/A"}, Chassis: ${v.chassisNumber || "N/A"}, Engine: ${v.engineNumber || "N/A"})`);
  });
  data.familyMembers.forEach((m) => {
    if (m.fullName.toLowerCase().includes(q))
      allHits.push(`• Family Member: **${m.fullName}** (${m.relationship || "Member"}, ${m.phone || "No phone"})`);
  });

  if (allHits.length > 0) {
    return `### 🔍 Records Matching "${query}":\n\n${allHits.join("\n")}`;
  }

  return `I reviewed your personal records for **"${query}"**, but didn't find any direct matches in your tasks, documents, fleet, rental units, or family directory.\n\nTry asking about:\n• *"When is my car fitness due?"*\n• *"List my pending tasks"*\n• *"What documents are expiring?"*\n• *"Who is in my family?"*\n• *"Rental units summary"*`;
}

/**
 * Main AI Query Handler
 * Uses Google Gemini Flash if API key is provided, or seamlessly falls back to our intelligent Local Context Engine.
 */
export async function askLifeNestAi(
  userPrompt: string,
  _history: ChatMessage[] = [],
): Promise<string> {
  // Load real-time records
  const contextData = await loadFullAiContext();
  const apiKey = getStoredGeminiKey();

  // 1. Try Gemini API if an API key is available
  if (apiKey) {
    try {
      const systemContext = buildSystemContextText(contextData);
      const systemInstruction = `You are LifeNest AI, the intelligent personal and family life operating system assistant. You have access to the user's authentic records provided below. Answer the user's question directly, accurately, and politely based ONLY on this provided real data. For queries regarding specific fields (such as chassis number, VIN, engine number, registration plate, expiry dates, phone numbers), provide the exact requested values clearly and prominently. Format your response cleanly using bullet points, bold headers, and concise markdown. If information is not in the records, state so politely. Do not make up facts.`;

      const contents = [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\n${systemContext}\n\nUser Question: ${userPrompt}` }],
        },
      ];

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      if (response.ok) {
        const json = await response.json();
        const candidateText =
          json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          return candidateText.trim();
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to built-in context engine:", err);
    }
  }

  // 2. Built-in Local Context Engine
  return runBuiltInContextQuery(userPrompt, contextData);
}
