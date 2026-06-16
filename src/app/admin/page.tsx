"use client";

import { Users, Store, ShieldAlert, TrendingUp, Search, Trash2 } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { name: "Total Users", value: "14,502", icon: Users, change: "+12%" },
    { name: "Active Shops", value: "843", icon: Store, change: "+5%" },
    { name: "Reported Listings", value: "12", icon: ShieldAlert, change: "-2", danger: true },
    { name: "Food Saved (lbs)", value: "5,230", icon: TrendingUp, change: "+24%" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Platform overview and moderation queue.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-gray-500 dark:text-gray-400">
                <stat.icon size={20} className={stat.danger ? 'text-red-500' : ''} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.danger 
                ? 'text-red-600 bg-red-50 dark:bg-red-500/10' 
                : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
              }`}>
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Moderation Queue */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Moderation Queue (Fake Listings)</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search reports..." 
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-emerald-500 w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4 font-semibold">Reported Item</th>
                <th className="px-6 py-4 font-semibold">Shop Name</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {[1, 2].map((i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="https://images.unsplash.com/photo-1589367920969-abce79c58b50?w=100&q=80" alt="Item" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">Suspicious Bread Listing</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Main Street Bakery</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      Misleading Expiry Date
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 rounded-lg text-sm font-medium transition">
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
