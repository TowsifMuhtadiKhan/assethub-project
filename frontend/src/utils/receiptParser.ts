export function parseMaintenanceReceipt(raw: string) {
  const text = raw.replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const totals = lines.filter(line => /(?:grand\s*total|total\s*(?:amount|payable|due)?|সর্বমোট|মোট)/i.test(line) && !/(?:sub\s*total|subtotal)/i.test(line));
  const prioritized = totals.filter(line => /grand\s*total|সর্বমোট/i.test(line));
  const candidates = (prioritized.length ? prioritized : totals).map(line => {
    const match = line.match(/(?:total(?:\s+(?:amount|payable|due))?|সর্বমোট|মোট)\s*[:=\-]?\s*(?:(?:BDT|TK\.?|৳|টাকা)\s*)?([\d,]+(?:\.\d{1,2})?)(?:\s*(?:BDT|TK\.?|৳|টাকা))?\s*$/i);
    return match ? Number(match[1].replaceAll(",", "")) : undefined;
  }).filter((n): n is number => n !== undefined && Number.isFinite(n) && n > 0);
  const unique = [...new Set(candidates)];
  const dateMatch = text.match(/(?:date|তারিখ)\s*[:\-]?\s*(\d{4})[-/](\d{2})[-/](\d{2})/i);
  const localDate = text.match(/(?:date|তারিখ)\s*[:\-]?\s*(\d{2})[-/](\d{2})[-/](\d{4})/i);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : localDate ? `${localDate[3]}-${localDate[2]}-${localDate[1]}` : undefined;
  const validDate = date && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date ? date : undefined;
  const vendor = text.match(/(?:vendor|supplier|workshop|company)\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
  const category = /plumb|pipe|পাইপ/i.test(text) ? "Plumbing" : /electric|wiring|বিদ্যুৎ/i.test(text) ? "Electrical" : /paint|রং/i.test(text) ? "Painting" : undefined;
  return { amount: unique.length === 1 ? unique[0] : undefined, date: validDate, vendor, category, ambiguousTotal: unique.length > 1 };
}
