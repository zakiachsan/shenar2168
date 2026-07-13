"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function LoginModal({ open, onClose, title }: LoginModalProps) {
  const { login } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("phone");
      setPhone("");
      setOtp("");
      setCountdown(0);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const sendOtp = useCallback(async () => {
    setError("");
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Nomor tidak valid. Minimal 10 digit.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim OTP");
      } else {
        setStep("otp");
        setCountdown(60);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Masukkan kode OTP 6 digit.");
      return;
    }
    setLoading(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      const res = await fetch("/api/otp/send", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verifikasi gagal");
      } else {
        const cleaned = phone.replace(/\D/g, "");
        const normalizedPhone = cleaned.startsWith("62") ? cleaned : "62" + cleaned;
        // Preserve existing user name if already saved
        let finalName = "Pengguna";
        try {
          const existing = localStorage.getItem("shopee_clone_user");
          if (existing) {
            const parsed = JSON.parse(existing);
            if (parsed.phone === normalizedPhone && parsed.name && parsed.name !== "Pengguna") {
              finalName = parsed.name;
            }
          }
        } catch {}
        login(normalizedPhone, finalName);
        onClose();
        alert("Berhasil masuk! Selamat datang kembali.");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [otp, onClose, login, phone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-[400px] overflow-hidden">
        {/* Header */}
        <div className="bg-shopee-orange px-4 py-3 flex items-center justify-between">
          <span className="text-white font-medium text-sm">
            {title || (step === "phone" ? "Masuk dengan Nomor" : "Verifikasi OTP")}
          </span>
          <button onClick={onClose} className="text-white hover:text-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === "phone" ? (
            <div className="space-y-4">
              <p className="text-sm text-shopee-text-secondary">
                Masukkan nomor WhatsApp Anda untuk menerima kode OTP.
              </p>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Nomor Telepon</label>
                <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                  <span className="px-3 py-2.5 bg-shopee-gray text-sm text-shopee-text border-r border-shopee-border">+62</span>
                  <input
                    type="tel"
                    placeholder="812-3456-7890"
                    className="flex-1 px-3 py-2.5 text-sm outline-none text-shopee-text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendOtp();
                    }}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full h-10 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Kirim OTP WhatsApp
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-shopee-text-secondary">
                Kode OTP telah dikirim ke <span className="font-medium text-shopee-text">+62 {phone}</span> via WhatsApp.
              </p>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Kode OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full border border-shopee-border rounded-sm px-3 py-2.5 text-sm outline-none focus:border-shopee-orange text-shopee-text tracking-widest text-center"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") verifyOtp();
                  }}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="w-full h-10 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Verifikasi & Masuk"
                )}
              </button>
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-shopee-text-secondary">Kirim ulang dalam {countdown}s</p>
                ) : (
                  <button
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError("");
                    }}
                    className="text-xs text-shopee-orange hover:underline"
                  >
                    Ganti nomor / Kirim ulang
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
