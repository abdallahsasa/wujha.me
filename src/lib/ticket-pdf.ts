import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";

interface TicketForPdf {
  qr_code: string;
  guest_name: string;
  ticket_code?: string;
  index: number;
  total: number;
}

interface EventForPdf {
  title_ar: string;
  event_code?: string;
  start_date?: string;
  venue_name?: string;
  venue_address?: string;
}

/**
 * Generate a QR code as a base64 PNG data URL using the qrcode library (pure JS, no DOM).
 */
async function generateQrDataUrl(value: string, size: number = 200): Promise<string> {
  if (!value) return "";
  return QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    type: "image/png",
    errorCorrectionLevel: "H",
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));

  await Promise.all(images.map(async (img) => {
    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          // no-op
        }
      }
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to load QR image"));
      };
      const cleanup = () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
      };

      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onError, { once: true });
    });

    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // no-op
      }
    }
  }));
}

/**
 * Generates a branded PDF with one ticket per page.
 * Uses html2canvas to render Arabic text correctly via the browser's native text engine.
 * QR codes are generated server-side as base64 PNG and embedded directly.
 */
export async function generateTicketsPdf(
  tickets: TicketForPdf[],
  event: EventForPdf,
): Promise<string> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;

  const pxW = 794;
  const pxH = 1123;

  // Pre-generate all QR codes as backend-generated base64 data URLs
  const qrDataUrls = await Promise.all(
    tickets.map((ticket) => (ticket.qr_code ? generateQrDataUrl(ticket.qr_code, 200) : Promise.resolve(""))),
  );

  for (let i = 0; i < tickets.length; i++) {
    if (i > 0) doc.addPage();
    const ticket = tickets[i];
    const qrDataUrl = qrDataUrls[i];

    let dateStr = "";
    let timeStr = "";
    if (event.start_date) {
      const date = new Date(event.start_date);
      dateStr = date.toLocaleDateString("ar-SA", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
      timeStr = date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    }

    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${pxW}px; height: ${pxH}px;
      background: #0a0a0a; overflow: hidden;
      font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
    `;

    container.innerHTML = `
      <div style="width:100%;height:12px;background:#f59e0b;"></div>
      <div style="text-align:center;padding:40px 0 10px;">
        <span style="font-size:42px;font-weight:bold;color:#f59e0b;letter-spacing:4px;">WUJHA</span>
      </div>
      <div style="text-align:center;font-size:18px;color:#b4b4b4;padding-bottom:30px;">
        Ticket ${ticket.index} of ${ticket.total}${ticket.ticket_code ? ` — ${escapeHtml(ticket.ticket_code)}` : ""}
      </div>
      <div style="margin:0 80px;background:#1e1e1e;border-radius:16px;padding:40px 30px;text-align:center;">
        ${event.event_code ? `<div style="font-size:14px;color:#969696;margin-bottom:8px;">${escapeHtml(event.event_code)}</div>` : ""}
        <div style="min-height: 100px; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size:30px;font-weight:bold;color:#fff;line-height:1.4;margin-bottom:12px;">
            ${escapeHtml(event.title_ar)}
          </div>
          ${dateStr ? `<div style="font-size:18px;color:#c8c8c8;margin-bottom:6px;">${escapeHtml(dateStr)}  •  ${escapeHtml(timeStr)}</div>` : ""}
          ${event.venue_name ? `<div style="font-size:18px;color:#c8c8c8;margin-bottom:10px;">${escapeHtml(event.venue_name)}</div>` : ""}
        </div>
        <div style="border-top:2px dashed #505050;margin:24px 30px;"></div>
        ${qrDataUrl ? `
          <div style="display:inline-block;background:#fff;padding:14px;border-radius:12px;margin:10px 0;">
            <div style="width:200px;height:200px;"></div>
          </div>
        ` : ""}
        <div style="font-size:24px;font-weight:bold;color:#f59e0b;margin-top:24px;">
          ${escapeHtml(ticket.guest_name)}
        </div>
        <div style="font-size:15px;color:#969696;margin-top:14px;">
          Show this QR code at the entrance
        </div>
      </div>
      <div style="text-align:center;position:absolute;bottom:50px;width:100%;font-size:14px;color:#646464;">
        Powered by WUJHA
      </div>
      <div style="position:absolute;bottom:0;width:100%;height:12px;background:#f59e0b;"></div>
    `;

    document.body.appendChild(container);

    try {
      await waitForImages(container);

      const canvas = await html2canvas(container, {
        width: pxW, height: pxH, scale: 3,
        backgroundColor: "#0a0a0a", useCORS: true, logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

      // Overlay QR code directly as PNG for maximum sharpness and scanability
      if (qrDataUrl) {
        const qrSizeMm = 52.9; // Matches 200px at high res
        const qrXMm = (pageW - qrSizeMm) / 2;
        const qrYMm = 112; // Finely tuned Y position for the stabilized layout
        doc.addImage(qrDataUrl, "PNG", qrXMm, qrYMm, qrSizeMm, qrSizeMm);
      }
    } finally {
      document.body.removeChild(container);
    }
  }

  // Generate descriptive filename
  const filename = generatePdfFilename(event.title_ar, tickets);
  doc.save(filename);
  return filename;
}

function generatePdfFilename(eventTitle: string, tickets: TicketForPdf[]): string {
  // Clean event title for filename (keep Arabic chars, remove special chars)
  const slug = eventTitle.replace(/[^\u0600-\u06FF\w\s-]/g, "").replace(/\s+/g, "-").substring(0, 40);

  if (tickets.length === 1) {
    const shortId = tickets[0].ticket_code || tickets[0].qr_code.slice(0, 6).toUpperCase();
    return `wujha-ticket-${slug}-${shortId}.pdf`;
  }
  return `wujha-tickets-${slug}-${tickets.length}x.pdf`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
