import { parseMaintenanceReceipt } from "../utils/receiptParser";

export async function scanMaintenanceReceipt(file: File, onProgress: (message: string) => void) {
  if (file.size > 20 * 1024 * 1024) throw new Error("Use a receipt of 20 MB or less.");
  const { createWorker } = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const recognize = async (input: File | HTMLCanvasElement) => {
    worker ??= await createWorker(["eng", "ben"], 1, { logger: message => onProgress(`${message.status} ${Math.round((message.progress || 0) * 100)}%`) });
    const { data } = await worker.recognize(input);
    return data.text;
  };
  let text = "";
  try {
    if (file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      const { default: pdfWorkerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
      const pdf = await task.promise;
      try {
        if (pdf.numPages > 20) throw new Error("Scan receipts of at most 20 pages. Split larger PDFs before scanning.");
        for (let i = 1; i <= pdf.numPages; i++) {
          onProgress(`Reading PDF page ${i} of ${pdf.numPages}`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          let pageText = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
          if (pageText.trim().length < 20) {
            const viewport = page.getViewport({ scale: 2 });
            if (viewport.width * viewport.height > 20000000) throw new Error("This PDF page is too large to scan. Upload a smaller image.");
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            pageText = await recognize(canvas);
            canvas.width = 0; canvas.height = 0;
          }
          text += pageText + "\n";
        }
      } finally { await task.destroy(); }
    } else if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      text = await recognize(file);
    } else throw new Error("Select a JPG, PNG, WebP or PDF receipt.");
    if (!text.trim()) throw new Error("No readable text found. Try a sharper image or enter the receipt manually.");
    return { text, ...parseMaintenanceReceipt(text) };
  } finally { await worker?.terminate(); }
}
