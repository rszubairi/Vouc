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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";
import { WEB_APP_URL } from "../../../constants/links";

const DISCUSSION_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Business Opportunities": "briefcase-outline",
  "Jobs & Career": "person-outline",
  "Events": "calendar-outline",
  "Buy • Sell • Give Away": "pricetag-outline",
  "Recommendations & Referrals": "thumbs-up-outline",
  "Knowledge & Advice": "bulb-outline",
  "Promotions & Member Offers": "gift-outline",
  "Community Lounge": "people-outline",
};

type FeedDiscussion = {
  _id: string;
  topic?: string;
  details: string;
  creatorNickName: string;
  creatorProfileImageUrl: string | null;
  categoryNames: string[];
  tags: string[];
  images: string[];
  status: "Open" | "Closed";
  likeCount: number;
  endorseCount: number;
  replyCount: number;
  mustRead: boolean;
  isRead: boolean;
  isLiked: boolean;
  isEndorsed: boolean;
  starCount: number;
  isStarred: boolean;
  postDate: number;
  nonChinaVideoLink?: string;
  chinaVideoLink?: string;
};

function DiscussionCard({ discussion }: { discussion: FeedDiscussion }) {
  const router = useRouter();
  const isLong = discussion.details.length > 200;
  const isClosed = discussion.status === "Closed";
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);
  const [starOverride, setStarOverride] = useState<boolean | null>(null);
  const isStarred = starOverride ?? discussion.isStarred;

  async function handleStar() {
    setStarOverride(!discussion.isStarred);
    try {
      await toggleEngagement({ targetType: "discussion", targetId: discussion._id, kind: "Star" });
    } finally {
      setStarOverride(null);
    }
  }

  async function handleShare() {
    const appLink = Linking.createURL(`discussion/${discussion._id}`);
    const webLink = `${WEB_APP_URL}/app?discussion=${discussion._id}`;
    const message = discussion.topic ? `${discussion.topic}\n\n${discussion.details}` : discussion.details;
    const fullMessage = `${message}\n\n${appLink}\n\nDon't have Vouch yet? ${webLink}`;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message: fullMessage, title: discussion.topic || "Vouch Discussion" }
          : { message: fullMessage, title: discussion.topic || "Vouch Discussion" }
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
        {discussion.categoryNames.map((name) => (
          <View key={name} style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{name}</Text>
          </View>
        ))}
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
          <Ionicons
            name={discussion.isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={14}
            color={discussion.isLiked ? "#F2650C" : "#666"}
          />
          <Text style={styles.engagementText}>{discussion.likeCount}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons
            name={discussion.isEndorsed ? "ribbon" : "ribbon-outline"}
            size={14}
            color={discussion.isEndorsed ? "#3B82C4" : "#666"}
          />
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
            handleStar();
          }}
          hitSlop={8}
        >
          <Ionicons
            name={isStarred ? "star" : "star-outline"}
            size={16}
            color={isStarred ? "#F2650C" : "#666"}
          />
        </TouchableOpacity>
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
type SortMode = "recent" | "active" | "liked";

export default function DiscussionsFeedScreen() {
  const router = useRouter();
  const { categoryId: paramCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(
    (paramCategoryId as Id<"categories"> | undefined) ?? null
  );
  // "All Discussions" bypasses category browsing entirely — without it,
  // discussions posted with no category (or a category the reader hasn't
  // tapped into) are unreachable, since the feed otherwise only ever queries
  // by a single selected category.
  const [viewAll, setViewAll] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortMode>("recent");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  const categories = useQuery(api.categories.list, { scope: "discussion" });
  const discussions = useQuery(
    api.discussions.list,
    selectedCategoryId || viewAll
      ? {
          limit: 50,
          keyword: search.trim() || undefined,
          categoryIds: selectedCategoryId ? [selectedCategoryId] : undefined,
          status: status === "All" ? undefined : status,
          onlyStarred: onlyStarred || undefined,
          sort,
        }
      : "skip"
  );

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categories]);

  const selectedCategory = useMemo(
    () => sortedCategories.find((c) => c._id === selectedCategoryId) ?? null,
    [sortedCategories, selectedCategoryId]
  );

  const activeFilterCount = (status !== "All" ? 1 : 0) + (sort !== "recent" ? 1 : 0) + (onlyStarred ? 1 : 0);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  if (!selectedCategoryId && !viewAll) {
    return (
      <View style={styles.container}>
        {categories === undefined ? (
          <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />
        ) : (
          <FlashList
            data={sortedCategories}
            keyExtractor={(c) => c._id}
            estimatedItemSize={64}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <TouchableOpacity style={styles.categoryCard} onPress={() => setViewAll(true)}>
                <View style={styles.categoryIconWrap}>
                  <Ionicons name="albums-outline" size={22} color="#F2650C" />
                </View>
                <Text style={styles.categoryName}>All Discussions</Text>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            }
            renderItem={({ item: category }) => (
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => setSelectedCategoryId(category._id)}
              >
                <View style={styles.categoryIconWrap}>
                  <Ionicons
                    name={DISCUSSION_CATEGORY_ICONS[category.name] ?? "chatbubbles-outline"}
                    size={22}
                    color="#F2650C"
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No categories yet.</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => {
          setSelectedCategoryId(null);
          setViewAll(false);
        }}
      >
        <Ionicons name="chevron-back" size={18} color="#F2650C" />
        <Text style={styles.backText}>{selectedCategory?.name ?? (viewAll ? "All Discussions" : "Categories")}</Text>
      </TouchableOpacity>

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
        onPress={() =>
          router.push({
            pathname: "/(app)/discussion/create",
            params: selectedCategoryId ? { categoryId: selectedCategoryId } : undefined,
          })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Filter modal */}
      <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filter Discussions</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFilterVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
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

            <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterVisible(false)}>
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 2,
  },
  backText: { color: "#F2650C", fontSize: 15, fontWeight: "700" },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5EFE0",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1C1B18" },
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
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1C1B18" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
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
