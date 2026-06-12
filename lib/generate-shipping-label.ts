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

function drawBarcode(doc: jsPDF, x: number, y: number, value: string, width: number, height: number) {
  doc.setFillColor(0, 0, 0);
  const barCount = value.length * 4;
  const barWidth = width / barCount;
  
  for (let i = 0; i < barCount; i++) {
    const charCode = value.charCodeAt(i % value.length);
    const widths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1];
    const w = widths[charCode % widths.length];
    const isBar = i % 2 === 0;
    
    if (isBar) {
      const bx = x + i * barWidth;
      doc.rect(bx, y, barWidth * w * 0.8, height, 'F');
    }
  }
}

export function generateShippingLabelPDF(data: ShippingLabelData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150], // Receipt-like width, similar to Shopee label
  });

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // === HEADER: Store Name + Courier ===
  // Store icon
  doc.setFillColor(37, 99, 235); // blue-600
  doc.roundedRect(margin, y, 6, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('R', margin + 3, y + 4.2, { align: 'center' });

  // Store name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(data.storeName, margin + 8, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.text('Resi Pengiriman', margin + 8, y + 5.5);

  // Courier badge
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

  // === RECIPIENT & SENDER (side by side) ===
  const halfWidth = contentWidth / 2 - 1;

  // -- Recipient --
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

  // Recipient address (word wrap)
  doc.setFontSize(4.5);
  doc.setTextColor(100, 100, 100);
  const recipientAddrLines = doc.splitTextToSize(data.recipientAddress, halfWidth);
  doc.text(recipientAddrLines.slice(0, 3), margin, y + 10);

  // Recipient city badge
  const cityY = y + 10 + Math.min(recipientAddrLines.length, 3) * 2.5 + 1;
  const cityText = `${data.recipientCity}${data.recipientPostalCode ? ' ' + data.recipientPostalCode : ''}`;
  doc.setFillColor(240, 240, 240);
  const cityTextWidth = doc.getTextWidth(cityText) + 3;
  doc.roundedRect(margin, cityY, Math.min(cityTextWidth, halfWidth), 4, 0.5, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(60, 60, 60);
  doc.text(cityText, margin + 1.5, cityY + 2.8);

  // -- Sender --
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

  // Sender city badge
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

  // === SHIPPING DETAILS (gray bg) ===
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
    doc.text(`COD: Rp${data.codAmount.toLocaleString('id-ID')}`, margin + 25, y + 2);
  }
  if (data.courierService) {
    doc.text(`Layanan: ${data.courierService}`, margin + 50, y + 2);
  }

  y += 5;

  // Waybill number
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

  // Save
  doc.save(`resi-${data.orderNumber}.pdf`);
}
