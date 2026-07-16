import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Articles & Guides": "school-outline",
  "Training Courses": "easel-outline",
  "Seminars & Webinars": "mic-outline",
  "Templates & Downloads": "document-text-outline",
  "Tools & Resources": "construct-outline",
};

type SortMode = "recent" | "liked" | "starred";

export default function LibraryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { categoryId: paramCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"categories"> | null>(
    (paramCategoryId as Id<"categories"> | undefined) ?? null
  );
  const [sort, setSort] = useState<SortMode>("recent");
  const [sortVisible, setSortVisible] = useState(false);
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);

  // This screen stays mounted in the background as a Drawer tab, so a
  // subsequent navigation here (e.g. from Directory) only changes the route
  // params — it doesn't remount the component, so the useState initializer
  // above never re-runs. Without this, re-navigating here with a new
  // categoryId leaves the stale selectedCategoryId in place and the user
  // sees whatever category was previously selected (or the top-level grid).
  useEffect(() => {
    if (paramCategoryId) {
      setSelectedCategoryId(paramCategoryId as Id<"categories">);
    }
  }, [paramCategoryId]);

  const categories = useQuery(api.categories.list, { scope: "knowledgeHub" });
  const items = useQuery(
    api.library.listItems,
    selectedCategoryId ? { categoryId: selectedCategoryId, sortBy: sort } : "skip"
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categories]);

  // The selected category may not belong to the Knowledge Hub's own
  // (scope: "knowledgeHub") category set — e.g. it can be a Directory
  // category (scope: "library") passed in via the categoryId param. Fall
  // back to fetching it directly by id so the back-label/header still show
  // the right name instead of a generic placeholder.
  const fallbackCategory = useQuery(
    api.categories.get,
    selectedCategoryId && !sortedCategories.some((c) => c._id === selectedCategoryId)
      ? { id: selectedCategoryId }
      : "skip"
  );

  const selectedCategory = useMemo(
    () => sortedCategories.find((c) => c._id === selectedCategoryId) ?? fallbackCategory ?? null,
    [sortedCategories, selectedCategoryId, fallbackCategory]
  );

  // Reflect the actual context in the header instead of always showing the
  // static "Knowledge Hub" title — important when this screen is reached
  // via Directory with a category that isn't part of the Knowledge Hub set.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: selectedCategory ? selectedCategory.name : "Knowledge Hub",
    });
  }, [navigation, selectedCategory]);

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

  if (!selectedCategoryId) {
    return (
      <View style={styles.container}>
        {categories === undefined ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />
        ) : (
          <FlashList
            data={sortedCategories}
            keyExtractor={(c) => c._id}
            estimatedItemSize={64}
            contentContainerStyle={styles.list}
            renderItem={({ item: category }) => (
              <TouchableOpacity
                style={styles.categoryCard}
                onPress={() => setSelectedCategoryId(category._id)}
              >
                <View style={styles.categoryIconWrap}>
                  <Ionicons
                    name={CATEGORY_ICONS[category.name] ?? "folder-outline"}
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
      <TouchableOpacity style={styles.backRow} onPress={() => setSelectedCategoryId(null)}>
        <Ionicons name="chevron-back" size={18} color="#F2650C" />
        <Text style={styles.backText}>{selectedCategory?.name ?? "Categories"}</Text>
      </TouchableOpacity>

      {searchVisible && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.search}
            placeholder="Search library items"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setSortVisible(true)}>
            <Ionicons name="filter" size={18} color="#1C1B18" />
            {sort !== "recent" && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>1</Text>
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
          estimatedItemSize={100}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/library/${item._id}`)}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.creatorRow}>
                {item.creatorProfileImageUrl ? (
                  <Image source={{ uri: item.creatorProfileImageUrl }} style={styles.creatorAvatar} />
                ) : (
                  <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                    <Text style={styles.creatorAvatarInitial}>
                      {item.creatorNickName?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
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
                    name={item.isLiked ? "thumbs-up" : "thumbs-up-outline"}
                    size={14}
                    color={item.isLiked ? "#F2650C" : "#666"}
                  />
                  <Text style={styles.engagementText}>{item.likeCount}</Text>
                </TouchableOpacity>
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
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No library items yet.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/library/create")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={sortVisible} animationType="slide" transparent onRequestClose={() => setSortVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Sort Library</Text>

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
              <TouchableOpacity
                style={[styles.chip, sort === "starred" && styles.chipActive]}
                onPress={() => setSort("starred")}
              >
                <Text style={[styles.chipText, sort === "starred" && styles.chipTextActive]}>Star</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setSortVisible(false)}>
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
  list: { padding: 12, paddingBottom: 80 },
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
  typeTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F5EFE0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  typeText: { fontSize: 11, color: "#1C1B18", fontWeight: "700", textTransform: "uppercase" },
  title: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 4 },
  desc: { fontSize: 14, color: "#555", lineHeight: 20 },
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
  engagementRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 },
  engagementItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 12, color: "#666", fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1C1B18", marginBottom: 16 },
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
