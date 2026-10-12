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
function runBuiltInContextQuery(
  query: string,
  data: AiContextData,
  history: ChatMessage[] = [],
): string {
  const q = query.toLowerCase().trim();

  // Check if the user is asking for more / expanded details
  const isAskingForMore =
    /^(more|tell me more|show more|give me more|details|detail|full details|more info|expand|show all|give more|all)\b/i.test(q) ||
    q.includes("in detail") ||
    q.includes("all details") ||
    q.includes("full breakdown") ||
    q.includes("tell me everything") ||
    q.includes("give more");

  // If asking for more, resolve the subject from the previous turn in history
  let effectiveQuery = q;
  if (isAskingForMore && history.length > 0) {
    const lastUserMsg = [...history]
      .reverse()
      .find((m) => m.sender === "user" && m.text.trim().toLowerCase() !== q);
    if (lastUserMsg) {
      effectiveQuery = lastUserMsg.text.toLowerCase().trim();
    }
  }

  const wantsDetails =
    isAskingForMore ||
    q.includes("detail") ||
    q.includes("full") ||
    q.includes("all details") ||
    q.includes("breakdown") ||
    q.includes("everything");

  // 1. Executive / General Overview
  if (
    effectiveQuery.includes("overview") ||
    effectiveQuery.includes("summary") ||
    effectiveQuery.includes("attention") ||
    effectiveQuery.includes("status") ||
    effectiveQuery.includes("what's up") ||
    effectiveQuery.includes("dashboard")
  ) {
    const pendingTasks = data.tasks.filter((t) => t.status !== "Completed");
    const urgentTasks = pendingTasks.filter((t) => t.priority === "Urgent" || t.priority === "High");
    const expiringDocs = data.documents.filter((d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return days > 0 && days <= 30;
    });

    if (!wantsDetails) {
      return `### 📊 LifeNest Quick Snapshot
• **Tasks:** **${pendingTasks.length} pending** ${urgentTasks.length > 0 ? `(${urgentTasks.length} urgent)` : ""}
• **Vault:** **${data.documents.length} docs** ${expiringDocs.length > 0 ? `(⚠️ **${expiringDocs.length} expiring soon**)` : ""}
• **Vehicles:** **${data.vehicles.length} vehicle(s)** registered
• **Properties:** **${data.units.length} unit(s)** across **${data.properties.length} property(s)**
• **Family:** **${data.familyMembers.length} member(s)** enrolled

*Type "more" for full executive breakdown.*`;
    }

    return `### 📊 LifeNest Executive Summary

* **Tasks:** **${pendingTasks.length} pending** (${urgentTasks.length} marked High/Urgent).
* **Vault Documents:** **${data.documents.length} recorded** (${expiringDocs.length > 0 ? `⚠️ **${expiringDocs.length} expiring within 30 days**` : "all up to date"}).
* **Vehicles & Fleet:** **${data.vehicles.length} vehicle(s)** registered.
* **Properties & Rentals:** **${data.units.length} unit(s)** across **${data.properties.length} property(s)**.
* **Warranties:** **${data.warranties.length} active warranties**.
* **Family Members:** **${data.familyMembers.length} member(s)** enrolled.

*Tip: You can ask specific questions like "What is the bike chassis number?", "When is car fitness due?", or "Who is in my family?".*`;
  }

  // 2. Family Members
  if (
    effectiveQuery.includes("family") ||
    effectiveQuery.includes("member") ||
    effectiveQuery.includes("relative") ||
    effectiveQuery.includes("who is in") ||
    effectiveQuery.includes("members")
  ) {
    if (data.familyMembers.length === 0) {
      return `ℹ️ No family members registered. You can add them under **Profile & Family Directory**.`;
    }

    if (!wantsDetails) {
      const list = data.familyMembers.map((m) => `• **${m.fullName}** — *${m.relationship || "Member"}*`).join("\n");
      return `### 👨‍👩‍👧‍👦 Family Directory (${data.familyMembers.length})\n${list}\n\n*Type "more" for phone numbers, emails, and notes.*`;
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
  const isChassisQuery = /chassis|cahasis|chasis|chassi|vin/i.test(effectiveQuery);
  const isEngineQuery = /engine|motor\s*no|engin/i.test(effectiveQuery);
  const isFitnessQuery = /fitness|renewal|brta/i.test(effectiveQuery);
  const isTaxQuery = /tax\s*token|token/i.test(effectiveQuery);
  const isMileageQuery = /mileage|odometer|km|kilometer/i.test(effectiveQuery);
  const isRegQuery = /reg|registration|number\s*plate|plate/i.test(effectiveQuery) && !effectiveQuery.includes("tax");
  const mentionsVehicleKeyword =
    effectiveQuery.includes("vehicle") ||
    effectiveQuery.includes("car") ||
    effectiveQuery.includes("bike") ||
    effectiveQuery.includes("motorcycle") ||
    effectiveQuery.includes("scooter") ||
    effectiveQuery.includes("fleet") ||
    effectiveQuery.includes("fuel");

  const matchesAnyVehicleName = data.vehicles.some(
    (v) =>
      (v.name && effectiveQuery.includes(v.name.toLowerCase())) ||
      (v.brand && effectiveQuery.includes(v.brand.toLowerCase())) ||
      (v.model && effectiveQuery.includes(v.model.toLowerCase())) ||
      (v.registrationNumber && effectiveQuery.includes(v.registrationNumber.toLowerCase())),
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
        (effectiveQuery.includes("bike") || effectiveQuery.includes("motorcycle") || effectiveQuery.includes("scooter")) &&
        (v.type?.toLowerCase().includes("bike") ||
          v.type?.toLowerCase().includes("motorcycle") ||
          vText.includes("bike") ||
          vText.includes("motorcycle"))
      ) {
        return true;
      }
      if (
        (effectiveQuery.includes("car") || effectiveQuery.includes("auto")) &&
        (v.type?.toLowerCase().includes("car") || vText.includes("car"))
      ) {
        return true;
      }
      if (v.name && effectiveQuery.includes(v.name.toLowerCase())) return true;
      if (v.brand && effectiveQuery.includes(v.brand.toLowerCase())) return true;
      if (v.model && effectiveQuery.includes(v.model.toLowerCase())) return true;
      if (v.registrationNumber && effectiveQuery.includes(v.registrationNumber.toLowerCase())) return true;
      return false;
    });

    const activeList =
      targetVehicles.length > 0
        ? targetVehicles
        : data.vehicles.length === 1
          ? data.vehicles
          : data.vehicles;

    // Helper for full vehicle spec cards
    const renderFullVehicleCards = () => {
      const items = activeList.map((v) => {
        const fitness = v.fitnessExpiry ? `**Due: ${v.fitnessExpiry}**` : "Not scheduled";
        const taxToken = v.taxTokenExpiry ? `**Due: ${v.taxTokenExpiry}**` : "Not scheduled";
        const reg = v.registrationNumber ? `\`${v.registrationNumber}\`` : "Unregistered";
        const chassis = v.chassisNumber ? `\`${v.chassisNumber}\`` : "Not recorded";
        const engine = v.engineNumber ? `\`${v.engineNumber}\`` : "Not recorded";
        return `* **${v.name}** (${v.brand} ${v.model} • ${v.type || "Vehicle"})\n  • 🔑 Chassis / VIN: ${chassis}\n  • ⚙️ Engine No: ${engine}\n  • 🚘 Registration: ${reg}\n  • 🛠️ BRTA Fitness: ${fitness}\n  • 📄 Tax Token: ${taxToken}\n  • 🛣️ Odometer: \`${v.mileage || 0} km\`${v.color ? `\n  • Color: ${v.color}` : ""}${v.year ? `\n  • Year: ${v.year}` : ""}`;
      });
      return `### 🚗 Detailed Vehicle Specifications\n\n${items.join("\n\n")}`;
    };

    // A. Chassis / VIN query
    if (isChassisQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => {
          const chassis = v.chassisNumber ? `**\`${v.chassisNumber}\`**` : "*Not recorded*";
          return `🔑 **${v.name}** chassis number is ${chassis}.`;
        })
        .join("\n");
      return `${list}\n\n*Type "more" for engine number, registration, and renewal dates.*`;
    }

    // B. Engine Number query
    if (isEngineQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => {
          const engine = v.engineNumber ? `**\`${v.engineNumber}\`**` : "*Not recorded*";
          return `⚙️ **${v.name}** engine number is ${engine}.`;
        })
        .join("\n");
      return `${list}\n\n*Type "more" for chassis and full specifications.*`;
    }

    // C. Registration Number query
    if (isRegQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => {
          const reg = v.registrationNumber ? `**\`${v.registrationNumber}\`**` : "*Not registered*";
          return `🚘 **${v.name}** registration plate is ${reg}.`;
        })
        .join("\n");
      return `${list}\n\n*Type "more" for chassis, engine, and renewals.*`;
    }

    // D. Fitness query
    if (isFitnessQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => {
          const fitness = v.fitnessExpiry ? `**Due: ${v.fitnessExpiry}**` : "*No renewal scheduled*";
          return `🛠️ **${v.name}** BRTA fitness renewal is ${fitness}.`;
        })
        .join("\n");
      return `${list}\n\n*Type "more" for tax token and full details.*`;
    }

    // E. Tax Token query
    if (isTaxQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => {
          const tax = v.taxTokenExpiry ? `**Due: ${v.taxTokenExpiry}**` : "*No expiry recorded*";
          return `📄 **${v.name}** tax token expiry is ${tax}.`;
        })
        .join("\n");
      return `${list}\n\n*Type "more" for fitness and full details.*`;
    }

    // F. Mileage / Odometer query
    if (isMileageQuery) {
      if (wantsDetails) {
        return renderFullVehicleCards();
      }
      const list = activeList
        .map((v) => `🛣️ **${v.name}** mileage is **\`${v.mileage || 0} km\`**.`)
        .join("\n");
      return `${list}\n\n*Type "more" for full specs.*`;
    }

    // G. General or Fleet listing
    if (wantsDetails) {
      return renderFullVehicleCards();
    }
    const items = activeList.map((v) => {
      const reg = v.registrationNumber ? `(Reg: ${v.registrationNumber})` : "";
      return `• **${v.name}** — ${v.brand} ${v.model} ${reg}`.trim();
    });
    return `🚗 **${activeList.length} Vehicle(s):**\n${items.join("\n")}\n\n*Ask for chassis number, fitness date, or type "more" for full specs.*`;
  }

  // 4. Tasks, Deadlines, To-Do
  if (
    effectiveQuery.includes("task") ||
    effectiveQuery.includes("todo") ||
    effectiveQuery.includes("to-do") ||
    effectiveQuery.includes("pending") ||
    effectiveQuery.includes("urgent") ||
    effectiveQuery.includes("deadline") ||
    effectiveQuery.includes("schedule")
  ) {
    const pending = data.tasks.filter((t) => t.status !== "Completed");
    if (pending.length === 0) {
      return `✅ **All caught up!** You have 0 pending tasks right now.`;
    }

    if (!wantsDetails) {
      const items = pending.slice(0, 3).map((t) => `• **${t.title}** (Due: ${t.dueDate || "No date"})`).join("\n");
      const moreNote =
        pending.length > 3
          ? `\n\n*+${pending.length - 3} more. Type "more" for full list, priorities, and assignees.*`
          : `\n\n*Type "more" for priorities and assignees.*`;
      return `📋 **${pending.length} Pending Tasks:**\n${items}${moreNote}`;
    }

    const list = pending
      .map(
        (t) =>
          `* [${t.priority || "Normal"}] **${t.title}**\n  • Due: **${t.dueDate || "No due date"}**${t.dueTime ? ` at ${t.dueTime}` : ""}\n  • Assigned to: *${t.familyMemberName || "Self"}*\n  • Category: ${t.category || "General"}`,
      )
      .join("\n\n");

    return `### 📋 Active Tasks (${pending.length} pending)\n\n${list}`;
  }

  // 5. Documents, Passports, NIDs, Expiries
  if (
    effectiveQuery.includes("document") ||
    effectiveQuery.includes("passport") ||
    effectiveQuery.includes("nid") ||
    effectiveQuery.includes("license") ||
    effectiveQuery.includes("vault") ||
    effectiveQuery.includes("certificate") ||
    effectiveQuery.includes("expir")
  ) {
    if (data.documents.length === 0) {
      return `📁 Your Document Vault is empty. Add documents in **Vault ➔ Document Vault**.`;
    }

    const expiring = data.documents.filter((d) => {
      if (!d.expiryDate) return false;
      const days = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return days <= 45;
    });

    if (!wantsDetails) {
      if (expiring.length > 0) {
        const list = expiring.map((d) => `• **${d.name}** (Expires: **${d.expiryDate}**)`).join("\n");
        return `⚠️ **${expiring.length} Document(s) Expiring Soon:**\n${list}\n\n*Type "more" for document numbers and authority.*`;
      }
      const sample = data.documents.slice(0, 3).map((d) => `• **${d.name}** (${d.category})`).join("\n");
      return `📁 **Vault (${data.documents.length} docs):**\n${sample}\n\n*Type "more" for document numbers and expiry dates.*`;
    }

    const docList = (expiring.length > 0 ? expiring : data.documents)
      .map(
        (d) =>
          `* **${d.name}** (*${d.category}*)\n  • Expiry: **${d.expiryDate || "Lifetime / No Expiry"}**\n  • Issuing Authority: ${d.issuingAuthority || "N/A"}\n  • Number: \`${d.documentNumber || "N/A"}\``,
      )
      .join("\n\n");

    const header =
      expiring.length > 0
        ? `### ⚠️ Expiring & Critical Documents (${expiring.length} due soon)`
        : `### 📄 Document Vault Records (${data.documents.length} items)`;

    return `${header}\n\n${docList}`;
  }

  // 6. Properties, Rentals, Tenants, Flats
  if (
    effectiveQuery.includes("property") ||
    effectiveQuery.includes("unit") ||
    effectiveQuery.includes("flat") ||
    effectiveQuery.includes("tenant") ||
    effectiveQuery.includes("rent") ||
    effectiveQuery.includes("rental")
  ) {
    if (data.units.length === 0 && data.properties.length === 0) {
      return `🏢 No properties or rental units recorded yet.`;
    }

    const occupied = data.units.filter((u) => u.status === "Occupied").length;
    const vacant = data.units.length - occupied;

    if (!wantsDetails) {
      return `🏢 **${data.units.length} Units** across **${data.properties.length} Property(s)** (${occupied} occupied, ${vacant} vacant).\n\n*Type "more" for unit-by-unit rent, tenant, and phone breakdown.*`;
    }

    const unitsList = data.units.map((u) => {
      const tenant = u.tenantName || u.currentTenant || "Vacant";
      const statusBadge = u.status === "Occupied" ? "🟢 Occupied" : "⚪ Vacant";
      return `* **Unit ${u.unitNumber}** (${u.unitName || "Flat"}): ${statusBadge}\n  • Monthly Rent: **৳${(u.monthlyRent || 0).toLocaleString()}**\n  • Tenant: **${tenant}** ${u.tenantPhone ? `(\`${u.tenantPhone}\`)` : ""}`;
    });

    return `### 🏢 Real Estate & Tenant Roll (${data.units.length} units)\n\n${unitsList.join("\n\n")}`;
  }

  // 7. Warranties
  if (effectiveQuery.includes("warranty") || effectiveQuery.includes("claim") || effectiveQuery.includes("guarantee")) {
    if (data.warranties.length === 0) {
      return `🛡️ No warranties recorded yet.`;
    }

    if (!wantsDetails) {
      const sample = data.warranties.slice(0, 3).map((w) => `• **${w.productName}** (Expires: ${w.expiryDate || "N/A"})`).join("\n");
      return `🛡️ **${data.warranties.length} Warranties Recorded:**\n${sample}\n\n*Type "more" for seller and coverage details.*`;
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
    effectiveQuery.includes("expense") ||
    effectiveQuery.includes("spent") ||
    effectiveQuery.includes("cost") ||
    effectiveQuery.includes("money") ||
    effectiveQuery.includes("loan") ||
    effectiveQuery.includes("emi")
  ) {
    const total = data.expenses.reduce((a, b) => a + (b.amount || 0), 0);
    if (!wantsDetails) {
      return `💳 Total recorded expenses: **৳${total.toLocaleString()}** across ${data.expenses.length} transactions (${data.loans.length} active loans).\n\n*Type "more" for recent transactions and loan details.*`;
    }

    const recent = data.expenses.slice(0, 5).map((e) => `• ৳${e.amount} - ${e.description || e.category} (${e.date})`);

    return `### 💳 Daily Expenses & Financial Overview

* **Total Recorded Expenses:** **৳${total.toLocaleString()}** (${data.expenses.length} entries)
* **Active Loans:** **${data.loans.length} loans tracked**

**Recent Expenses:**
${recent.length > 0 ? recent.join("\n") : "No recent expenses logged."}`;
  }

  // 9. If user simply asked "more" but no previous topic matched
  if (isAskingForMore) {
    return `I'm ready! What would you like more details on? You can ask about **vehicles, tasks, documents, properties, or family members**.`;
  }

  // 10. Fallback search across everything
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
    return `### 🔍 Records Matching "${query}":\n\n${allHits.join("\n")}\n\n*Type "more" for full record cards.*`;
  }

  return `I checked your records for **"${query}"**, but didn't find any direct matches.\n\nTry asking:\n• *"What is the bike chassis number?"*\n• *"When is car fitness due?"*\n• *"List my pending tasks"*\n• *"Who is in my family?"*`;
}

/**
 * Main AI Query Handler
 * Uses Google Gemini Flash if API key is provided, or seamlessly falls back to our intelligent Local Context Engine.
 */
export async function askLifeNestAi(
  userPrompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  // Load real-time records
  const contextData = await loadFullAiContext();
  const apiKey = getStoredGeminiKey();

  // 1. Try Gemini API if an API key is available
  if (apiKey) {
    try {
      const systemContext = buildSystemContextText(contextData);
      const systemInstruction = `You are LifeNest AI, the intelligent personal and family operating system assistant.
CRITICAL INSTRUCTION - MINIMAL FIRST, EXPAND ON DEMAND:
1. By default, provide a MINIMAL, DIRECT, and CONCISE answer (1-3 lines). Never dump unprompted extra fields, full vehicle specs, or long lists unless the user explicitly asked for them.
2. For specific attribute questions (e.g. chassis number, engine number, due date, phone, rent), reply ONLY with that exact requested value.
3. Conclude short replies with a polite hint: "*Ask 'more' for full details.*"
4. ONLY if the user explicitly asks for "more", "details", "expand", or "show all", then provide the complete comprehensive breakdown.
5. Base answers strictly on the provided authentic user records. Never hallucinate.`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add recent history for conversational continuity (up to last 6 messages)
      const recentHistory = history.slice(-6);
      recentHistory.forEach((msg) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });

      const currentPromptText =
        contents.length === 0
          ? `${systemInstruction}\n\n${systemContext}\n\nUser Question: ${userPrompt}`
          : `[System Instruction: ${systemInstruction}]\n[Live Records: ${systemContext}]\n\nUser Question: ${userPrompt}`;

      contents.push({
        role: "user",
        parts: [{ text: currentPromptText }],
      });

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
  return runBuiltInContextQuery(userPrompt, contextData, history);
}
