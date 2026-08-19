import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useLayoutEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { WEB_APP_URL } from "../../../constants/links";
import { toExcerpt } from "../../../utils/text";
import { ScheduledBadge } from "../../../components/ScheduledBadge";
import { Avatar } from "../../../components/Avatar";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

type SortMode = "recent" | "liked" | "starred";

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
  const [sort, setSort] = useState<SortMode>("recent");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const items = useQuery(
    api.library.listItems,
    categoryId
      ? {
          categoryId: isAll ? undefined : (categoryId as Id<"categories">),
          sortBy: sort,
          onlyStarred: onlyStarred || undefined,
        }
      : "skip"
  );
  const activeFilterCount = (sort !== "recent" ? 1 : 0) + (onlyStarred ? 1 : 0);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

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

  async function handleShare(itemId: string, title: string, description: string) {
    const appLink = Linking.createURL(`directory/item/${itemId}`);
    const webLink = `${WEB_APP_URL}/share/directory/${itemId}`;
    const excerpt = toExcerpt(description);
    const message = `${title}\n\n${excerpt}`;
    const fullMessage = `${message}\n\n${webLink}\n\nAlready have Vouch? ${appLink}`;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message: fullMessage, title: title || "Vouch Directory Item" }
          : { message: fullMessage, title: title || "Vouch Directory Item" }
      );
    } catch {
      // user dismissed the native share sheet — nothing to do
    }
  }

  return (
    <View style={styles.container}>
      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.search}
            placeholder="Search this category"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setSortVisible(true)}>
            <Ionicons name="filter" size={18} color="#1C1B18" />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {items === undefined ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={filteredItems}
          keyExtractor={(item) => item._id}
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
                    name={item.isLiked ? "heart" : "heart-outline"}
                    size={14}
                    color={item.isLiked ? "#F2650C" : "#666"}
                  />
                  <Text style={styles.engagementText}>{item.likeCount}</Text>
                </TouchableOpacity>
                <View style={styles.engagementItem}>
                  <Ionicons name="chatbubble-outline" size={14} color="#666" />
                  <Text style={styles.engagementText}>{item.commentCount}</Text>
                </View>
                <TouchableOpacity
                  style={styles.starIcon}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleEngagement({ targetType: "libraryItem", targetId: item._id, kind: "Star" });
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.isStarred ? "star" : "star-outline"}
                    size={14}
                    color={item.isStarred ? "#F2650C" : "#666"}
                  />
                  <Text style={styles.engagementText}>{item.starCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareIcon}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleShare(item._id, item.title, item.description);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="share-outline" size={16} color="#666" />
                </TouchableOpacity>
                <Text style={styles.dateText}>
                  {new Date(item.postDate).toLocaleDateString()}
                </Text>
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

      <Modal visible={sortVisible} animationType="slide" transparent onRequestClose={() => setSortVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortVisible(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Sort Directory</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSortVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Sort by</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, sort === "recent" && styles.chipActive]}
                onPress={() => setSort("recent")}
              >
                <Text style={[styles.chipText, sort === "recent" && styles.chipTextActive]}>Most Recent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sort === "liked" && styles.chipActive]}
                onPress={() => setSort("liked")}
              >
                <Text style={[styles.chipText, sort === "liked" && styles.chipTextActive]}>Most Liked</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Starred</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, onlyStarred && styles.chipActive]}
                onPress={() => setOnlyStarred((v) => !v)}
              >
                <Text style={[styles.chipText, onlyStarred && styles.chipTextActive]}>
                  {onlyStarred ? "Showing starred only" : "Show starred only"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setSortVisible(false)}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  starIcon: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  shareIcon: { marginLeft: "auto" },
  dateText: { marginLeft: 12, fontSize: 12, color: "#aaa" },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F2650C",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1C1B18" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FAF5EA",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipActive: { backgroundColor: "#1C1B18", borderColor: "#1C1B18" },
  chipText: { fontSize: 13, color: "#1C1B18", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  applyBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
