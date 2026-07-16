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
  Linking as RNLinking,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { WEB_APP_URL } from "../../../constants/links";

type PendingAttachment = {
  storageId: Id<"_storage">;
  kind: "image" | "file";
  fileName?: string;
};

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

function FileAttachments({ files }: { files: Array<{ url: string; name?: string }> }) {
  if (files.length === 0) return null;
  return (
    <View style={styles.filesSection}>
      {files.map((f, i) => (
        <TouchableOpacity key={i} style={styles.fileRow} onPress={() => RNLinking.openURL(f.url)}>
          <Ionicons name="document-outline" size={16} color="#1C1B18" />
          <Text style={styles.fileName} numberOfLines={1}>{f.name ?? "Attachment"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const discussion = useQuery(api.discussions.getDiscussion, id ? { discussionId: id as Id<"discussions"> } : "skip");
  const engage = useMutation(api.discussions.engage);
  const deleteDiscussion = useMutation(api.discussions.deleteDiscussion);
  const markRead = useMutation(api.discussions.markRead);
  const updateStatus = useMutation(api.discussions.updateStatus);
  const addReply = useMutation(api.discussions.addReply);
  const togglePin = useMutation(api.discussions.togglePin);
  const toggleFollow = useMutation(api.discussions.toggleFollow);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const scrollRef = useRef<ScrollView>(null);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  if (discussion === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }
  if (!discussion) {
    return (
      <View style={styles.center}>
        <Text>Discussion not found.</Text>
      </View>
    );
  }

  async function handleLike() {
    await engage({ discussionId: id as Id<"discussions">, type: "Like" });
  }

  async function handleEndorse() {
    await engage({ discussionId: id as Id<"discussions">, type: "Endorse" });
  }

  async function handleTogglePin() {
    await togglePin({ discussionId: id as Id<"discussions"> });
  }

  async function handleToggleFollow() {
    await toggleFollow({ discussionId: id as Id<"discussions"> });
  }

  async function uploadAsset(uri: string, mimeType: string | undefined, fileName: string | undefined, kind: "image" | "file") {
    const uploadUrl = await generateUploadUrl({});
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mimeType ?? "application/octet-stream" },
    });
    const { storageId } = JSON.parse(uploadResult.body);
    setReplyAttachments((prev) => [...prev, { storageId, kind, fileName }]);
  }

  async function handlePickReplyImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      await uploadAsset(asset.uri, asset.mimeType, asset.fileName ?? undefined, "image");
    } finally {
      setUploading(false);
    }
  }

  async function handlePickReplyFile() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      await uploadAsset(asset.uri, asset.mimeType, asset.name, "file");
    } finally {
      setUploading(false);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    try {
      setSubmitting(true);
      await addReply({
        discussionId: id as Id<"discussions">,
        body: comment,
        attachments: replyAttachments.length ? replyAttachments : undefined,
      });
      setComment("");
      setReplyAttachments([]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to add reply.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    const appLink = Linking.createURL(`discussion/${id}`);
    const webLink = `${WEB_APP_URL}/app?discussion=${id}`;
    const message = discussion?.topic ? `${discussion.topic}\n\n${discussion.details}` : discussion?.details ?? "";
    const fullMessage = `${message}\n\n${appLink}\n\nDon't have Vouch yet? ${webLink}`;
    try {
      await Share.share({ message: fullMessage, title: discussion?.topic || "Vouch Discussion" });
    } catch {
      // user dismissed the native share sheet — nothing to do
    }
  }

  async function handleDelete() {
    Alert.alert("Delete Discussion", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDiscussion({ discussionId: id as Id<"discussions"> });
          router.back();
        },
      },
    ]);
  }

  async function handleClose() {
    Alert.alert("Close Discussion", "No new replies will be allowed once closed. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close",
        style: "destructive",
        onPress: async () => {
          await updateStatus({ discussionId: id as Id<"discussions">, status: "Closed" });
        },
      },
    ]);
  }

  const isClosed = discussion.status === "Closed";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Creator */}
      <View style={styles.creatorRow}>
        {discussion.creator?.profileImageUrl ? (
          <Image source={{ uri: discussion.creator.profileImageUrl }} style={styles.avatarCircle} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {discussion.creator?.nickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.creatorName}>{discussion.creator?.nickName}</Text>
          <Text style={styles.dateText}>
            {new Date(discussion.postDate).toLocaleString()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, discussion.isFollowing && styles.iconBtnActive]}
            onPress={handleToggleFollow}
          >
            <Ionicons
              name={discussion.isFollowing ? "notifications" : "notifications-outline"}
              size={18}
              color={discussion.isFollowing ? "#F2650C" : "#1C1B18"}
            />
          </TouchableOpacity>
          {discussion.isAdmin && (
            <TouchableOpacity
              style={[styles.iconBtn, discussion.isPinned && styles.iconBtnActive]}
              onPress={handleTogglePin}
            >
              <Ionicons
                name={discussion.isPinned ? "pin" : "pin-outline"}
                size={18}
                color={discussion.isPinned ? "#F2650C" : "#1C1B18"}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#1C1B18" />
          </TouchableOpacity>
          {discussion.isOwner && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statusRow}>
        {discussion.isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={11} color="#F2650C" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}
        <View style={[styles.statusBadge, isClosed ? styles.statusClosed : styles.statusOpen]}>
          <Text style={styles.statusText}>{isClosed ? "Closed" : "Open"}</Text>
        </View>
        {discussion.categoryName && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{discussion.categoryName}</Text>
          </View>
        )}
      </View>

      {discussion.topic ? <Text style={styles.topic}>{discussion.topic}</Text> : null}
      <Text style={styles.body}>{discussion.details}</Text>

      {discussion.tags?.length > 0 && (
        <View style={styles.tagRow}>
          {discussion.tags.map((t: string) => (
            <View key={t} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Images */}
      <ImageCarousel images={discussion.images} />
      <FileAttachments files={discussion.attachments.filter((a: any) => a.kind === "file")} />

      {/* Video links */}
      {discussion.nonChinaVideoLink && (
        <View style={styles.videoLink}>
          <Text style={styles.videoLabel}>Video: </Text>
          <Text style={styles.videoUrl} numberOfLines={1}>{discussion.nonChinaVideoLink}</Text>
        </View>
      )}

      {/* Engagement */}
      <View style={styles.engagementBar}>
        <TouchableOpacity
          style={[styles.engBtn, discussion.isLiked && styles.engBtnActive]}
          onPress={handleLike}
        >
          <Ionicons
            name={discussion.isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={16}
            color={discussion.isLiked ? "#F2650C" : "#333"}
          />
          <Text style={[styles.engBtnText, discussion.isLiked && styles.engBtnTextActive]}>
            {discussion.likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.engBtn, discussion.isEndorsed && styles.engBtnActive]}
          onPress={handleEndorse}
        >
          <Ionicons
            name={discussion.isEndorsed ? "star" : "star-outline"}
            size={16}
            color={discussion.isEndorsed ? "#F2650C" : "#333"}
          />
          <Text style={[styles.engBtnText, discussion.isEndorsed && styles.engBtnTextActive]}>
            {discussion.endorseCount}
          </Text>
        </TouchableOpacity>
        <View style={styles.engBtn}>
          <Ionicons name="chatbubble-outline" size={16} color="#333" />
          <Text style={styles.engBtnText}>{discussion.replies.length}</Text>
        </View>
      </View>

      {discussion.isOwner && !isClosed && (
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Text style={styles.closeBtnText}>Close Discussion</Text>
        </TouchableOpacity>
      )}

      {/* Replies */}
      {discussion.replies?.length > 0 && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Replies</Text>
          {discussion.replies.map((c: any) => (
            <View key={c._id} style={styles.commentItem}>
              <Text style={styles.commenterName}>{c.replierNickName}</Text>
              <Text style={styles.commentText}>{c.body}</Text>
              {c.attachments?.length > 0 && (
                <View style={styles.replyAttachments}>
                  {c.attachments.map((a: any, i: number) =>
                    a.kind === "image" ? (
                      <Image key={i} source={{ uri: a.url }} style={styles.replyImage} contentFit="cover" />
                    ) : (
                      <TouchableOpacity key={i} style={styles.fileRow} onPress={() => RNLinking.openURL(a.url)}>
                        <Ionicons name="document-outline" size={14} color="#1C1B18" />
                        <Text style={styles.fileName} numberOfLines={1}>{a.name ?? "Attachment"}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Add reply */}
      {isClosed ? (
        <View style={styles.closedNotice}>
          <Text style={styles.closedNoticeText}>This discussion is closed to new replies.</Text>
        </View>
      ) : (
        <>
          <View style={styles.commentInput}>
            <TextInput
              style={styles.commentBox}
              placeholder="Write a reply..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
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
          <View style={styles.replyAttachRow}>
            <TouchableOpacity style={styles.replyAttachBtn} onPress={handlePickReplyImage} disabled={uploading}>
              <Ionicons name="image-outline" size={16} color="#1C1B18" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.replyAttachBtn} onPress={handlePickReplyFile} disabled={uploading}>
              <Ionicons name="document-attach-outline" size={16} color="#1C1B18" />
            </TouchableOpacity>
            {uploading && <ActivityIndicator size="small" color="#1C1B18" />}
            {replyAttachments.length > 0 && (
              <Text style={styles.replyAttachCount}>{replyAttachments.length} attached</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
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
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "#F5EFE0" },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5EFE0",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pinnedText: { color: "#F2650C", fontSize: 12, fontWeight: "700" },
  deleteBtn: {
    backgroundColor: "#fdecea",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 13 },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusOpen: { backgroundColor: "#e6f4ea" },
  statusClosed: { backgroundColor: "#eee" },
  statusText: { fontSize: 12, fontWeight: "700", color: "#1C1B18" },
  categoryBadge: { backgroundColor: "#F5EFE0", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { fontSize: 12, fontWeight: "600", color: "#1C1B18" },
  topic: { fontSize: 14, color: "#888", marginBottom: 8 },
  body: { fontSize: 16, color: "#222", lineHeight: 24, marginBottom: 14 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tagChip: { backgroundColor: "#FAF5EA", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagChipText: { fontSize: 12, color: "#1C1B18", fontWeight: "600" },
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
  dotActive: { backgroundColor: "#F2650C", width: 8, height: 8, borderRadius: 4 },
  filesSection: { marginBottom: 12, gap: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FAF5EA", borderRadius: 8, padding: 10 },
  fileName: { fontSize: 13, color: "#1C1B18", flex: 1 },
  videoLink: { flexDirection: "row", marginBottom: 12 },
  videoLabel: { fontSize: 14, fontWeight: "600", color: "#555" },
  videoUrl: { fontSize: 14, color: "#F2650C", flex: 1 },
  engagementBar: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 16,
  },
  engBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FAF5EA",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  engBtnActive: { backgroundColor: "#F5EFE0" },
  engBtnText: { fontSize: 14, color: "#333", fontWeight: "600" },
  engBtnTextActive: { color: "#F2650C" },
  closeBtn: {
    borderWidth: 1,
    borderColor: "#c0392b",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  closeBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },
  commentsSection: { marginBottom: 16 },
  commentsTitle: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 10 },
  commentItem: { marginBottom: 10, padding: 10, backgroundColor: "#FAF5EA", borderRadius: 8 },
  commenterName: { fontSize: 13, fontWeight: "700", color: "#1C1B18", marginBottom: 2 },
  commentText: { fontSize: 14, color: "#444" },
  replyAttachments: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  replyImage: { width: 72, height: 72, borderRadius: 8 },
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
    backgroundColor: "#FAF5EA",
  },
  commentSend: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.6 },
  commentSendText: { color: "#fff", fontWeight: "700" },
  replyAttachRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  replyAttachBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  replyAttachCount: { fontSize: 12, color: "#888" },
  closedNotice: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 10 },
  closedNoticeText: { fontSize: 13, color: "#888", fontWeight: "600" },
});
