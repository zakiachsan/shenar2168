/**
 * OTP Send API — sends OTP via Wablas WhatsApp
 */
import { NextRequest, NextResponse } from "next/server";

const WABLAS_BASE_URL = "https://tegal.wablas.com";
const WABLAS_TOKEN = process.env.WABLAS_TOKEN || "187CHvn48IsJjVQFASCZhWeaBdGo8YI4pSOU3OhoWMRsvU2RMFAugdR";
const WABLAS_SECRET = process.env.WABLAS_SECRET || "Z1Zitmg6";

// In-memory OTP store (reset on server restart — for production use Redis)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Nomor telepon wajib diisi" }, { status: 400 });
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Nomor telepon tidak valid" }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(cleanPhone, { code: otp, expiresAt });

    const message = `Kode OTP Shenar2168 Anda: *${otp}*. Jangan bagikan kode ini kepada siapapun. Berlaku selama 5 menit.`;

    const res = await fetch(`${WABLAS_BASE_URL}/api/send-message`, {
      method: "POST",
      headers: {
        Authorization: `${WABLAS_TOKEN}.${WABLAS_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        phone: cleanPhone,
        message,
        flag: "instant",
      }).toString(),
    });

    const data = await res.json();

    if (!data.status) {
      console.error("Wablas error:", data);
      return NextResponse.json(
        { error: data.message || "Gagal mengirim OTP via WhatsApp" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kode OTP telah dikirim ke WhatsApp Anda",
      phone: cleanPhone,
    });
  } catch (e) {
    console.error("OTP send error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { phone, code } = await req.json();
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return NextResponse.json({ error: "OTP tidak ditemukan atau sudah kedaluwarsa" }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanPhone);
      return NextResponse.json({ error: "OTP sudah kedaluwarsa" }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: "Kode OTP salah" }, { status: 400 });
    }

    otpStore.delete(cleanPhone);
    return NextResponse.json({ success: true, message: "OTP terverifikasi" });
  } catch (e) {
    console.error("OTP verify error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
