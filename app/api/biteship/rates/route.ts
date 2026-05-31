/**
 * Biteship Rates API Proxy
 *
 * Fetches real-time courier pricing from Biteship.
 * Origin is hardcoded to PIK, Jakarta Utara (postal code 14470).
 */
import { NextRequest, NextResponse } from "next/server";

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || "";
const BITESHIP_BASE_URL = "https://api.biteship.com";

const ORIGIN_POSTAL_CODE = "14470";

interface RateItem {
  name: string;
  description?: string;
  value: number; // IDR
  weight: number; // grams
  quantity: number;
  height?: number; // cm
  length?: number; // cm
  width?: number;  // cm
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination_postal_code, items } = body as {
      destination_postal_code: string;
      items: RateItem[];
    };

    if (!destination_postal_code) {
      return NextResponse.json(
        { error: "Kode pos tujuan wajib diisi" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Items tidak boleh kosong" },
        { status: 400 }
      );
    }

    const payload = {
      origin_postal_code: ORIGIN_POSTAL_CODE,
      destination_postal_code,
      couriers: "jne,jnt,sicepat,anteraja,ninja,idexpress", // common couriers
      items: items.map((item) => ({
        name: item.name,
        description: item.description || item.name,
        value: item.value,
        weight: item.weight,
        quantity: item.quantity,
        height: item.height,
        length: item.length,
        width: item.width,
      })),
    };

    // If no API key configured, return mock rates for development
    if (!BITESHIP_API_KEY) {
      const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
      const basePrice = (w: number) => Math.max(8000, Math.round(w * 0.04));
      // Mock rates with service_type for grouping (regular / instant / same_day / next_day)
      const mockRates = [
        { courier_code: "jne", courier_service_name: "reg", duration: "2-3", price: basePrice(totalWeight) + 4000, service_type: "standard" },
        { courier_code: "jnt", courier_service_name: "ez", duration: "2-3", price: basePrice(totalWeight) + 3000, service_type: "standard" },
        { courier_code: "sicepat", courier_service_name: "reg", duration: "2-3", price: basePrice(totalWeight) + 2000, service_type: "standard" },
        { courier_code: "anteraja", courier_service_name: "next_day", duration: "1-2", price: basePrice(totalWeight) + 7000, service_type: "overnight" },
        { courier_code: "ninja", courier_service_name: "standard", duration: "3-4", price: basePrice(totalWeight) + 5000, service_type: "standard" },
        { courier_code: "gojek", courier_service_name: "instant", duration: "1-3 jam", price: basePrice(totalWeight) + 25000, service_type: "instant" },
        { courier_code: "grab", courier_service_name: "instant", duration: "1-3 jam", price: basePrice(totalWeight) + 28000, service_type: "instant" },
        { courier_code: "gojek", courier_service_name: "sameday", duration: "8-12 jam", price: basePrice(totalWeight) + 15000, service_type: "sameday" },
        { courier_code: "grab", courier_service_name: "sameday", duration: "8-12 jam", price: basePrice(totalWeight) + 18000, service_type: "sameday" },
      ];
      return NextResponse.json({ pricing: mockRates });
    }

    const res = await fetch(`${BITESHIP_BASE_URL}/v1/rates/couriers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITESHIP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Biteship rates error:", data);
      // Fallback to mock rates for all Biteship errors (auth, balance, downtime, etc.)
      // so checkout is never blocked by courier API issues.
      const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
      const basePrice = (w: number) => Math.max(8000, Math.round(w * 0.04));
      const mockRates = [
        { courier_code: "jne", courier_service_name: "Reguler", duration: "2-3", price: basePrice(totalWeight) + 4000, service_type: "standard" },
        { courier_code: "jnt", courier_service_name: "EZ", duration: "2-3", price: basePrice(totalWeight) + 3000, service_type: "standard" },
        { courier_code: "sicepat", courier_service_name: "REG", duration: "2-3", price: basePrice(totalWeight) + 2000, service_type: "standard" },
        { courier_code: "anteraja", courier_service_name: "Next Day", duration: "1-2", price: basePrice(totalWeight) + 7000, service_type: "overnight" },
        { courier_code: "ninja", courier_service_name: "Standard", duration: "3-4", price: basePrice(totalWeight) + 5000, service_type: "standard" },
        { courier_code: "gojek", courier_service_name: "instant", duration: "1-3 jam", price: basePrice(totalWeight) + 25000, service_type: "instant" },
        { courier_code: "grab", courier_service_name: "sameday", duration: "8-12 jam", price: basePrice(totalWeight) + 18000, service_type: "sameday" },
      ];
      return NextResponse.json({ pricing: mockRates });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Biteship rates exception:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
