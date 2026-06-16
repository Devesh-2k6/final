"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Users, Store, BarChart3, AlertTriangle, Menu, X, Leaf } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Reports Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Shops & Listings', href: '/admin/shops', icon: Store },
    { name: 'Moderation', href: '/admin/moderation', icon: Shield },
    { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

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
          <button onClick={closeSidebar} className="ml-auto lg:hidden text-gray-400 hover:text-white">
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
                  ? "bg-emerald-500 text-white" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-white" : "text-gray-400"} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 sm:px-6 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mr-4"
          >
            <Menu size={24} />
          </button>
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">FreshSave Administration</h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
