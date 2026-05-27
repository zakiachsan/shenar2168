import EtalaseForm from '@/app/components/admin/EtalaseForm';

export default function NewEtalasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Etalase</h1>
        <p className="text-sm text-gray-500 mt-1">Buat section etalase baru untuk homepage</p>
      </div>
      <EtalaseForm />
    </div>
  );
}
