"use client";

import { useEffect, useRef, useState } from "react";
import { X, Navigation, Loader2, MapPin, Search } from "lucide-react";

declare global {
  interface Window {
    L: any;
  }
}

interface MapPickerProps {
  onSelect: (address: string, lat: number, lng: number, postalCode: string) => void;
  onClose: () => void;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapPicker({ onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedPostalCode, setSelectedPostalCode] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  // Default: Jakarta center
  const [center, setCenter] = useState({ lat: -6.2088, lng: 106.8456 });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        // Auto-detect GPS location on open (just center, don't confirm)
        requestGpsLocation();
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
    setSelectedLat(lat);
    setSelectedLng(lng);
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

  // Auto-center GPS on map open — doesn't confirm
  const requestGpsLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 17);
          placeMarker(latitude, longitude);
          await reverseGeocode(latitude, longitude);
        }
        setLocating(false);
        setGpsMessage("");
      },
      () => {
        setLocating(false);
        // Silently fail — user can search or click map
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }
    );
  };

  // Search address with debounce
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&accept-language=id&countrycodes=id&limit=5`
        );
        if (!res.ok) throw new Error("API error");
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selectSuggestion = async (suggestion: Suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setShowSuggestions(false);
    setSuggestions([]);

    if (leafletMap.current) {
      placeMarker(lat, lng);
      await reverseGeocode(lat, lng);
    }
  };

  const clearSelection = () => {
    setSelectedAddress("");
    setSelectedPostalCode("");
    setSelectedLat(null);
    setSelectedLng(null);
    setSearchQuery("");
  };

  const handleConfirm = () => {
    if (selectedLat !== null && selectedLng !== null) {
      // Confirm with currently selected location on map
      onSelect(
        selectedAddress || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`,
        selectedLat,
        selectedLng,
        selectedPostalCode
      );
    } else {
      // No location selected — try GPS fallback
      if (!navigator.geolocation) {
        setError("Pilih lokasi di peta atau cari alamat terlebih dahulu.");
        return;
      }
      setLocating(true);
      setError("");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          if (leafletMap.current) {
            placeMarker(latitude, longitude);
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`
              );
              const data = await res.json();
              const addr = data.display_name || "";
              const postcode = data.address?.postcode || "";
              onSelect(addr, latitude, longitude, postcode);
            } catch {
              onSelect(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude, "");
            }
          }
          setLocating(false);
        },
        () => {
          setError("Tidak bisa mengakses GPS. Pilih lokasi di peta atau cari alamat.");
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const hasSelection = selectedLat !== null && selectedLng !== null;

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

        {/* GPS Message Banner — only show if no selection and GPS is being quirky */}
        {gpsMessage && !hasSelection && !locating && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 flex-shrink-0">
            <Navigation className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">{gpsMessage}</p>
          </div>
        )}

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
              <span className="text-xs text-shopee-text">Mendeteksi lokasi...</span>
            </div>
          )}
        </div>

        {/* Search — below map */}
        <div ref={searchRef} className="relative px-4 pt-3 pb-1 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shopee-text-secondary" />
            <input
              type="text"
              value={selectedAddress || searchQuery}
              onChange={(e) => {
                if (selectedAddress) {
                  clearSelection();
                }
                handleSearchInput(e.target.value);
              }}
              onClick={() => {
                if (selectedAddress) {
                  clearSelection();
                }
              }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder={selectedAddress ? "Klik untuk ganti alamat..." : "Cari alamat, nama jalan, atau kota..."}
              className="w-full pl-9 pr-3 py-2 text-sm border border-shopee-border rounded-sm outline-none focus:border-shopee-orange text-shopee-text cursor-pointer"
            />
            {selectedAddress && (
              <button
                onClick={clearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-shopee-text-secondary hover:text-shopee-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searching && (
              <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-shopee-text-secondary" />
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-shopee-border rounded-sm shadow-lg z-10 max-h-[200px] overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-sm text-shopee-text hover:bg-shopee-orange-light/50 border-b border-shopee-border last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-shopee-orange mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="px-4 py-1 text-xs text-red-500 flex-shrink-0">{error}</p>}

        {/* Actions */}
        <div className="p-4 flex-shrink-0">
          <button
            onClick={handleConfirm}
            disabled={locating}
            className="w-full flex items-center justify-center gap-2 bg-shopee-orange text-white text-sm font-medium rounded-sm px-3 py-2.5 hover:bg-[#1A7BD4] transition-colors disabled:opacity-60"
          >
            <Navigation className="w-4 h-4" />
            {locating
              ? "Mencari Lokasi..."
              : hasSelection
                ? "Gunakan Lokasi Ini"
                : "Gunakan Lokasi Saat Ini"}
          </button>
        </div>
      </div>
    </div>
  );
}
