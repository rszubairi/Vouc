import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Id } from "../../../../convex/_generated/dataModel";

export default function LibraryScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const items = useQuery(api.library.listItems, {
    categoryId: categoryId as Id<"categories"> | undefined,
  });

  return (
    <View style={styles.container}>
      {items === undefined ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item._id}
          estimatedItemSize={100}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/library/${item._id}`)}
            >
              <View style={styles.typeTag}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  list: { padding: 12, paddingBottom: 80 },
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
  creatorAvatarInitial: { color: "#C9A227", fontSize: 10, fontWeight: "700" },
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
});
