import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const COURIER_COLORS: Record<string, [number, number, number]> = {
  jne: [0, 108, 183],
  jnt: [255, 0, 0],
  sicepat: [255, 107, 0],
  anteraja: [0, 166, 81],
  ninja: [61, 61, 61],
  idexpress: [0, 61, 165],
};

// Code 128B encoding tables
const CODE128B_PATTERNS: Record<number, string> = {
  32: '11011001100', 33: '11001101100', 34: '11001100110', 35: '10010011000',
  36: '10010001100', 37: '10001001100', 38: '10011001000', 39: '10011000100',
  40: '10001100100', 41: '11001001000', 42: '11001000100', 43: '11000100100',
  44: '10110011100', 45: '10011011100', 46: '10011001110', 47: '10111001100',
  48: '10011101100', 49: '10011100110', 50: '11001110010', 51: '11001011100',
  52: '11001001110', 53: '11011100100', 54: '11001110100', 55: '11101101110',
  56: '11101001100', 57: '11100101100', 58: '11100100110', 59: '11101100100',
  60: '11100110100', 61: '11100110010', 62: '11011011000', 63: '11011000110',
  64: '11000110110', 65: '10100011000', 66: '10001011000', 67: '10001000110',
  68: '10110001000', 69: '10001101000', 70: '10001100010', 71: '11010001000',
  72: '11000101000', 73: '11000100010', 74: '10110111000', 75: '10110001110',
  76: '10001101110', 77: '10111011000', 78: '10111000110', 79: '10001110110',
  80: '11101110110', 81: '11010001110', 82: '11000101110', 83: '11011101000',
  84: '11011100010', 85: '11011101110', 86: '11101011000', 87: '11101000110',
  88: '11100010110', 89: '11101101000', 90: '11101100010', 91: '11100011010',
  92: '11101111010', 93: '11001000010', 94: '11110001010', 95: '10100110000',
  96: '10100001100', 97: '10010110000', 98: '10010000110', 99: '10000101100',
  100: '10000100110', 101: '10110010000', 102: '10110000100', 103: '10011010000',
  104: '10011000010', 105: '10000110100', 106: '10000110010', 107: '11000010010',
  108: '11001010000', 109: '11110111010', 110: '11000010100', 111: '10001111010',
  112: '10100111100', 113: '10010111100', 114: '10010011110', 115: '10111100100',
  116: '10011110100', 117: '10011110010', 118: '11110100100', 119: '11110010100',
  120: '11110010010', 121: '11011011110', 122: '11011110110', 123: '11110110110',
  124: '10101111000', 125: '10100011110', 126: '10001011110', 127: '10111101000',
  128: '10111100010', 129: '11110101000', 130: '11110100010', 131: '10111011110',
  132: '10111101110', 133: '11101011110', 134: '11110101110', 135: '11010000100',
  136: '11010010000', 137: '11010011100', 138: '11000111010',
};

// Start Code B, Stop, checksum
const START_CODE_B = '11010010000';
const STOP_PATTERN = '1100011101011';

function code128Encode(text: string): string {
  let bits = START_CODE_B;
  let checksum = 104; // Start Code B value

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const pattern = CODE128B_PATTERNS[charCode];
    if (!pattern) continue; // skip unsupported chars
    bits += pattern;
    checksum += charCode * (i + 1);
  }

  checksum = checksum % 103;
  bits += CODE128B_PATTERNS[checksum] || '';
  bits += STOP_PATTERN;

  return bits;
}

function drawBarcode(doc: jsPDF, x: number, y: number, value: string, width: number, height: number) {
  const bits = code128Encode(value);
  const barWidth = width / bits.length;

  doc.setFillColor(0, 0, 0);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      doc.rect(x + i * barWidth, y, Math.max(barWidth, 0.2), height, 'F');
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateShippingLabelPDF(data: ShippingLabelData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150],
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // === HEADER ===
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, y, 6, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('R', margin + 3, y + 4.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(data.storeName, margin + 8, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.text('Resi Pengiriman', margin + 8, y + 5.5);

  const courierColor = COURIER_COLORS[data.courierName.toLowerCase()] || [100, 100, 100];
  doc.setFillColor(courierColor[0], courierColor[1], courierColor[2]);
  doc.roundedRect(pageWidth - margin - 22, y, 22, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(data.courierName.toUpperCase(), pageWidth - margin - 11, y + 4.2, { align: 'center' });

  y += 10;

  // === ORDER NUMBER + BARCODE ===
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`No. Pesanan: ${data.orderNumber}`, margin, y + 2);
  y += 4;

  drawBarcode(doc, margin, y, data.orderNumber, contentWidth, 8);
  y += 11;

  // === DIVIDER ===
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // === RECIPIENT & SENDER ===
  const halfWidth = contentWidth / 2 - 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(150, 150, 150);
  doc.text('PENERIMA', margin, y + 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text(data.recipientName, margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(80, 80, 80);
  doc.text(data.recipientPhone, margin, y + 7);

  doc.setFontSize(4.5);
  doc.setTextColor(100, 100, 100);
  const recipientAddrLines = doc.splitTextToSize(data.recipientAddress, halfWidth);
  doc.text(recipientAddrLines.slice(0, 3), margin, y + 10);

  const cityY = y + 10 + Math.min(recipientAddrLines.length, 3) * 2.5 + 1;
  const cityText = `${data.recipientCity}${data.recipientPostalCode ? ' ' + data.recipientPostalCode : ''}`;
  doc.setFillColor(240, 240, 240);
  const cityTextWidth = doc.getTextWidth(cityText) + 3;
  doc.roundedRect(margin, cityY, Math.min(cityTextWidth, halfWidth), 4, 0.5, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(60, 60, 60);
  doc.text(cityText, margin + 1.5, cityY + 2.8);

  const senderX = margin + halfWidth + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(150, 150, 150);
  doc.text('PENGIRIM', senderX, y + 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text(data.senderName, senderX, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(80, 80, 80);
  doc.text(data.senderPhone, senderX, y + 7);

  doc.setFontSize(4.5);
  doc.setTextColor(100, 100, 100);
  const senderAddrLines = doc.splitTextToSize(data.senderAddress, halfWidth);
  doc.text(senderAddrLines.slice(0, 3), senderX, y + 10);

  const senderCityY = y + 10 + Math.min(senderAddrLines.length, 3) * 2.5 + 1;
  const senderCityText = `${data.senderCity}${data.senderPostalCode ? ' ' + data.senderPostalCode : ''}`;
  doc.setFillColor(240, 240, 240);
  const senderCityWidth = doc.getTextWidth(senderCityText) + 3;
  doc.roundedRect(senderX, senderCityY, Math.min(senderCityWidth, halfWidth), 4, 0.5, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(60, 60, 60);
  doc.text(senderCityText, senderX + 1.5, senderCityY + 2.8);

  y = Math.max(cityY + 6, senderCityY + 6);

  // === DIVIDER ===
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // === SHIPPING DETAILS ===
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, contentWidth, 8, 'F');
  y += 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(80, 80, 80);

  if (data.weight > 0) {
    const weightText = data.weight >= 1000 ? `${(data.weight / 1000).toFixed(1)} kg` : `${data.weight} gr`;
    doc.text(`Berat: ${weightText}`, margin + 2, y + 2);
  }
  if (data.codAmount > 0) {
    doc.text(`COD: ${formatCurrency(data.codAmount)}`, margin + 25, y + 2);
  }
  if (data.courierService) {
    doc.text(`Layanan: ${data.courierService}`, margin + 50, y + 2);
  }

  y += 5;

  // Waybill barcode
  if (data.waybillId) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(120, 120, 120);
    doc.text('No. Resi:', margin + 2, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(data.waybillId, margin + 2, y + 4.5);

    drawBarcode(doc, margin + 2, y + 6, data.waybillId, contentWidth - 4, 6);
    y += 14;
  }

  y += 2;

  // === DIVIDER ===
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // === ITEMS TABLE ===
  if (data.items.length > 0) {
    const tableData = data.items.map((item, idx) => [
      String(idx + 1),
      item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
      item.variation || '-',
      String(item.quantity),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Nama Produk', 'Variasi', 'Qty']],
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 4.5,
        cellPadding: 1,
        textColor: [60, 60, 60],
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: false,
        textColor: [150, 150, 150],
        fontStyle: 'bold',
        fontSize: 4,
      },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 18 },
        3: { cellWidth: 8, halign: 'center' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // === FOOTER ===
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.5);
  doc.setTextColor(180, 180, 180);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, y + 2, { align: 'center' });

  doc.save(`resi-${data.orderNumber}.pdf`);
}
