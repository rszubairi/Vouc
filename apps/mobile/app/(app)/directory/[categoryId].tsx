import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useLayoutEffect, useMemo, useState } from "react";
import { ScheduledBadge } from "../../../components/ScheduledBadge";
import { Avatar } from "../../../components/Avatar";

export default function DirectoryCategoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  // "All Directory Items" is reached via the sentinel `categoryId === "all"`
  // (set by the "All Directory Items" entry on the Divisions screen) — it
  // bypasses category filtering entirely, mirroring "All Discussions".
  const isAll = categoryId === "all";
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);
  const me = useQuery(api.profiles.me);

  const category = useQuery(
    api.categories.get,
    categoryId && !isAll ? { id: categoryId as Id<"categories"> } : "skip"
  );
  const items = useQuery(
    api.library.listItems,
    categoryId
      ? { categoryId: isAll ? undefined : (categoryId as Id<"categories">), sortBy: "recent" }
      : "skip"
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isAll ? "All Directory Items" : category ? category.name : "Directory" });
  }, [navigation, category, isAll]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.creatorNickName?.toLowerCase().includes(q)
    );
  }, [items, search]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.search}
          placeholder="Search this category"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {items === undefined ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={filteredItems}
          keyExtractor={(item) => item._id}
          estimatedItemSize={100}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/directory/item/${item._id}`)}
            >
              {item.userId === me?._id && (
                <View style={styles.scheduledRow}>
                  <ScheduledBadge postDate={item.postDate} />
                </View>
              )}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.creatorRow}>
                <Avatar
                  uri={item.creatorProfileImageUrl}
                  name={item.creatorNickName}
                  imageStyle={styles.creatorAvatar}
                  placeholderStyle={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}
                  textStyle={styles.creatorAvatarInitial}
                />
                <Text style={styles.creatorName}>{item.creatorNickName}</Text>
              </View>
              <View style={styles.engagementRow}>
                <TouchableOpacity
                  style={styles.engagementItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleEngagement({ targetType: "libraryItem", targetId: item._id, kind: "Like" });
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.isLiked ? "star" : "star-outline"}
                    size={14}
                    color={item.isLiked ? "#F2650C" : "#666"}
                  />
                  <Text style={styles.engagementText}>{item.likeCount}</Text>
                </TouchableOpacity>
                <View style={styles.engagementItem}>
                  <Ionicons name="chatbubble-outline" size={14} color="#666" />
                  <Text style={styles.engagementText}>{item.commentCount}</Text>
                </View>
                {/* Bookmark (Star engagement) icon hidden from view per request — mutation call kept for when it's re-enabled.
                <TouchableOpacity
                  style={styles.engagementItem}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleEngagement({ targetType: "libraryItem", targetId: item._id, kind: "Star" });
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.isStarred ? "bookmark" : "bookmark-outline"}
                    size={14}
                    color={item.isStarred ? "#F2650C" : "#666"}
                  />
                  <Text style={styles.engagementText}>{item.starCount}</Text>
                </TouchableOpacity>
                */}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {isAll ? "No directory items yet." : "No posts in this category yet."}
              </Text>
            </View>
          }
        />
      )}

      {!isAll && (
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/(app)/library/create",
            params: { source: "directory", categoryId: categoryId as string },
          })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  list: { padding: 12, paddingBottom: 80 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 4 },
  desc: { fontSize: 14, color: "#555", lineHeight: 20 },
  scheduledRow: { flexDirection: "row", marginBottom: 8 },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  creatorAvatar: { width: 22, height: 22, borderRadius: 11 },
  creatorAvatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  creatorAvatarInitial: { color: "#F2650C", fontSize: 10, fontWeight: "700" },
  creatorName: { fontSize: 12, color: "#888", fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 16, color: "#888" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34 },
  engagementRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 },
  engagementItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 12, color: "#666", fontWeight: "600" },
});
