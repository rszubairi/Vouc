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
  Share,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ImageViewerModal } from "../../../components/ImageViewerModal";
import { WEB_APP_URL } from "../../../constants/links";
import { toExcerpt } from "../../../utils/text";
import { Avatar } from "../../../components/Avatar";

export default function LibraryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const item = useQuery(api.knowledgeHub.getItem, id ? { itemId: id as Id<"knowledgeHubItems"> } : "skip");
  const deleteLibraryItem = useMutation(api.knowledgeHub.deleteItem);
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

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
          await deleteLibraryItem({ itemId: id as Id<"knowledgeHubItems"> });
          router.back();
        },
      },
    ]);
  }

  async function handleShare() {
    const webLink = `${WEB_APP_URL}/share/knowledge-hub/${id}`;
    const excerpt = toExcerpt(item!.description);
    const message = `${item!.title}\n\n${excerpt}\n\n${webLink}`;
    try {
      await Share.share({ message, title: item!.title || "Vouch Knowledge Hub Item" });
    } catch {
      // user dismissed the native share sheet — nothing to do
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.creatorRow}>
        <Avatar
          uri={item.creatorProfileImageUrl}
          name={item.creatorNickName}
          imageStyle={styles.creatorAvatar}
          placeholderStyle={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}
          textStyle={styles.creatorAvatarInitial}
        />
        <Text style={styles.creator}>By {item.creatorNickName}</Text>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      {item.images.map((url: string, i: number) => (
        <TouchableOpacity key={i} onPress={() => setViewerImage(url)}>
          <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.statItem}
          onPress={() =>
            toggleEngagement({ targetType: "knowledgeHubItem", targetId: id as string, kind: "Like" })
          }
        >
          <Ionicons
            name={item.isLiked ? "star" : "star-outline"}
            size={16}
            color={item.isLiked ? "#F2650C" : "#666"}
          />
          <Text style={[styles.statText, item.isLiked && styles.statTextActive]}>{item.likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.commentCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="ribbon-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.endorseCount}</Text>
        </View>
        {/* Bookmark (Star engagement) icon hidden from view per request — mutation call kept for when it's re-enabled.
        <TouchableOpacity
          style={styles.statItem}
          onPress={() =>
            toggleEngagement({ targetType: "knowledgeHubItem", targetId: id as string, kind: "Star" })
          }
        >
          <Ionicons
            name={item.isStarred ? "bookmark" : "bookmark-outline"}
            size={16}
            color={item.isStarred ? "#F2650C" : "#666"}
          />
          <Text style={[styles.statText, item.isStarred && styles.statTextActive]}>{item.starCount}</Text>
        </TouchableOpacity>
        */}
        <TouchableOpacity style={styles.statItem} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color="#666" />
          <Text style={styles.statText}>Share</Text>
        </TouchableOpacity>
      </View>

      {isOwner && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </TouchableOpacity>
      )}
      <ImageViewerModal uri={viewerImage} visible={viewerImage !== null} onClose={() => setViewerImage(null)} />
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
  creatorAvatarInitial: { color: "#F2650C", fontSize: 12, fontWeight: "700" },
  creator: { fontSize: 13, color: "#666" },
  description: { fontSize: 15, color: "#222", lineHeight: 22, marginBottom: 14 },
  image: { width: "100%", height: 220, borderRadius: 10, marginBottom: 12 },
  link: { color: "#F2650C", fontSize: 14, marginBottom: 12 },
  docRow: {
    backgroundColor: "#F5EFE0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  docText: { fontSize: 14, color: "#1C1B18", fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 16, marginVertical: 14 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 13, color: "#555" },
  statTextActive: { color: "#F2650C", fontWeight: "700" },
  deleteBtn: { alignItems: "center", marginTop: 20, padding: 10 },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },
});
