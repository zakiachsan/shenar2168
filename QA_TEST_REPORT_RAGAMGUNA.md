# QA Test Report — RagamGuna.com

**Tanggal Test:** 30 Mei 2026  
**Tester:** QA Engineer (Automated Browser Testing)  
**Environment:** Production (https://ragamguna.com)  
**Browser:** Chromium (Desktop 1280x800 & Mobile 375x812)  
**Tech Stack:** Next.js 16.2.6, Pure MySQL (no WooCommerce), PM2 Deployment  

---

## Executive Summary

| Kategori | Hasil |
|----------|-------|
| **Frontend Public** | ⚠️ Partial Pass — Homepage & navigasi berfungsi, tetapi **seluruh section produk kosong** |
| **Admin Authentication** | ✅ Pass — Login/logout berfungsi, session cookie bekerja |
| **Admin Dashboard** | ✅ Pass — Stats & chart tampil (data 0 karena DB kosong) |
| **Admin Categories** | ✅ Pass — List, detail, dan view berfungsi (MySQL lokal) |
| **Admin Products** | ❌ Fail — List kosong, **tambah produk error 500** (masih terhubung ke WooCommerce external) |
| **Admin Orders / Customers** | ⚠️ Pass — Halaman load, data kosong |
| **Admin CMS (Banner, Etalase, etc)** | ✅ Pass — Halaman & form tampil normal |
| **Mobile Responsive** | ✅ Pass — Layout rapi di mobile viewport |

**Critical Issues:** 2  
**Major Issues:** 1  
**Minor Issues:** 3  

---

## 1. Frontend Public — Test Results

### 1.1 Homepage (`/`)
- **Status:** ⚠️ Partial Pass
- **Screenshot:** `qa_01_homepage.png`, `qa_27_homepage_banners.png`
- **Observations:**
  - Header, kategori grid, banner, footer tampil normal
  - Semua section produk menampilkan **"Belum ada produk"**
  - Flash sale countdown 00:00:00
  - **Console Error:** `404 /api/wc/products/categories?slug=elektronik` (sisa endpoint WooCommerce)

### 1.2 Category Page (`/category/elektronik`)
- **Status:** ⚠️ Partial Pass
- **Screenshot:** `qa_02_category_page.png`
- **Observations:**
  - Halaman terbuka, layout kategori tampil
  - Tidak ada produk yang dirender
  - **Console Error:** `404 /api/wc/products/categories?slug=elektronik`

### 1.3 Search Page (`/search?q=elektronik`)
- **Status:** ⚠️ Partial Pass
- **Screenshot:** `qa_20_public_search.png`
- **Observations:**
  - Form search berfungsi
  - Hasil pencarian kosong

### 1.4 Cart (`/cart`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_18_public_cart.png`
- **Observations:**
  - Halaman cart terbuka normal
  - Menampilkan "Keranjang belanja kosong"

### 1.5 Checkout (`/checkout`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_19_public_checkout.png`
- **Observations:**
  - Halaman checkout terbuka normal
  - Form alamat & metode pembayaran tampil

### 1.6 Product Detail (`/product/[slug]`)
- **Status:** ❌ Cannot Test
- **Observations:**
  - Tidak ada produk di homepage/kategori untuk diklik
  - API `/api/products` return `{"products":[],"total":0}`

### 1.7 Mobile Responsive
- **Status:** ✅ Pass
- **Screenshot:** `qa_21_mobile_homepage.png`, `qa_22_mobile_admin_dashboard.png`
- **Observations:**
  - Homepage mobile: layout rapi, kategori grid responsif
  - Admin dashboard mobile: sidebar collapse, card stats tampil rapi

---

## 2. Admin Panel — Test Results

### 2.1 Login (`/admin/login`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_03_admin_login.png`, `qa_24_admin_logout.png`
- **Test Cases:**
  - ✅ Login dengan kredensial valid → redirect ke `/admin`
  - ✅ Logout → redirect ke `/admin/login`
  - ✅ Akses `/api/admin/stats` tanpa session → `401 Unauthorized`
  - ✅ Akses `/api/admin/stats` dengan session → `200 OK`

### 2.2 Dashboard (`/admin`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_04_admin_dashboard.png`
- **API Response:** `{"totalProducts":0,"totalOrders":0,"totalRevenue":0,"pendingOrders":0,"processingOrders":0,"completedOrders":0,"username":"admin"}`
- **Observations:**
  - Stat card tampil semua (Products, Orders, Revenue, Pending, Processing, Completed)
  - Chart orders per bulan tampil

### 2.3 Products (`/admin/products`)
- **Status:** ❌ Fail
- **Screenshot:** `qa_05_admin_products.png`
- **API Response:** `{"products":[],"total":0}`
- **Add Product (`/admin/products/new`)**
  - **Screenshot:** `qa_23_admin_add_product.png`, `qa_26_admin_add_product_submit.png`
  - **Status:** ❌ **CRITICAL BUG**
  - Submit form tambah produk return **HTTP 500**
  - **Error:** `"Data truncated for column 'status' at row 1"`
  - **Root Cause:** `lib/admin-api.ts` masih memanggil `wcRequest()` ke WooCommerce external (`api.shenar2168.com`) alih-alih MySQL lokal. Status value `'publish'` tidak cocok dengan schema WooCommerce target atau ada mismatch enum.

### 2.4 Categories (`/admin/categories`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_06_admin_categories.png`
- **API Response:** `{"categories":[...]}` — 16 kategori tersedia
- **Category Detail (`/admin/categories/1`)**
  - **Screenshot:** `qa_07_admin_category_detail.png`
  - **Status:** ✅ Pass
  - Data kategori (ID, slug, posisi, jumlah produk, deskripsi) tampil benar
  - Tombol "Lihat di Toko" aktif

### 2.5 Orders (`/admin/orders`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_08_admin_orders.png`
- **API Response:** `{"orders":[],"total":0}`

### 2.6 Customers (`/admin/customers`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_09_admin_customers.png`
- **API Response:** `{"customers":[],"total":0}`

### 2.7 Banners (`/admin/banners`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_10_admin_banners.png`
- **Observations:**
  - 3 banner default tampil
  - Toggle active/inactive berfungsi

### 2.8 Etalase (`/admin/etalase`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_28_admin_etalase.png`, `qa_11_admin_etalase.png`
- **Observations:**
  - Section "Flash Sale", "Diskon", "Terlaris", "Rekomendasi" tampil
  - Tidak bisa assign produk karena tidak ada produk

### 2.9 Coupons (`/admin/coupons`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_12_admin_coupons.png`
- **Observations:**
  - Form tambah kupon tampil (nama, kode, tipe, nilai, min. order, berlaku)
  - List kosong

### 2.10 Points (`/admin/points`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_13_admin_points.png`
- **Observations:**
  - Form setting poin tampil (rate, maksimum, minimum, bonus, expire)

### 2.11 Reviews (`/admin/reviews`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_14_admin_reviews.png`

### 2.12 Discussions (`/admin/discussions`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_15_admin_discussions.png`

### 2.13 Settings (`/admin/settings`)
- **Status:** ✅ Pass
- **Screenshot:** `qa_16_admin_settings.png`
- **Observations:**
  - Form pengaturan toko tampil (nama, deskripsi, kontak, bank, ongkir)

### 2.14 Flash Sale (`/admin/flash-sale`)
- **Status:** ⚠️ Pass (Empty Data)
- **Screenshot:** `qa_29_admin_flashsale.png`

### 2.15 Add Category (`/admin/categories` modal)
- **Status:** ✅ Pass
- **Screenshot:** `qa_17_admin_add_category.png`
- **Observations:**
  - Form tambah kategori tampil (nama, slug, deskripsi, gambar, posisi)

---

## 3. Broken / Missing Pages

| URL | Status | Note |
|-----|--------|------|
| `/admin/discount` | ❌ 404 | Tidak ada page file |
| `/admin/stok` | ❌ 404 | Tidak ada page file (sudah dihapus dari sidebar) |

---

## 4. Bugs & Issues Classification

### 🔴 Critical (Blocker)

#### Issue #CR-001: Tambah Produk Admin Error 500
- **Severity:** Critical
- **Module:** Admin > Produk > Tambah Produk
- **Repro Steps:**
  1. Login ke admin
  2. Buka `/admin/products/new`
  3. Isi semua field wajib
  4. Klik "Simpan Produk"
- **Expected:** Produk berhasil disimpan ke database lokal
- **Actual:** Error 500 `"Data truncated for column 'status' at row 1"`
- **Root Cause:** `lib/admin-api.ts` masih menggunakan `wcRequest()` ke WooCommerce external (`api.shenar2168.com`). Seluruh CRUD produk, pesanan, pelanggan, dan variasi masih mengarah ke WooCommerce bukan MySQL lokal ragamguna.
- **Recommendation:** Rewrite `lib/admin-api.ts` product/order/customer functions untuk menggunakan MySQL lokal (`lib/products.ts`, `lib/orders.ts`, `lib/customers.ts`).

#### Issue #CR-002: Frontend Public Tidak Menampilkan Produk
- **Severity:** Critical
- **Module:** Frontend Public (Homepage, Kategori, Search)
- **Repro Steps:**
  1. Buka `https://ragamguna.com`
  2. Scroll ke section "Rekomendasi", "Flash Sale", "Terlaris"
- **Expected:** Produk tampil sesuai data DB
- **Actual:** Semua section menampilkan "Belum ada produk"
- **Root Cause:** API `/api/products` return `{"products":[],"total":0}`. Database `products` table kosong (tidak ada INSERT di `init.sql` dan tidak bisa ditambah karena Issue #CR-001).
- **Recommendation:** Perbaiki Issue #CR-001 agar admin bisa input produk, atau seed data dummy ke DB.

---

### 🟠 Major

#### Issue #MA-001: Console Error 404 — Sisa Endpoint WooCommerce
- **Severity:** Major
- **Module:** Frontend Public > Category Pages
- **Repro Steps:**
  1. Buka `/category/elektronik`
  2. Buka DevTools Console
- **Expected:** Tidak ada error 404
- **Actual:** `GET https://ragamguna.com/api/wc/products/categories?slug=elektronik 404`
- **Root Cause:** Frontend masih memanggil `/api/wc/products/categories` yang tidak ada di ragamguna (pure MySQL, bukan WooCommerce).
- **Recommendation:** Ganti endpoint category public ke `/api/products?category=...` atau buat endpoint proxy kategori lokal.

---

### 🟡 Minor

#### Issue #MI-001: Halaman `/admin/discount` Return 404
- **Severity:** Minor
- **Recommendation:** Hapus menu jika tidak digunakan, atau buat page redirect ke `/admin/coupons`.

#### Issue #MI-002: Admin Products & Orders Masih Fetch ke WooCommerce External
- **Severity:** Minor
- **Note:** Walaupun return kosong, behavior ini tidak konsisten dengan arsitektur "pure MySQL". Jika WooCommerce target down, fitur admin akan broken.

#### Issue #MI-003: Flash Sale Countdown 00:00:00
- **Severity:** Minor
- **Module:** Homepage
- **Note:** Flash sale tidak ada data aktif sehingga countdown menunjukkan 00:00:00.

---

## 5. API Health Check

| Endpoint | Auth | Status | Response |
|----------|------|--------|----------|
| `GET /api/products` | No | 200 | `{"products":[],"total":0}` |
| `GET /api/admin/stats` | Yes | 200 | Stats JSON |
| `GET /api/admin/stats` | No | 401 | `{"error":"Unauthorized"}` |
| `GET /api/admin/categories` | Yes | 200 | `{"categories":[...]}` |
| `GET /api/admin/orders` | Yes | 200 | `{"orders":[],"total":0}` |
| `GET /api/admin/customers` | Yes | 200 | `{"customers":[],"total":0}` |
| `POST /api/admin/products` | Yes | 500 | `{"error":"Data truncated..."}` |

---

## 6. Recommendations

1. **Prioritas Tertinggi:** Fix `lib/admin-api.ts` — pisahkan fungsi WooCommerce (shenar2168) dan MySQL lokal (ragamguna). Untuk ragamguna, gunakan `lib/products.ts`, `lib/orders.ts`, `lib/customers.ts`.
2. **Seed Data:** Insert produk dummy ke database ragamguna agar frontend bisa ditest end-to-end.
3. **Fix Public Category API:** Ganti `/api/wc/products/categories` call di frontend ke endpoint lokal MySQL.
4. **Hapus / Redirect:** Halaman `/admin/discount` dan `/admin/stok` yang 404.
5. **Regression Test Ulang:** Setelah fix #1 & #2, jalankan ulang test untuk: tambah produk, edit produk, tambah ke cart, checkout, dan product detail page.

---

## 7. Test Artifacts

Screenshot tersimpan di working directory:
- `qa_01_homepage.png` — Homepage Desktop
- `qa_02_category_page.png` — Category Page
- `qa_03_admin_login.png` — Admin Login
- `qa_04_admin_dashboard.png` — Admin Dashboard
- `qa_05_admin_products.png` — Admin Products
- `qa_06_admin_categories.png` — Admin Categories
- `qa_07_admin_category_detail.png` — Category Detail
- `qa_08_admin_orders.png` — Admin Orders
- `qa_09_admin_customers.png` — Admin Customers
- `qa_10_admin_banners.png` — Admin Banners
- `qa_11_admin_etalase.png` — Admin Etalase
- `qa_12_admin_coupons.png` — Admin Coupons
- `qa_13_admin_points.png` — Admin Points
- `qa_14_admin_reviews.png` — Admin Reviews
- `qa_15_admin_discussions.png` — Admin Discussions
- `qa_16_admin_settings.png` — Admin Settings
- `qa_17_admin_add_category.png` — Add Category Form
- `qa_18_public_cart.png` — Public Cart
- `qa_19_public_checkout.png` — Public Checkout
- `qa_20_public_search.png` — Public Search
- `qa_21_mobile_homepage.png` — Mobile Homepage
- `qa_22_mobile_admin_dashboard.png` — Mobile Admin Dashboard
- `qa_23_admin_add_product.png` — Add Product Form
- `qa_26_admin_add_product_submit.png` — Add Product Error
- `qa_27_homepage_banners.png` — Homepage Banners
- `qa_28_admin_etalase.png` — Admin Etalase (revisit)
- `qa_29_admin_flashsale.png` — Admin Flash Sale
- `qa_30_admin_discount_404.png` — 404 Discount Page

---

**Report Generated By:** QA Automation — Playwright Browser Testing  
**Status:** COMPLETE  
**Next Action Required:** Fix CR-001 & CR-002, then re-run regression test.
