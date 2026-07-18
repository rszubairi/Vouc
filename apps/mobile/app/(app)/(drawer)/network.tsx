import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

type SortMode = "recent" | "liked" | "starred";

function formatMemberSince(creationTime: number) {
  return new Date(creationTime).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function NetworkScreen() {
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const pending = useQuery(api.profiles.pendingApprovals, {});
  const [sort, setSort] = useState<SortMode>("recent");
  const all = useQuery(api.profiles.listDirectory, { sort });
  const approveSponsor = useMutation(api.profiles.approveSponsor);
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  const directory = useMemo(() => {
    if (!all) return [];
    const q = search.trim().toLowerCase();
    return all
      .filter((p) => p._id !== me?._id)
      .filter((p) =>
        q
          ? p.nickName?.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q) ||
            p.country?.toLowerCase().includes(q)
          : true
      );
  }, [all, search, me?._id]);

  async function handleApprove(profileId: Id<"profiles">) {
    try {
      setApprovingId(profileId);
      await approveSponsor({ downlineProfileId: profileId });
    } finally {
      setApprovingId(null);
    }
  }

  if (all === undefined || pending === undefined) {
    return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />;
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={directory}
      keyExtractor={(p) => p._id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
      }
      ListHeaderComponent={
        <View>
          {pending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Approvals</Text>
              {pending.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={styles.pendingRow}
                  onPress={() => router.push(`/(app)/network/${p._id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.nickName}</Text>
                    <Text style={styles.subText}>{p.city}, {p.country}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(p._id)}
                    disabled={approvingId === p._id}
                  >
                    {approvingId === p._id ? (
                      <ActivityIndicator size="small" color="#F5EFE0" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Directory</Text>
          {searchVisible && (
            <View style={styles.searchBar}>
              <TextInput
                style={styles.search}
                placeholder="Search by name, city, or country"
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
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push(`/(app)/network/${item._id}`)}
        >
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {item.nickName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{item.nickName}</Text>
            <Text style={styles.subText}>{item.city}, {item.country}</Text>
            <Text style={styles.memberSince}>Member since {formatMemberSince(item._creationTime)}</Text>
          </View>
          <View style={styles.vouchedByCol}>
            <Text style={styles.vouchedByLabel}>Vouched By</Text>
            <Text style={styles.vouchedByValue} numberOfLines={1}>
              {item.sponsorName ?? "—"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No members found.</Text>
        </View>
      }
    />

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
            <TouchableOpacity
              style={[styles.chip, sort === "starred" && styles.chipActive]}
              onPress={() => setSort("starred")}
            >
              <Text style={[styles.chipText, sort === "starred" && styles.chipTextActive]}>Starred</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={() => setSortVisible(false)}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  list: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1C1B18", marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  approveBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  approveBtnText: { color: "#F5EFE0", fontWeight: "700", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#F2650C", fontSize: 18, fontWeight: "700" },
  vouchedByCol: { alignItems: "flex-end", marginLeft: 8, maxWidth: 100 },
  vouchedByLabel: { fontSize: 10, color: "#888", fontWeight: "600", marginBottom: 2, textTransform: "uppercase" },
  vouchedByValue: { fontSize: 13, color: "#1C1B18", fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: "#1C1B18" },
  subText: { fontSize: 12, color: "#888", marginTop: 2 },
  memberSince: { fontSize: 11, color: "#F2650C", marginTop: 2, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 15, color: "#888" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
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
