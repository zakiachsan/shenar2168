/**
 * Biteship Tracking API Proxy
 */
import { NextRequest, NextResponse } from "next/server";

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || "";
const BITESHIP_BASE_URL = "https://api.biteship.com";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const waybillId = searchParams.get("waybillId");
    const courier = searchParams.get("courier");

    if (!waybillId) {
      return NextResponse.json({ error: "Waybill ID wajib diisi" }, { status: 400 });
    }

    // If no API key, return mock tracking history for development
    if (!BITESHIP_API_KEY) {
      const mockHistory = [
        { date: new Date().toISOString(), note: "Paket sedang dalam perjalanan ke alamat tujuan", status: "transit" },
        { date: new Date(Date.now() - 86400000).toISOString(), note: "Paket telah dikirim oleh pengirim", status: "picked_up" },
      ];
      return NextResponse.json({ history: mockHistory });
    }

    const res = await fetch(
      `${BITESHIP_BASE_URL}/v1/trackings/${waybillId}/couriers/${courier || "jne"}`,
      {
        headers: {
          Authorization: `Bearer ${BITESHIP_API_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.message || "Gagal melacak pengiriman" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Biteship tracking exception:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
