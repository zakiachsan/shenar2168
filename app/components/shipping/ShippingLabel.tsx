'use client';

import React from "react";
import { Truck, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

interface ShippingLabelProps {
  orderNumber: string;
  courierCode?: string;
  courierService?: string;
  waybillId?: string;
  trackingId?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientPostalCode?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  senderCity?: string;
  senderPostalCode?: string;
  weight?: number;
  codAmount?: number;
  items?: {
    name: string;
    sku?: string;
    variation?: string;
    quantity: number;
    weight?: number;
  }[];
  storeName?: string;
  showCTA?: boolean;
  onTrack?: () => void;
  compact?: boolean;
}

const COURIER_INFO: Record<string, { name: string; color: string; bgColor: string; textColor: string }> = {
  jne: { name: 'JNE', color: '#006CB7', bgColor: '#E6F3FB', textColor: '#006CB7' },
  jnt: { name: 'J&T Express', color: '#FF0000', bgColor: '#FFECEC', textColor: '#FF0000' },
  sicepat: { name: 'SiCepat', color: '#FF6B00', bgColor: '#FFF3E6', textColor: '#FF6B00' },
  anteraja: { name: 'AnterAja', color: '#00A651', bgColor: '#E6F9EF', textColor: '#00A651' },
  ninja: { name: 'Ninja Express', color: '#3D3D3D', bgColor: '#F0F0F0', textColor: '#3D3D3D' },
  idexpress: { name: 'IDExpress', color: '#003DA5', bgColor: '#E6EEF9', textColor: '#003DA5' },
  gojek: { name: 'GoSend', color: '#00AA13', bgColor: '#E6F9EB', textColor: '#00AA13' },
  grab: { name: 'GrabExpress', color: '#00B14F', bgColor: '#E6F9ED', textColor: '#00B14F' },
};

function CourierLogo({ code, size = 32 }: { code: string; size?: number }) {
  const info = COURIER_INFO[code] || { name: code.toUpperCase(), color: '#666', bgColor: '#F3F4F6', textColor: '#666' };
  
  // Simple text-based logo for each courier
  const logos: Record<string, React.ReactNode> = {
    jne: (
      <svg viewBox="0 0 80 28" width={size * 2.8} height={size}>
        <rect width="80" height="28" rx="4" fill={info.color} />
        <text x="40" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">JNE</text>
      </svg>
    ),
    jnt: (
      <svg viewBox="0 0 80 28" width={size * 2.8} height={size}>
        <rect width="80" height="28" rx="4" fill={info.color} />
        <text x="40" y="19" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">J&T</text>
      </svg>
    ),
    sicepat: (
      <svg viewBox="0 0 80 28" width={size * 2.8} height={size}>
        <rect width="80" height="28" rx="4" fill={info.color} />
        <text x="40" y="19" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">SICEPAT</text>
      </svg>
    ),
    anteraja: (
      <svg viewBox="0 0 80 28" width={size * 2.8} height={size}>
        <rect width="80" height="28" rx="4" fill={info.color} />
        <text x="40" y="19" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">ANTERAJA</text>
      </svg>
    ),
  };

  return logos[code] || (
    <div 
      className="inline-flex items-center justify-center rounded px-2 py-1"
      style={{ backgroundColor: info.bgColor, minWidth: size * 2.8, height: size }}
    >
      <span className="text-xs font-bold" style={{ color: info.textColor }}>
        {(info.name || code).toUpperCase()}
      </span>
    </div>
  );
}

function Barcode({ value, height = 40 }: { value: string; height?: number }) {
  // Generate pseudo-barcode using CSS
  const bars = [];
  const chars = value.split('');
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    const widths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1];
    const w = widths[code % widths.length];
    const isBar = i % 2 === 0;
    bars.push(
      <div
        key={i}
        style={{
          width: `${w}px`,
          height: `${height}px`,
          backgroundColor: isBar ? '#1a1a1a' : 'transparent',
          marginRight: '1px',
        }}
      />
    );
  }
  // Add extra thin bars at start and end
  bars.unshift(
    <div key="start" style={{ width: '1px', height: `${height}px`, backgroundColor: '#1a1a1a', marginRight: '1px' }} />
  );
  bars.push(
    <div key="end" style={{ width: '1px', height: `${height}px`, backgroundColor: '#1a1a1a', marginLeft: '1px' }} />
  );
  return (
    <div className="flex items-end justify-center">
      {bars}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ShippingLabel({
  orderNumber,
  courierCode = '',
  courierService = '',
  waybillId = '',
  trackingId = '',
  recipientName = 'Pembeli',
  recipientPhone = '-',
  recipientAddress = '-',
  recipientCity = '',
  recipientPostalCode = '',
  senderName = 'Toko',
  senderPhone = '-',
  senderAddress = '-',
  senderCity = '',
  senderPostalCode = '',
  weight = 0,
  codAmount = 0,
  items = [],
  storeName = 'Shenar2168',
  showCTA = true,
  onTrack,
  compact = false,
}: ShippingLabelProps) {
  const [copied, setCopied] = useState(false);
  const courier = COURIER_INFO[courierCode] || { name: courierCode?.toUpperCase() || '-', color: '#666', bgColor: '#F3F4F6', textColor: '#666' };
  const displayNumber = waybillId || trackingId || orderNumber;

  const copyTracking = () => {
    navigator.clipboard.writeText(displayNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Compact Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CourierLogo code={courierCode} size={20} />
              <div>
                <p className="text-xs text-gray-500">No. Resi</p>
                <p className="text-sm font-mono font-bold text-gray-900">{displayNumber}</p>
              </div>
            </div>
            <button
              onClick={copyTracking}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              title="Salin nomor resi"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showCTA && (
          <div className="p-4">
            {onTrack ? (
              <button
                onClick={onTrack}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Lacak Pengiriman
              </button>
            ) : waybillId ? (
              <a
                href={`https://www.jne.co.id/tracking/easy/?noresi=${waybillId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Lacak di {courier.name}
              </a>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Full shipping label (like Shopee style)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Label Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Store Logo */}
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{storeName}</p>
            <p className="text-[10px] text-gray-400">Resi Pengiriman</p>
          </div>
        </div>
        <div className="text-right">
          <CourierLogo code={courierCode} size={24} />
        </div>
      </div>

      {/* Order Number + Barcode */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-1">No. Pesanan: <span className="font-mono font-semibold text-gray-700">{orderNumber}</span></p>
        <Barcode value={orderNumber} height={36} />
      </div>

      {/* Recipient & Sender Info */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {/* Recipient */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Penerima</p>
            <p className="text-sm font-bold text-gray-900">{recipientName}</p>
            <p className="text-xs text-gray-600">{recipientPhone}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{recipientAddress}</p>
            {recipientCity && (
              <div className="mt-1.5 inline-block bg-gray-100 rounded px-2 py-0.5">
                <p className="text-[10px] font-semibold text-gray-700">{recipientCity}{recipientPostalCode ? ` ${recipientPostalCode}` : ''}</p>
              </div>
            )}
          </div>
          {/* Sender */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pengirim</p>
            <p className="text-sm font-bold text-gray-900">{senderName}</p>
            <p className="text-xs text-gray-600">{senderPhone}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{senderAddress}</p>
            {senderCity && (
              <div className="mt-1.5 inline-block bg-gray-100 rounded px-2 py-0.5">
                <p className="text-[10px] font-semibold text-gray-700">{senderCity}{senderPostalCode ? ` ${senderPostalCode}` : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Details */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-6 text-xs">
          {weight > 0 && (
            <div>
              <span className="text-gray-400">Berat: </span>
              <span className="font-semibold text-gray-700">{weight >= 1000 ? `${(weight / 1000).toFixed(1)} kg` : `${weight} gr`}</span>
            </div>
          )}
          {codAmount > 0 && (
            <div>
              <span className="text-gray-400">COD: </span>
              <span className="font-semibold text-gray-700">{formatCurrency(codAmount)}</span>
            </div>
          )}
          {courierService && (
            <div>
              <span className="text-gray-400">Layanan: </span>
              <span className="font-semibold text-gray-700">{courierService}</span>
            </div>
          )}
        </div>
        {/* Waybill number with barcode */}
        {waybillId && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">No. Resi</p>
            <p className="text-sm font-mono font-bold text-gray-900">{waybillId}</p>
            <div className="mt-1">
              <Barcode value={waybillId} height={28} />
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-medium">#</th>
                <th className="text-left py-1.5 font-medium">Nama Produk</th>
                <th className="text-left py-1.5 font-medium">Variasi</th>
                <th className="text-center py-1.5 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 text-gray-700 max-w-[200px] truncate">{item.name}</td>
                  <td className="py-1.5 text-gray-500">{item.variation || '-'}</td>
                  <td className="py-1.5 text-center text-gray-700">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CTA */}
      {showCTA && (
        <div className="px-5 py-4">
          {onTrack ? (
            <button
              onClick={onTrack}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Lacak Pengiriman
            </button>
          ) : waybillId ? (
            <a
              href={`https://www.tracker.id/en/courier/${courierCode}/${waybillId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Lacak di {courier.name}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
