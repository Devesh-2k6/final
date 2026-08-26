import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft, Bell, Sparkles, Tag, CheckCheck, Clock } from "lucide-react-native";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { EmptyState } from "../../components/EmptyState";
import { getNotifications, markNotificationAsRead } from "../../services/notifications";
import type { ApiNotification } from "../../types";

interface NotificationsScreenProps {
  navigation: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications & Alerts</Text>
      </View>

      {loading ? (
        <View style={styles.loaderArea}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifs();
              }}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
              onPress={() => handleMarkRead(item.id)}
            >
              <View style={styles.iconBox}>
                <Sparkles size={16} color={!item.is_read ? Colors.primary : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifMsg}>{item.message}</Text>
                <Text style={styles.notifTime}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={36} color={Colors.textMuted} />}
              title="No new alerts"
              description="You're all caught up! When stores in your radius post urgent flash discounts, you'll see them here."
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
  },
  headerTitle: {
    ...Typography.title1,
    fontSize: 18,
  },
  loaderArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  notifCardUnread: {
    borderColor: Colors.primaryGlow,
    backgroundColor: Colors.card,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    marginBottom: 2,
  },
  notifMsg: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});
