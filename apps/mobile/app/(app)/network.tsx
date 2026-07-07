import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "expo-router";

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
  const all = useQuery(api.profiles.listAll, {});
  const approveSponsor = useMutation(api.profiles.approveSponsor);
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={directory}
      keyExtractor={(p) => p._id}
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
          <TextInput
            style={styles.search}
            placeholder="Search by name, city, or country"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
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
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No members found.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
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
  avatarInitial: { color: "#C9A227", fontSize: 18, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: "#1C1B18" },
  subText: { fontSize: 12, color: "#888", marginTop: 2 },
  memberSince: { fontSize: 11, color: "#C9A227", marginTop: 2, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 15, color: "#888" },
});
