"use client";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-shopee-border mt-8 pb-20 lg:pb-0">
      <div className="max-w-[1200px] mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-medium text-sm mb-4 text-shopee-text">TENTANG KAMI</h4>
            <ul className="space-y-2 text-xs text-shopee-text-secondary">
              <li className="hover:text-shopee-orange cursor-pointer">Tentang Shenar2168</li>
              <li className="hover:text-shopee-orange cursor-pointer">Karir</li>
              <li className="hover:text-shopee-orange cursor-pointer">Kebijakan Privasi</li>
              <li className="hover:text-shopee-orange cursor-pointer">Syarat & Ketentuan</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-4 text-shopee-text">LAYANAN PELANGGAN</h4>
            <ul className="space-y-2 text-xs text-shopee-text-secondary">
              <li className="hover:text-shopee-orange cursor-pointer">Pusat Bantuan</li>
              <li className="hover:text-shopee-orange cursor-pointer">Cara Pembelian</li>
              <li className="hover:text-shopee-orange cursor-pointer">Pengiriman</li>
              <li className="hover:text-shopee-orange cursor-pointer">Pengembalian Barang</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-4 text-shopee-text">PEMBAYARAN</h4>
            <div className="flex flex-wrap gap-2">
              {["BCA", "BNI", "BRI", "Mandiri", "OVO", "Dana", "Gopay", "COD"].map((p) => (
                <span
                  key={p}
                  className="px-2 py-1 bg-shopee-gray rounded text-[10px] text-shopee-text-secondary border border-shopee-border"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-4 text-shopee-text">IKUTI KAMI</h4>
            <ul className="space-y-2 text-xs text-shopee-text-secondary">
              <li className="hover:text-shopee-orange cursor-pointer">Facebook</li>
              <li className="hover:text-shopee-orange cursor-pointer">Instagram</li>
              <li className="hover:text-shopee-orange cursor-pointer">TikTok</li>
              <li className="hover:text-shopee-orange cursor-pointer">YouTube</li>
              <li className="hover:text-shopee-orange cursor-pointer">Telegram</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-shopee-border text-center text-xs text-shopee-text-secondary">
          <p>© 2025 Shenar2168. Hak Cipta Dilindungi.</p>
          <p className="mt-1">Negara: Indonesia | Singapore | Malaysia | Thailand | Vietnam | Philippines</p>
        </div>
      </div>
    </footer>
  );
}
