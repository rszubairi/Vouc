import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.myNotifications, { limit: 50 });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  async function handleTap(n: any) {
    if (!n.isRead) await markRead({ notificationId: n._id });
    // Navigate to entity
    if (n.entity === "Post") router.push(`/(app)/post/${n.entityId}`);
    else if (n.entity === "Event") router.push(`/(app)/event/${n.entityId}`);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.markAllBtn} onPress={() => markAllRead()}>
        <Text style={styles.markAllText}>Mark all as read</Text>
      </TouchableOpacity>

      {notifications === undefined ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={notifications}
          keyExtractor={(n) => n._id}
          estimatedItemSize={70}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              style={[styles.item, !n.isRead && styles.itemUnread]}
              onPress={() => handleTap(n)}
            >
              <View style={styles.dot}>
                {!n.isRead && <View style={styles.dotInner} />}
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.subject}>{n.subject}</Text>
                <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
                <Text style={styles.time}>
                  {new Date(n._creationTime).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No notifications.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  markAllBtn: { padding: 14, alignItems: "flex-end", paddingRight: 16 },
  markAllText: { color: "#1C1B18", fontWeight: "600", fontSize: 13 },
  list: { paddingBottom: 24 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    padding: 14,
    gap: 10,
  },
  itemUnread: { backgroundColor: "#f0f4ff" },
  dot: {
    width: 10,
    height: 10,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1C1B18",
  },
  itemContent: { flex: 1 },
  subject: { fontSize: 14, fontWeight: "700", color: "#1C1B18", marginBottom: 2 },
  message: { fontSize: 13, color: "#555", lineHeight: 18 },
  time: { fontSize: 11, color: "#aaa", marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, color: "#888" },
});
