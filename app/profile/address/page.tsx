"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, X, Pencil, Trash2 } from "lucide-react";
import Header from "@/app/components/layout/Header";
import BottomNav from "@/app/components/layout/BottomNav";
import AuthGuard from "@/app/components/layout/AuthGuard";

interface AddressItem {
  id: number;
  name: string;
  phone: string;
  fullAddress: string;
  note: string;
  isDefault: boolean;
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState<AddressItem[]>([]);

const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNote, setFormNote] = useState("");

  const openForm = (item?: AddressItem) => {
    if (item) {
      setEditingId(item.id);
      setFormName(item.name);
      setFormPhone(item.phone);
      setFormAddress(item.fullAddress);
      setFormNote(item.note);
    } else {
      setEditingId(null);
      setFormName("");
      setFormPhone("");
      setFormAddress("");
      setFormNote("");
    }
    setShowForm(true);
  };

  const saveAddress = () => {
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      alert("Harap isi nama, nomor telepon, dan alamat.");
      return;
    }
    if (editingId) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingId ? { ...a, name: formName, phone: formPhone, fullAddress: formAddress, note: formNote } : a
        )
      );
    } else {
      const newId = Math.max(0, ...addresses.map((a) => a.id)) + 1;
      setAddresses((prev) => [...prev, { id: newId, name: formName, phone: formPhone, fullAddress: formAddress, note: formNote, isDefault: prev.length === 0 }]);
    }
    setShowForm(false);
  };

  const deleteAddress = (id: number) => {
    if (confirm("Hapus alamat ini?")) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const setDefault = (id: number) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  };



  return (
    <>
      <Header />
      <main className="flex-1 bg-shopee-gray pb-20 lg:pb-8 min-h-screen">
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-white sticky top-0 z-40 border-b border-shopee-border">
          <Link href="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-shopee-text" />
          </Link>
          <span className="text-base font-medium text-shopee-text">Alamat Pengiriman</span>
        </div>

        <AuthGuard>
        <div className="max-w-[1200px] mx-auto px-0 lg:px-4 py-0 lg:py-4">
          <div className="hidden lg:flex items-center gap-2 mb-4">
            <Link href="/profile" className="p-1">
              <ChevronLeft className="w-5 h-5 text-shopee-text" />
            </Link>
            <h1 className="text-lg font-medium text-shopee-text">Alamat Pengiriman</h1>
          </div>

          {!showForm ? (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="bg-white lg:rounded-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-shopee-text">{addr.name}</p>
                      <span className="text-xs text-shopee-text-secondary">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] text-shopee-orange border border-shopee-orange px-1.5 py-0.5 rounded-sm">
                          Utama
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openForm(addr)} className="p-1.5 text-shopee-text-secondary hover:text-shopee-orange transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteAddress(addr.id)} className="p-1.5 text-shopee-text-secondary hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-shopee-text-secondary mt-1">{addr.fullAddress}</p>
                  {addr.note && <p className="text-xs text-shopee-text-secondary mt-1 italic">Catatan: {addr.note}</p>}
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefault(addr.id)}
                      className="mt-2 text-xs text-shopee-orange border border-shopee-orange px-3 py-1 rounded-sm hover:bg-shopee-orange-light"
                    >
                      Jadikan Alamat Utama
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => openForm()}
                className="w-full py-3 bg-white lg:rounded-sm border-2 border-dashed border-shopee-border text-shopee-text-secondary text-sm flex items-center justify-center gap-2 hover:border-shopee-orange hover:text-shopee-orange transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Alamat Baru
              </button>
            </div>
          ) : (
            <div className="bg-white lg:rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-shopee-text">{editingId ? "Ubah Alamat" : "Tambah Alamat Baru"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 text-shopee-text-secondary hover:text-shopee-text">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text"
                />
              </div>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Nomor Telepon</label>
                <div className="flex items-center border border-shopee-border rounded-sm overflow-hidden focus-within:border-shopee-orange">
                  <span className="px-3 py-2 bg-shopee-gray text-sm text-shopee-text border-r border-shopee-border">+62</span>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="812-3456-7890"
                    className="flex-1 px-3 py-2 text-sm outline-none text-shopee-text"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Alamat Lengkap</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos"
                  rows={3}
                  className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text resize-none"
                />

              </div>
              <div>
                <label className="block text-xs text-shopee-text-secondary mb-1">Catatan Alamat (opsional)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Contoh: Rumah cat hijau, dekat warung pak slamet"
                  className="w-full border border-shopee-border rounded-sm px-3 py-2 text-sm outline-none focus:border-shopee-orange text-shopee-text"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-9 border border-shopee-border text-shopee-text text-sm rounded-sm hover:bg-shopee-gray transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={saveAddress}
                  className="flex-1 h-9 bg-shopee-orange hover:bg-[#1A7BD4] text-white text-sm font-medium rounded-sm transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          )}
        </div>
        </AuthGuard>
      </main>
      <BottomNav />


    </>
  );
}
