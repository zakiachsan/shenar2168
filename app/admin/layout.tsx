'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Image,
  Store,
  Settings,
  TicketPercent,
  Users,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Coins,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Produk', icon: Package },
  { href: '/admin/orders', label: 'Pesanan', icon: ShoppingCart, badge: 'processing' },
  { href: '/admin/categories', label: 'Kategori', icon: Tags },
  { href: '/admin/banners', label: 'Banner', icon: Image },
  { href: '/admin/etalase', label: 'Etalase', icon: Store },
  { href: '/admin/coupons', label: 'Kupon', icon: TicketPercent },
  { href: '/admin/points', label: 'Poin', icon: Coins },
  { href: '/admin/customers', label: 'Pelanggan', icon: Users },
  { href: '/admin/reviews', label: 'Ulasan', icon: MessageSquare },
  { href: '/admin/discussions', label: 'Diskusi', icon: MessageSquare },
  { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const [processingCount, setProcessingCount] = useState(0);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  // Fetch processing orders count
  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/admin/orders?status=processing&per_page=1')
        .then((res) => res.json())
        .then((data) => {
          setProcessingCount(data.total || 0);
        })
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  // Login page: render without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-gray-900 text-white transition-all duration-300 flex flex-col
          ${sidebarOpen ? 'w-64' : 'w-16'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-sm font-bold">
                RG
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">RagamGuna</h1>
                <p className="text-[10px] text-gray-400 -mt-0.5">Admin Panel</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors hidden lg:block"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 pb-20">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const showBadge = item.badge === 'processing' && processingCount > 0;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm relative
                  ${
                    active
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                  ${!sidebarOpen && 'justify-center'}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                `}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                  setMobileMenuOpen(false);
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="flex-1">{item.label}</span>}
                {sidebarOpen && showBadge && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {processingCount > 99 ? '99+' : processingCount}
                  </span>
                )}
                {!sidebarOpen && showBadge && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-900">
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400
              hover:bg-gray-800 hover:text-red-400 transition-all w-full
              ${!sidebarOpen && 'justify-center'}
            `}
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}
      >
        {/* Top Bar (mobile) */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                RG
              </div>
              <span className="text-sm font-medium text-gray-800">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
