import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

type FeedDiscussion = {
  _id: string;
  topic?: string;
  details: string;
  creatorNickName: string;
  creatorProfileImageUrl: string | null;
  categoryName: string | null;
  tags: string[];
  images: string[];
  status: "Open" | "Closed";
  likeCount: number;
  endorseCount: number;
  replyCount: number;
  mustRead: boolean;
  isRead: boolean;
  postDate: number;
  nonChinaVideoLink?: string;
  chinaVideoLink?: string;
};

function DiscussionCard({ discussion }: { discussion: FeedDiscussion }) {
  const router = useRouter();
  const isLong = discussion.details.length > 200;
  const isClosed = discussion.status === "Closed";

  async function handleShare() {
    const link = Linking.createURL(`discussion/${discussion._id}`);
    const message = discussion.topic ? `${discussion.topic}\n\n${discussion.details}` : discussion.details;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message, url: link, title: discussion.topic || "Vouch Discussion" }
          : { message: `${message}\n\n${link}`, title: discussion.topic || "Vouch Discussion" }
      );
    } catch {
      // user dismissed the native share sheet — nothing to do
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/discussion/${discussion._id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.badgeRow}>
        {discussion.mustRead && !discussion.isRead && (
          <View style={styles.mustReadBadge}>
            <Text style={styles.mustReadText}>Must Read</Text>
          </View>
        )}
        <View style={[styles.statusBadge, isClosed ? styles.statusClosed : styles.statusOpen]}>
          <Text style={styles.statusBadgeText}>{isClosed ? "Closed" : "Open"}</Text>
        </View>
        {discussion.categoryName && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{discussion.categoryName}</Text>
          </View>
        )}
      </View>

      {/* Creator */}
      <View style={styles.creatorRow}>
        {discussion.creatorProfileImageUrl ? (
          <Image source={{ uri: discussion.creatorProfileImageUrl }} style={styles.creatorAvatar} />
        ) : (
          <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
            <Text style={styles.creatorAvatarInitial}>
              {discussion.creatorNickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Text style={styles.creator}>{discussion.creatorNickName}</Text>
      </View>
      {discussion.topic ? <Text style={styles.topic}>{discussion.topic}</Text> : null}

      {/* Body */}
      <Text style={styles.body} numberOfLines={isLong ? 4 : undefined}>
        {discussion.details}
      </Text>
      {isLong && <Text style={styles.readMore}>Read more</Text>}

      {/* Image */}
      {discussion.images.length > 0 && (
        <Image
          source={{ uri: discussion.images[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Engagement bar */}
      <View style={styles.engagementRow}>
        <View style={styles.engagementItem}>
          <Ionicons name="thumbs-up-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{discussion.likeCount}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="star-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{discussion.endorseCount}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{discussion.replyCount}</Text>
        </View>
        <TouchableOpacity
          style={styles.shareIcon}
          onPress={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={16} color="#666" />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {new Date(discussion.postDate).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type StatusFilter = "All" | "Open" | "Closed";
type SortMode = "recent" | "active";

export default function DiscussionsFeedScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [categoryId, setCategoryId] = useState<Id<"categories"> | undefined>(undefined);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortMode>("recent");
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  const categories = useQuery(api.categories.list, { scope: "discussion" });
  const discussions = useQuery(api.discussions.list, {
    limit: 50,
    keyword: search.trim() || undefined,
    categoryId,
    status: status === "All" ? undefined : status,
    sort,
  });

  const activeFilterCount = (categoryId ? 1 : 0) + (status !== "All" ? 1 : 0) + (sort !== "recent" ? 1 : 0);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <View style={styles.container}>
      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.search}
            placeholder="Search discussions"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFilterVisible(true)}>
            <Ionicons name="filter" size={18} color="#1C1B18" />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {discussions === undefined ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={discussions}
          keyExtractor={(item) => item._id}
          estimatedItemSize={180}
          renderItem={({ item }) => <DiscussionCard discussion={item as FeedDiscussion} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No discussions yet.</Text>
              <Text style={styles.emptySubtext}>
                Start a discussion or wait for your network to share.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB – Start discussion */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/discussion/create")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Filter modal */}
      <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filter Discussions</Text>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !categoryId && styles.chipActive]}
                onPress={() => setCategoryId(undefined)}
              >
                <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {(categories ?? []).map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[styles.chip, categoryId === cat._id && styles.chipActive]}
                  onPress={() => setCategoryId(cat._id)}
                >
                  <Text style={[styles.chipText, categoryId === cat._id && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.chipRow}>
              {(["All", "Open", "Closed"] as StatusFilter[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, status === s && styles.chipActive]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
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
                style={[styles.chip, sort === "active" && styles.chipActive]}
                onPress={() => setSort("active")}
              >
                <Text style={[styles.chipText, sort === "active" && styles.chipTextActive]}>Most Active</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterVisible(false)}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  loader: { flex: 1, marginTop: 60 },
  list: { padding: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#FAF5EA",
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  mustReadBadge: {
    backgroundColor: "#e74c3c",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mustReadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusOpen: { backgroundColor: "#e6f4ea" },
  statusClosed: { backgroundColor: "#eee" },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#1C1B18" },
  categoryBadge: { backgroundColor: "#F5EFE0", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { fontSize: 11, fontWeight: "600", color: "#1C1B18" },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  creatorAvatar: { width: 26, height: 26, borderRadius: 13 },
  creatorAvatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  creatorAvatarInitial: { color: "#F2650C", fontSize: 12, fontWeight: "700" },
  creator: { fontSize: 13, fontWeight: "700", color: "#1C1B18" },
  topic: { fontSize: 13, color: "#888", marginBottom: 6 },
  body: { fontSize: 15, color: "#333", lineHeight: 22 },
  readMore: { color: "#1C1B18", fontSize: 13, fontWeight: "600", marginTop: 4 },
  image: { width: "100%", height: 200, borderRadius: 10, marginTop: 12 },
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  engagementItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 13, color: "#666" },
  shareIcon: { marginLeft: "auto" },
  dateText: { marginLeft: 12, fontSize: 12, color: "#aaa" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#1C1B18", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1C1B18", marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8, marginTop: 12 },
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
