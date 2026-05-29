import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/layout/AuthProvider";
import { CartProvider } from "@/lib/cart-context";
import TopBar from "./components/layout/TopBar";
import { getStoreSettings } from "@/lib/store-settings";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: settings.seo.metaTitle || settings.storeName,
    description: settings.seo.metaDescription || settings.storeDescription,
    icons: settings.seo.faviconUrl ? { icon: settings.seo.faviconUrl } : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <TopBar />
            {children}
          </CartProvider>
        </AuthProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.showCartToast = function(name, price) {
              var id = 'cart-toast-' + Date.now();
              var el = document.createElement('div');
              el.id = id;
              el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;background:#22c55e;color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:280px;max-width:320px;font-family:sans-serif;';
              el.innerHTML = '<div style="font-weight:500;font-size:14px;">' + name + ' ditambahkan ke keranjang!</div><div style="font-size:12px;opacity:0.8;margin-top:4px;">Rp ' + price.toLocaleString('id-ID') + '</div>';
              document.body.appendChild(el);
              setTimeout(function() { var e = document.getElementById(id); if (e) e.remove(); }, 3000);
            };
          `
        }} />
      </body>
    </html>
  );
}
