export const currency = (value: number) => `৳${value.toLocaleString("en-BD")}`;

export const money = (value: number) => currency(value);

export const formatDate = (date: string) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

export const getStatusTone = (status: string) => {
  switch (status) {
    case "PAID":
    case "GOOD":
      return "bg-emerald-100 text-emerald-700";
    case "PARTIALLY PAID":
    case "DUE SOON":
      return "bg-amber-100 text-amber-700";
    case "UNPAID":
    case "OVERDUE":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};
