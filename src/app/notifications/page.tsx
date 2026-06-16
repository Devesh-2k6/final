"use client";

import { useEffect, useState } from "react";
import { Bell, ArrowLeft, Clock, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { getMyNotifications, markAllNotificationsAsRead } from "@/services/notifications";
import type { ApiNotification } from "@/types/product";
import { getErrorMessage } from "@/api/errors";
import { useAuth } from "@/contexts/AuthenticationContext";

export default function Notifications() {
  const [now, setNow] = useState<number | null>(null);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNow(Date.now());
    if (user) {
      void fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      alert("Failed to mark notifications as read: " + getErrorMessage(err));
    }
  };

  const getIconInfo = (title: string, message: string) => {
    const t = title.toLowerCase();
    const m = message.toLowerCase();
    if (t.includes("expir") || m.includes("expir") || t.includes("urgent")) {
      return {
        icon: Clock,
        color: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      };
    }
    if (t.includes("new deal") || m.includes("new deal") || t.includes("near") || m.includes("near")) {
      return {
        icon: MapPin,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      };
    }
    if (t.includes("completed") || m.includes("completed") || t.includes("verified")) {
      return {
        icon: CheckCircle2,
        color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      };
    }
    return {
      icon: Bell,
      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
  };

  const formatTime = (dateStr: string) => {
    if (!now) return "";
    try {
      const date = new Date(dateStr);
      const diffMs = now - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 py-4 dark:text-white flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </header>

      {/* Notifications List */}
      <main className="p-4 space-y-3">
        {!user ? (
          <div className="py-20 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Please Sign In</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You must be logged in to view notifications.
            </p>
            <Link
              href="/auth?tab=login"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition"
            >
              Sign In
            </Link>
          </div>
        ) : loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={36} />
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">All caught up!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You don&apos;t have any notifications right now.
            </p>
          </div>
        ) : (
          notifications.map((notif, i) => {
            const { icon: Icon, color } = getIconInfo(notif.title, notif.message);
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={notif.id}
                className={`bg-white dark:bg-gray-800 p-4 rounded-2xl flex gap-4 border transition hover:shadow-md ${
                  !notif.is_read
                    ? "border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                    : "border-gray-100 dark:border-gray-700"
                }`}
              >
                <div className={`p-3 rounded-full flex-shrink-0 self-start ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3
                      className={`text-sm font-bold truncate ${
                        !notif.is_read
                          ? "text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                      {formatTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug break-words">
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 self-center"></div>
                )}
              </motion.div>
            );
          })
        )}
      </main>
    </div>
  );
}
