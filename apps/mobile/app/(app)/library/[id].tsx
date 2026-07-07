import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function LibraryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const item = useQuery(api.library.getItem, { itemId: id as Id<"libraryItems"> });
  const deleteLibraryItem = useMutation(api.library.deleteLibraryItem);

  if (item === undefined || me === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }
  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Item not found.</Text>
      </View>
    );
  }

  const isOwner = me?._id === item.userId;

  function handleDelete() {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteLibraryItem({ itemId: id as Id<"libraryItems"> });
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.type}>{item.type}</Text>
      <Text style={styles.title}>{item.title}</Text>
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
        <Text style={styles.creator}>By {item.creatorNickName}</Text>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      {item.images.map((url: string, i: number) => (
        <Image key={i} source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ))}

      {item.nonChinaVideoLink && (
        <TouchableOpacity onPress={() => Linking.openURL(item.nonChinaVideoLink!)}>
          <Text style={styles.link}>Video: {item.nonChinaVideoLink}</Text>
        </TouchableOpacity>
      )}

      {item.documents.map((doc: { name: string; url: string }, i: number) => (
        <TouchableOpacity key={i} onPress={() => Linking.openURL(doc.url)} style={styles.docRow}>
          <Text style={styles.docText}>📄 {doc.name}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.statsRow}>
        <Text style={styles.statText}>👍 {item.likeCount}</Text>
        <Text style={styles.statText}>⭐ {item.endorseCount}</Text>
        <Text style={styles.statText}>💬 {item.commentCount}</Text>
      </View>

      {isOwner && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 60 },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  type: { fontSize: 12, color: "#888", textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "800", color: "#1C1B18", marginBottom: 4 },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  creatorAvatar: { width: 26, height: 26, borderRadius: 13 },
  creatorAvatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  creatorAvatarInitial: { color: "#C9A227", fontSize: 12, fontWeight: "700" },
  creator: { fontSize: 13, color: "#666" },
  description: { fontSize: 15, color: "#222", lineHeight: 22, marginBottom: 14 },
  image: { width: "100%", height: 220, borderRadius: 10, marginBottom: 12 },
  link: { color: "#C9A227", fontSize: 14, marginBottom: 12 },
  docRow: {
    backgroundColor: "#F5EFE0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  docText: { fontSize: 14, color: "#1C1B18", fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 16, marginVertical: 14 },
  statText: { fontSize: 13, color: "#555" },
  deleteBtn: { alignItems: "center", marginTop: 20, padding: 10 },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },
});
