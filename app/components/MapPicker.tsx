"use client";

import { useEffect, useRef, useState } from "react";
import { X, Navigation, Loader2, MapPin } from "lucide-react";

declare global {
  interface Window {
    L: any;
  }
}

interface MapPickerProps {
  onSelect: (address: string, lat: number, lng: number, postalCode: string) => void;
  onClose: () => void;
}

export default function MapPicker({ onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedPostalCode, setSelectedPostalCode] = useState("");
  const [error, setError] = useState("");

  // Default: Jakarta center
  const [center, setCenter] = useState({ lat: -6.2088, lng: 106.8456 });

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    let cssLink: HTMLLinkElement | null = null;
    let script: HTMLScriptElement | null = null;

    async function init() {
      if (!document.getElementById("leaflet-css")) {
        cssLink = document.createElement("link");
        cssLink.id = "leaflet-css";
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(cssLink);
      }

      if (!window.L) {
        script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script!.onload = () => resolve();
          script!.onerror = () => reject();
          document.head.appendChild(script!);
        });
      }

      if (mapRef.current && window.L) {
        const L = window.L;
        leafletMap.current = L.map(mapRef.current).setView([center.lat, center.lng], 15);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(leafletMap.current);

        // Click to place marker
        leafletMap.current.on("click", async (e: any) => {
          const { lat, lng } = e.latlng;
          placeMarker(lat, lng);
          await reverseGeocode(lat, lng);
        });

        setLoading(false);

        // Try get user location
        getUserLocation();
      }
    }

    init();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const placeMarker = (lat: number, lng: number) => {
    if (!window.L || !leafletMap.current) return;
    const L = window.L;
    if (markerRef.current) {
      leafletMap.current.removeLayer(markerRef.current);
    }
    markerRef.current = L.marker([lat, lng]).addTo(leafletMap.current);
    leafletMap.current.setView([lat, lng], 17);
    setCenter({ lat, lng });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`
      );
      const data = await res.json();
      const addr = data.display_name || "";
      const postcode = data.address?.postcode || "";
      setSelectedAddress(addr);
      setSelectedPostalCode(postcode);
      setError("");
    } catch {
      setError("Gagal mendapatkan alamat dari lokasi.");
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError("Browser tidak mendukung GPS.");
      setLoading(false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 17);
          placeMarker(latitude, longitude);
          await reverseGeocode(latitude, longitude);
        }
        setLocating(false);
      },
      () => {
        setError("Tidak bisa mengakses lokasi. Pastikan izin GPS aktif.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (selectedAddress && leafletMap.current) {
      const center = leafletMap.current.getCenter();
      onSelect(selectedAddress, center.lat, center.lng, selectedPostalCode);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-[520px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-shopee-orange px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-white font-medium text-sm">Pilih Titik Lokasi</span>
          <button onClick={onClose} className="text-white hover:text-white/80">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-shrink-0">
          <div ref={mapRef} className="w-full aspect-[4/3] bg-[#E8F4FD]" />

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
              <Loader2 className="w-6 h-6 animate-spin text-shopee-orange" />
              <p className="text-xs text-shopee-text-secondary mt-2">Memuat peta...</p>
            </div>
          )}

          {locating && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-shopee-orange" />
              <span className="text-xs text-shopee-text">Mencari lokasi...</span>
            </div>
          )}
        </div>

        {/* Address Preview */}
        <div className="px-4 py-3 border-b border-shopee-border">
          {selectedAddress ? (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-shopee-orange mt-0.5 flex-shrink-0" />
              <p className="text-sm text-shopee-text leading-snug">{selectedAddress}</p>
            </div>
          ) : (
            <p className="text-sm text-shopee-text-secondary">Klik pada peta untuk pilih lokasi</p>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2 flex-shrink-0">
          <button
            onClick={getUserLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 bg-shopee-orange text-white text-sm font-medium rounded-sm px-3 py-2.5 hover:bg-[#1A7BD4] transition-colors disabled:opacity-60"
          >
            <Navigation className="w-4 h-4" />
            {locating ? "Mencari Lokasi..." : "Gunakan Lokasi Saat Ini (GPS)"}
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selectedAddress}
            className="w-full flex items-center justify-center gap-2 border border-shopee-orange text-shopee-orange text-sm font-medium rounded-sm px-3 py-2.5 hover:bg-shopee-orange-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MapPin className="w-4 h-4" />
            Pilih Lokasi Ini
          </button>
        </div>
      </div>
    </div>
  );
}
