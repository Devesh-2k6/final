"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Menu, X, Leaf, LogOut, Shield, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthenticationContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth?role=admin&tab=login");
        return;
      }
      if (user.role !== "ADMIN" && !user.email?.toLowerCase().startsWith("admin")) {
        router.replace("/deals");
      }
    }
  }, [isLoading, user, router]);

  const handleLogout = () => {
    logout();
    router.push("/auth?role=admin&tab=login");
  };

  // Only link routes that actually exist.
  const navigation = [
    { name: 'Reports Dashboard', href: '/admin', icon: BarChart3 },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  if (isLoading || (!user && typeof window !== "undefined")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-emerald-400" size={32} />
          <p className="text-xs font-bold text-gray-400">Verifying Administrator Privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2" onClick={closeSidebar}>
            <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
              <Leaf size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">Admin Console</span>
          </Link>
          <button onClick={closeSidebar} className="ml-auto lg:hidden text-gray-400 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="mb-4 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-white" : "text-gray-400"} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer: Admin Profile & Logout Button */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/60 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black text-xs">
              <Shield size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || "Platform Admin"}</p>
              <p className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {user?.email || "Administrator"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="admin-sidebar-logout-btn"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/50 text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
          >
            <LogOut size={15} />
            Log Out of Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mr-4 cursor-pointer"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                <ShieldCheck size={16} />
              </span>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">Meeva Administration</h2>
            </div>
          </div>

          {/* Header Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-white">{user?.name || "Admin"}</span>
              <span className="text-[10px] text-slate-500 font-medium">{user?.email || "Administrator"}</span>
            </div>
            <button
              onClick={handleLogout}
              id="admin-header-logout-btn"
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-950/40 text-slate-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 border border-slate-200 dark:border-gray-600 hover:border-red-200 text-xs font-bold transition cursor-pointer"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
