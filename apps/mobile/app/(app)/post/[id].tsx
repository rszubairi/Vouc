import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Share,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";

function ImageCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const carouselWidth = width - 32; // matches screen horizontal padding
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return null;
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setActiveIndex(index);
  }

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        data={images}
        keyExtractor={(url, i) => `${url}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.image, { width: carouselWidth }]}
            contentFit="cover"
            transition={200}
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const post = useQuery(api.posts.getPost, id ? { postId: id as Id<"posts"> } : "skip");
  const engage = useMutation(api.posts.engage);
  const deletePost = useMutation(api.posts.deletePost);
  const markRead = useMutation(api.posts.markRead);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (post === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }
  if (!post) {
    return (
      <View style={styles.center}>
        <Text>Post not found.</Text>
      </View>
    );
  }

  async function handleLike() {
    await engage({ postId: id as Id<"posts">, type: "Like" });
  }

  async function handleEndorse() {
    await engage({ postId: id as Id<"posts">, type: "Endorse" });
  }

  async function handleComment() {
    if (!comment.trim()) return;
    try {
      setSubmitting(true);
      await engage({ postId: id as Id<"posts">, type: "Comment", comment });
      setComment("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const link = Linking.createURL(`post/${id}`);
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

  async function handleDelete() {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePost({ postId: id as Id<"posts"> });
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Creator */}
      <View style={styles.creatorRow}>
        {post.creator?.profileImageUrl ? (
          <Image source={{ uri: post.creator.profileImageUrl }} style={styles.avatarCircle} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {post.creator?.nickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.creatorName}>{post.creator?.nickName}</Text>
          <Text style={styles.dateText}>
            {new Date(post.postDate).toLocaleString()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#1C1B18" />
          </TouchableOpacity>
          {post.isOwner && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {post.topic ? <Text style={styles.topic}>{post.topic}</Text> : null}
      <Text style={styles.body}>{post.details}</Text>

      {/* Images */}
      <ImageCarousel images={post.images} />

      {/* Video links */}
      {post.nonChinaVideoLink && (
        <View style={styles.videoLink}>
          <Text style={styles.videoLabel}>Video: </Text>
          <Text style={styles.videoUrl} numberOfLines={1}>{post.nonChinaVideoLink}</Text>
        </View>
      )}

      {/* Engagement */}
      <View style={styles.engagementBar}>
        <TouchableOpacity
          style={[styles.engBtn, post.isLiked && styles.engBtnActive]}
          onPress={handleLike}
        >
          <Ionicons name={post.isLiked ? "thumbs-up" : "thumbs-up-outline"} size={16} color="#333" />
          <Text style={styles.engBtnText}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.engBtn, post.isEndorsed && styles.engBtnActive]}
          onPress={handleEndorse}
        >
          <Ionicons name={post.isEndorsed ? "star" : "star-outline"} size={16} color="#333" />
          <Text style={styles.engBtnText}>{post.endorseCount}</Text>
        </TouchableOpacity>
        <View style={styles.engBtn}>
          <Ionicons name="chatbubble-outline" size={16} color="#333" />
          <Text style={styles.engBtnText}>{post.commentCount}</Text>
        </View>
      </View>

      {/* Comments */}
      {post.comments?.length > 0 && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {post.comments.map((c: any) => (
            <View key={c._id} style={styles.commentItem}>
              <Text style={styles.commenterName}>{c.commenterNickName}</Text>
              <Text style={styles.commentText}>{c.comment}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Add comment */}
      <View style={styles.commentInput}>
        <TextInput
          style={styles.commentBox}
          placeholder="Write a comment..."
          placeholderTextColor="#999"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.commentSend, submitting && styles.btnDisabled]}
          onPress={handleComment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.commentSendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  creatorName: { fontSize: 15, fontWeight: "700", color: "#1C1B18" },
  dateText: { fontSize: 12, color: "#999" },
  headerActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f4f4f8",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "#fdecea",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 13 },
  topic: { fontSize: 14, color: "#888", marginBottom: 8 },
  body: { fontSize: 16, color: "#222", lineHeight: 24, marginBottom: 14 },
  image: { height: 220, borderRadius: 10 },
  carouselContainer: { marginBottom: 12 },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ddd",
  },
  dotActive: { backgroundColor: "#C9A227", width: 8, height: 8, borderRadius: 4 },
  videoLink: { flexDirection: "row", marginBottom: 12 },
  videoLabel: { fontSize: 14, fontWeight: "600", color: "#555" },
  videoUrl: { fontSize: 14, color: "#C9A227", flex: 1 },
  engagementBar: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 16,
  },
  engBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#f4f4f8",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  engBtnActive: { backgroundColor: "#F5EFE0" },
  engBtnText: { fontSize: 14, color: "#333", fontWeight: "600" },
  commentsSection: { marginBottom: 16 },
  commentsTitle: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 10 },
  commentItem: { marginBottom: 10, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 8 },
  commenterName: { fontSize: 13, fontWeight: "700", color: "#1C1B18", marginBottom: 2 },
  commentText: { fontSize: 14, color: "#444" },
  commentInput: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  commentBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 120,
    color: "#222",
    backgroundColor: "#f9f9f9",
  },
  commentSend: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.6 },
  commentSendText: { color: "#fff", fontWeight: "700" },
});
