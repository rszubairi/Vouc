import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../convex/_generated/api";

type FeedPost = {
  _id: string;
  topic?: string;
  details: string;
  creatorNickName: string;
  creatorProfileImageUrl: string | null;
  images: string[];
  likeCount: number;
  endorseCount: number;
  commentCount: number;
  mustRead: boolean;
  isRead: boolean;
  postDate: number;
  nonChinaVideoLink?: string;
  chinaVideoLink?: string;
};

function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter();
  const isLong = post.details.length > 200;

  async function handleShare() {
    const link = Linking.createURL(`post/${post._id}`);
    const message = post.topic ? `${post.topic}\n\n${post.details}` : post.details;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message, url: link, title: post.topic || "Vouch Post" }
          : { message: `${message}\n\n${link}`, title: post.topic || "Vouch Post" }
      );
    } catch {
      // user dismissed the native share sheet — nothing to do
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/post/${post._id}`)}
      activeOpacity={0.85}
    >
      {/* Must-read badge */}
      {post.mustRead && !post.isRead && (
        <View style={styles.mustReadBadge}>
          <Text style={styles.mustReadText}>Must Read</Text>
        </View>
      )}

      {/* Creator */}
      <View style={styles.creatorRow}>
        {post.creatorProfileImageUrl ? (
          <Image source={{ uri: post.creatorProfileImageUrl }} style={styles.creatorAvatar} />
        ) : (
          <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
            <Text style={styles.creatorAvatarInitial}>
              {post.creatorNickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Text style={styles.creator}>{post.creatorNickName}</Text>
      </View>
      {post.topic ? <Text style={styles.topic}>{post.topic}</Text> : null}

      {/* Body */}
      <Text style={styles.body} numberOfLines={isLong ? 4 : undefined}>
        {post.details}
      </Text>
      {isLong && <Text style={styles.readMore}>Read more</Text>}

      {/* Image */}
      {post.images.length > 0 ? (
        <Image
          source={{ uri: post.images[0] }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={32} color="#C9A227" />
        </View>
      )}

      {/* Engagement bar */}
      <View style={styles.engagementRow}>
        <View style={styles.engagementItem}>
          <Ionicons name="thumbs-up-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{post.likeCount}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="star-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{post.endorseCount}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={14} color="#666" />
          <Text style={styles.engagementText}>{post.commentCount}</Text>
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
          {new Date(post.postDate).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const posts = useQuery(api.posts.feed, { limit: 30 });

  return (
    <View style={styles.container}>
      {posts === undefined ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />
      ) : (
        <FlashList
          data={posts}
          keyExtractor={(item) => item._id}
          estimatedItemSize={180}
          renderItem={({ item }) => <PostCard post={item as FeedPost} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet.</Text>
              <Text style={styles.emptySubtext}>
                Create your first post or wait for your network to share.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB – Create post */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(app)/post/create")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  loader: { flex: 1, marginTop: 60 },
  list: { padding: 12 },
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
  mustReadBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e74c3c",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  mustReadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  creatorAvatar: { width: 26, height: 26, borderRadius: 13 },
  creatorAvatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  creatorAvatarInitial: { color: "#C9A227", fontSize: 12, fontWeight: "700" },
  creator: { fontSize: 13, fontWeight: "700", color: "#1C1B18" },
  topic: { fontSize: 13, color: "#888", marginBottom: 6 },
  body: { fontSize: 15, color: "#333", lineHeight: 22 },
  readMore: { color: "#1C1B18", fontSize: 13, fontWeight: "600", marginTop: 4 },
  image: { width: "100%", height: 200, borderRadius: 10, marginTop: 12 },
  imagePlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: "#F5EFE0",
    alignItems: "center",
    justifyContent: "center",
  },
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
});
