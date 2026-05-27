"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Tag, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/category", label: "Kategori", icon: LayoutGrid },
  { href: "/deals", label: "Deals", icon: Tag },
  { href: "/profile", label: "Saya", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-shopee-border z-50" role="navigation" aria-label="Navigasi utama">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={0}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-shopee-orange" : "text-[#757575]"
                }`}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[10px] transition-colors ${
                  isActive ? "text-shopee-orange font-medium" : "text-[#757575]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
