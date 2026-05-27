"use client";

import { useState } from "react";
import { Star, Loader2, X, Upload, Shield } from "lucide-react";

interface ReviewFormProps {
  productId: number;
  productName?: string;
  onSuccess?: () => void;
}

export default function ReviewForm({ productId, productName, onSuccess }: ReviewFormProps) {
  const [reviewer, setReviewer] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerPhone, setReviewerPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "reviews");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.url) newImages.push(data.url);
        }
      } catch {
        // ignore single file error
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
    // Reset input
    e.target.value = "";
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    if (!reviewer.trim() || !review.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          reviewer: reviewer.trim(),
          reviewer_email: reviewerEmail.trim() || undefined,
          reviewer_phone: reviewerPhone.trim() || undefined,
          rating,
          review: review.trim(),
          images,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setReviewer("");
        setReviewerEmail("");
        setReviewerPhone("");
        setRating(5);
        setReview("");
        setImages([]);
        onSuccess?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-sm p-3 text-center">
        <p className="text-sm text-green-700 font-medium">Ulasan berhasil dikirim!</p>
        <p className="text-xs text-green-600 mt-0.5">Terima kasih atas ulasan Anda.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm border border-shopee-border/50 p-3 space-y-3">
      {productName && <p className="text-xs font-medium text-shopee-text">Ulasan untuk: {productName}</p>}

      <div className="grid grid-cols-1 gap-3">
        <input
          type="text"
          placeholder="Nama *"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-shopee-border rounded-sm focus:outline-none focus:border-shopee-orange"
        />
        <input
          type="email"
          placeholder="Email (opsional)"
          value={reviewerEmail}
          onChange={(e) => setReviewerEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-shopee-border rounded-sm focus:outline-none focus:border-shopee-orange"
        />
        <input
          type="tel"
          placeholder="Nomor Telepon (opsional)"
          value={reviewerPhone}
          onChange={(e) => setReviewerPhone(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-shopee-border rounded-sm focus:outline-none focus:border-shopee-orange"
        />
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="p-0.5"
          >
            <Star className={`w-5 h-5 ${star <= rating ? "text-shopee-yellow fill-shopee-yellow" : "text-shopee-border"}`} />
          </button>
        ))}
        <span className="text-xs text-shopee-text-secondary ml-2">{rating}/5</span>
      </div>

      <textarea
        placeholder="Bagikan pengalaman Anda dengan produk ini... *"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-shopee-border rounded-sm focus:outline-none focus:border-shopee-orange resize-none"
      />

      {/* Image Upload */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          <span className="flex items-center gap-1.5 px-3 py-1.5 border border-shopee-border rounded-sm text-xs text-shopee-text hover:border-shopee-orange transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Mengupload..." : "Tambah Foto"}
          </span>
        </label>
        {images.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded-sm border border-shopee-border overflow-hidden flex-shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(url)}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-shopee-text-secondary bg-shopee-gray rounded-sm p-2">
        <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Email dan nomor telepon bersifat opsional. Kami tidak akan membagikan data pribadi Anda kepada pihak lain.</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !reviewer.trim() || !review.trim()}
        className="w-full px-4 py-2 bg-shopee-orange text-white text-sm rounded-sm hover:bg-[#1A7BD4] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Kirim Ulasan
      </button>
    </div>
  );
}
