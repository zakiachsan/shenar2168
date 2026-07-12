import jsPDF from 'jspdf';

interface ShippingLabelData {
  storeName: string;
  orderNumber: string;
  courierName: string;
  courierService: string;
  waybillId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderCity: string;
  senderPostalCode: string;
  weight: number;
  codAmount: number;
  items: {
    name: string;
    sku?: string;
    variation?: string;
    quantity: number;
  }[];
}

// ─── Code 128B encoder ────────────────────────────────────────────
const CODE128B: Record<number, string> = {
  32:'11011001100',33:'11001101100',34:'11001100110',35:'10010011000',36:'10010001100',
  37:'10001001100',38:'10011001000',39:'10011000100',40:'10001100100',41:'11001001000',
  42:'11001000100',43:'11000100100',44:'10110011100',45:'10011011100',46:'10011001110',
  47:'10111001100',48:'10011101100',49:'10011100110',50:'11001110010',51:'11001011100',
  52:'11001001110',53:'11011100100',54:'11001110100',55:'11101101110',56:'11101001100',
  57:'11100101100',58:'11100100110',59:'11101100100',60:'11100110100',61:'11100110010',
  62:'11011011000',63:'11011000110',64:'11000110110',65:'10100011000',66:'10001011000',
  67:'10001000110',68:'10110001000',69:'10001101000',70:'10001100010',71:'11010001000',
  72:'11000101000',73:'11000100010',74:'10110111000',75:'10110001110',76:'10001101110',
  77:'10111011000',78:'10111000110',79:'10001110110',80:'11101110110',81:'11010001110',
  82:'11000101110',83:'11011101000',84:'11011100010',85:'11011101110',86:'11101011000',
  87:'11101000110',88:'11100010110',89:'11101101000',90:'11101100010',91:'11100011010',
  92:'11101111010',93:'11001000010',94:'11110001010',95:'10100110000',96:'10100001100',
  97:'10010110000',98:'10010000110',99:'10000101100',100:'10000100110',101:'10110010000',
  102:'10110000100',103:'10011010000',104:'10011000010',105:'10000110100',106:'10000110010',
  107:'11000010010',108:'11001010000',109:'11110111010',110:'11000010100',111:'10001111010',
  112:'10100111100',113:'10010111100',114:'10010011110',115:'10111100100',116:'10011110100',
  117:'10011110010',118:'11110100100',119:'11110010100',120:'11110010010',121:'11011011110',
  122:'11011110110',123:'11110110110',124:'10101111000',125:'10100011110',126:'10001011110',
};
const START_B = '11010010000';
const STOP = '1100011101011';

function code128(text: string): string {
  let bits = START_B;
  let sum = 104;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const p = CODE128B[c];
    if (!p) continue;
    bits += p;
    sum += c * (i + 1);
  }
  bits += CODE128B[sum % 103] || '';
  bits += STOP;
  return bits;
}

function drawBarcode(
  doc: jsPDF, x: number, y: number,
  value: string, w: number, h: number
) {
  const bits = code128(value);
  const bw = w / bits.length;
  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      doc.rect(x + i * bw, y, Math.max(bw, 0.12), h, 'F');
    }
  }
}

function drawQR(doc: jsPDF, x: number, y: number, sz: number, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const c = sz / 21;
  // finder patterns
  const drawFinder = (fx: number, fy: number) => {
    doc.setFillColor(0, 0, 0);
    doc.rect(x + fx * c, y + fy * c, 7 * c, 7 * c, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + (fx + 1) * c, y + (fy + 1) * c, 5 * c, 5 * c, 'F');
    doc.setFillColor(0, 0, 0);
    doc.rect(x + (fx + 2) * c, y + (fy + 2) * c, 3 * c, 3 * c, 'F');
  };
  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);
  // data dots
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < 21; r++) {
    for (let cc = 0; cc < 21; cc++) {
      if ((r < 7 && cc < 7) || (r < 7 && cc > 13) || (r > 13 && cc < 7)) continue;
      h = ((h << 5) - h + (r * 21 + cc)) | 0;
      if (Math.abs(h) % 4 === 0) {
        doc.rect(x + cc * c, y + r * c, c, c, 'F');
      }
    }
  }
}

function maskPhone(p: string): string {
  if (!p) return '';
  const c = p.replace(/\D/g, '');
  if (c.length <= 6) return p;
  return `${c.slice(0, 2)}********${c.slice(-2)}`;
}

function maskName(n: string): string {
  if (!n || n.length <= 2) return n;
  return n.split('').map((ch, i) => (i > 0 && i < n.length - 1) ? '*' : ch).join('');
}

export function generateShippingLabelPDF(data: ShippingLabelData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150],
  });

  const PW = 80;
  const M = 2;
  const CW = PW - M * 2;
  let y = M;
  const GAP = 1;

  // ════════════════════════════════════════════════════════════
  // SECTION 1 — HEADER  (3 columns with vertical dividers)
  // ════════════════════════════════════════════════════════════
  const c1 = CW * 0.30;
  const c2 = CW * 0.34;
  const c3 = CW - c1 - c2;
  const HH = 14;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, HH);

  // Vertical dividers
  doc.line(M + c1, y, M + c1, y + HH);
  doc.line(M + c1 + c2, y, M + c1 + c2, y + HH);

  // ── Left column: R icon + storeName ──
  const isz = 5;
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(M + (c1 - isz) / 2, y + 2, isz, isz, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('R', M + c1 / 2, y + 2 + isz / 2 + 1.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text(data.storeName || 'Shenar2168', M + c1 / 2, y + 10, { align: 'center' });

  // ── Middle column: Courier ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const courierRaw = data.courierName || 'GOJEK';
  const courierOnly = courierRaw.split(/[|\s]/)[0].toUpperCase();
  doc.text(courierOnly, M + c1 + c2 / 2, y + HH / 2 + 1.5, { align: 'center' });

  // ── Right column: Service ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const serviceRaw = data.courierService || 'INSTANT';
  const serviceOnly = serviceRaw.toUpperCase();
  doc.text(serviceOnly, M + c1 + c2 + c3 / 2, y + HH / 2 + 1.5, { align: 'center' });

  y += HH + GAP;

  // ════════════════════════════════════════════════════════════
  // SECTION 2 — BARCODE + Tracking
  // ════════════════════════════════════════════════════════════
  const barcodeH = 10;
  drawBarcode(doc, M, y, data.waybillId || data.orderNumber, CW, barcodeH);
  y += barcodeH + 2.5;

  // Tracking number (below barcode, with more space)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text(data.waybillId || data.orderNumber, PW / 2, y, { align: 'center' });
  y += 2.5;

  // ════════════════════════════════════════════════════════════
  // SECTION 3 — SENDER / RECEIVER + QR CODE
  // ════════════════════════════════════════════════════════════
  const qrSz = 20;
  const qrX = PW - M - qrSz;
  const leftW = CW - qrSz - 1;

  // ── Sender (Pengirim) box ──
  const sAddr = `${data.senderAddress}${data.senderCity ? ', ' + data.senderCity : ''}${data.senderPostalCode ? ' ' + data.senderPostalCode : ''}`;
  const sLines = doc.splitTextToSize(sAddr, leftW - 3);
  const sLineCount = Math.min(sLines.length, 3);
  const sndH = 7 + sLineCount * 3;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, leftW, sndH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Pengirim', M + 1.5, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(0, 0, 0);
  doc.text(maskPhone(data.senderPhone), M + leftW - 1.5, y + 3, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(data.senderName.toUpperCase(), M + 1.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text(sLines.slice(0, 3), M + 1.5, y + 9);

  y += sndH;

  // ── Receiver (Penerima) box ──
  const rAddr = `${data.recipientAddress}${data.recipientCity ? ', ' + data.recipientCity : ''}${data.recipientPostalCode ? ' ' + data.recipientPostalCode : ''}`;
  const rLines = doc.splitTextToSize(rAddr, leftW - 3);
  const rLineCount = Math.min(rLines.length, 4);
  const rcvH = 7 + rLineCount * 3;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(M, y, leftW, rcvH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Penerima', M + 1.5, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text(maskPhone(data.recipientPhone), M + leftW - 1.5, y + 3, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(maskName(data.recipientName), M + 1.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text(rLines.slice(0, 4), M + 1.5, y + 9);

  // COD label
  if (data.codAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(0, 0, 0);
    doc.text('COD:', M + leftW - 1.5, y + rcvH - 2, { align: 'right' });
  }

  // ── QR code (right side, spans both boxes) ──
  const totalH = sndH + rcvH;
  const qrY = y + rcvH - totalH;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(qrX, qrY, qrSz, totalH);
  drawQR(doc, qrX + 1, qrY + 1, qrSz - 2, data.waybillId || data.orderNumber);

  y += rcvH + GAP;

  // ════════════════════════════════════════════════════════════
  // SECTION 4 — Print Time & Order ID (boxed)
  // ════════════════════════════════════════════════════════════
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(M, y, PW - M, y);
  y += 0.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  const now = new Date();
  const pt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rowH = 4;

  // Print Time box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, rowH);
  doc.text(`Print Time : ${pt}`, M + 1, y + 2.8);
  y += rowH;

  // TT Order ID box
  doc.rect(M, y, CW, rowH);
  doc.text(`TT Order ID : ${data.orderNumber}`, M + 1, y + 2.8);
  y += rowH + GAP;

  // ════════════════════════════════════════════════════════════
  // SECTION 5 — PRODUCT TABLE
  // ════════════════════════════════════════════════════════════
  if (data.items.length > 0) {
    // Draw items table manually (no autoTable dependency)
    const rowH = 5;
    const colW = [CW * 0.45, CW * 0.18, CW * 0.22, CW * 0.15];
    const headers = ['Product Name', 'SKU', 'VARIASI', 'Qty'];

    // Header row
    doc.setFillColor(255, 255, 255);
    doc.rect(M, y, CW, rowH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(M, y, CW, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(0, 0, 0);
    let x = M;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x + 1, y + 3.5);
      x += colW[i];
      if (i < headers.length - 1) doc.line(x, y, x, y + rowH);
    }
    y += rowH;

    // Data rows
    for (const it of data.items) {
      doc.setFillColor(255, 255, 255);
      doc.rect(M, y, CW, rowH, 'F');
      doc.rect(M, y, CW, rowH);
      doc.setFont('helvetica', 'normal');
      const name = it.name.length > 40 ? it.name.substring(0, 40) + '…' : it.name;
      const cells = [name, it.sku || '-', it.variation || '-', String(it.quantity)];
      x = M;
      for (let i = 0; i < cells.length; i++) {
        const align = i === 3 ? 'center' : 'left';
        const tx = align === 'center' ? x + colW[i] / 2 : x + 1;
        doc.text(cells[i], tx, y + 3.5, { align });
        x += colW[i];
        if (i < cells.length - 1) doc.line(x, y, x, y + rowH);
      }
      y += rowH;
    }
  }

  doc.save(`resi-${data.orderNumber}.pdf`);
}
