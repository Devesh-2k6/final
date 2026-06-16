"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Leaf,
  Bell,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthenticationContext";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/shop", icon: LayoutDashboard },
    { name: "Products", href: "/shop/products", icon: Package },
    { name: "Add Product", href: "/shop/products/add", icon: PlusCircle },
    { name: "Reservations", href: "/shop/reservations", icon: ShieldCheck },
    { name: "Settings", href: "/shop/settings", icon: Settings },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  const displayName = user?.name ?? "Shop Owner";
  const displayEmail = user?.email ?? "";
  const initial = (user?.name?.[0] ?? "S").toUpperCase();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth?role=shop_owner&tab=login");
        return;
      }
      if (!user.is_shop_owner) {
        router.replace("/deals");
      }
    }
  }, [isLoading, user, router]);

  const handleLogout = () => {
    logout();
    router.push("/auth?role=shop_owner&tab=login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F4FBF7] text-slate-800 flex overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-45 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-emerald-100/60 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 flex items-center px-6 border-b border-emerald-100/40">
          <Link href="/" className="flex items-center gap-2" onClick={closeSidebar}>
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Leaf size={20} className="fill-current" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              Expiry<span className="text-emerald-600">Go</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="mb-4 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Dashboard Menu
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all border ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm"
                    : "text-slate-500 hover:text-emerald-700 border-transparent hover:bg-emerald-50/40"
                }`}
              >
                <item.icon
                  size={20}
                  className={
                    isActive
                      ? "text-emerald-750"
                      : "text-slate-400"
                  }
                />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-emerald-100/40">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-650 w-full transition-all text-left cursor-pointer"
          >
            <LogOut size={20} className="text-slate-400" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-3xl border-b border-emerald-100/40 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-emerald-50/50 cursor-pointer"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-end items-center gap-4">
            <button
              type="button"
              className="p-2 text-slate-500 hover:text-emerald-700 relative bg-emerald-50/40 rounded-xl border border-emerald-100/50 hover:bg-emerald-50 cursor-pointer transition"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="h-8 w-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-750 font-black text-sm border border-emerald-500/20 cursor-pointer transition shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              >
                {initial}
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-emerald-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-emerald-100/40 bg-emerald-50/20">
                      <p className="text-sm text-slate-800 font-bold truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/shop/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/40"
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-650 hover:bg-red-50 w-full text-left transition-colors cursor-pointer"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
