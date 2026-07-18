import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

type PendingAttachment = {
  storageId: Id<"_storage">;
  kind: "image" | "file";
  fileName?: string;
};

export default function DirectoryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const item = useQuery(api.library.getItem, id ? { itemId: id as Id<"libraryItems"> } : "skip");
  const comments = useQuery(api.library.listComments, id ? { itemId: id as Id<"libraryItems"> } : "skip");
  const deleteLibraryItem = useMutation(api.library.deleteLibraryItem);
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);
  const addComment = useMutation(api.library.addComment);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  async function uploadAsset(uri: string, mimeType: string | undefined, fileName: string | undefined, kind: "image" | "file") {
    const uploadUrl = await generateUploadUrl({});
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mimeType ?? "application/octet-stream" },
    });
    const { storageId } = JSON.parse(uploadResult.body);
    setAttachments((prev) => [...prev, { storageId, kind, fileName }]);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to attach photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets?.length) return;
    try {
      setUploading(true);
      for (const asset of result.assets) {
        await uploadAsset(asset.uri, asset.mimeType, asset.fileName ?? undefined, "image");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (result.canceled || !result.assets?.length) return;
    try {
      setUploading(true);
      for (const asset of result.assets) {
        await uploadAsset(asset.uri, asset.mimeType, asset.name, "file");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    try {
      setSubmitting(true);
      await addComment({
        itemId: id as Id<"libraryItems">,
        comment: commentText.trim(),
        attachments: attachments.length ? attachments : undefined,
      });
      setCommentText("");
      setAttachments([]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <TouchableOpacity
          style={styles.statItem}
          onPress={() =>
            toggleEngagement({ targetType: "libraryItem", targetId: id as string, kind: "Like" })
          }
        >
          <Ionicons
            name={item.isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={18}
            color={item.isLiked ? "#F2650C" : "#666"}
          />
          <Text style={[styles.statText, item.isLiked && styles.statTextActive]}>{item.likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={() => setShowComments((v) => !v)}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.statText}>{item.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statItem}
          onPress={() =>
            toggleEngagement({ targetType: "libraryItem", targetId: id as string, kind: "Star" })
          }
        >
          <Ionicons
            name={item.isStarred ? "star" : "star-outline"}
            size={18}
            color={item.isStarred ? "#F2650C" : "#666"}
          />
          <Text style={[styles.statText, item.isStarred && styles.statTextActive]}>{item.starCount}</Text>
        </TouchableOpacity>
      </View>

      {isOwner && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Item</Text>
        </TouchableOpacity>
      )}

      {showComments && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>

          {comments === undefined ? (
            <ActivityIndicator size="small" color="#1C1B18" style={{ marginVertical: 12 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to comment.</Text>
          ) : (
            comments.map((c) => (
              <View key={c._id} style={styles.commentRow}>
                {c.commenterProfileImageUrl ? (
                  <Image source={{ uri: c.commenterProfileImageUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.creatorAvatarPlaceholder]}>
                    <Text style={styles.creatorAvatarInitial}>
                      {c.commenterNickName?.[0]?.toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
                <View style={styles.commentBody}>
                  <Text style={styles.commentAuthor}>{c.commenterNickName}</Text>
                  <Text style={styles.commentText}>{c.comment}</Text>
                  {c.attachments.map((a, i) =>
                    a.kind === "image" ? (
                      <Image key={i} source={{ uri: a.url }} style={styles.commentImage} resizeMode="cover" />
                    ) : (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(a.url)} style={styles.commentDocRow}>
                        <Text style={styles.docText}>📄 {a.name}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            ))
          )}

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor="#aaa"
              multiline
            />
          </View>

          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
              <Ionicons name="image-outline" size={16} color="#1C1B18" />
              <Text style={styles.attachBtnText}>Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickFile} disabled={uploading}>
              <Ionicons name="document-attach-outline" size={16} color="#1C1B18" />
              <Text style={styles.attachBtnText}>Files</Text>
            </TouchableOpacity>
            {uploading && <ActivityIndicator size="small" color="#1C1B18" />}
          </View>

          {attachments.length > 0 && (
            <View style={styles.tagList}>
              {attachments.map((a, i) => (
                <TouchableOpacity key={i} style={styles.tagChip} onPress={() => removeAttachment(i)}>
                  <Ionicons name={a.kind === "image" ? "image" : "document"} size={12} color="#1C1B18" />
                  <Text style={styles.tagChipText} numberOfLines={1}>{a.fileName ?? a.kind}</Text>
                  <Ionicons name="close" size={12} color="#1C1B18" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.postCommentBtn}
            onPress={handleAddComment}
            disabled={submitting || uploading || !commentText.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.postCommentBtnText}>Post Comment</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 60 },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  statsRow: { flexDirection: "row", gap: 24, marginVertical: 14 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 13, color: "#555", fontWeight: "600" },
  statTextActive: { color: "#F2650C", fontWeight: "700" },
  deleteBtn: { alignItems: "center", marginTop: 20, padding: 10 },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },
  commentsSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 16 },
  commentsHeader: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 10 },
  noComments: { fontSize: 13, color: "#888", marginBottom: 10 },
  commentRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentBody: { flex: 1, backgroundColor: "#F5EFE0", borderRadius: 10, padding: 10 },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: "#1C1B18", marginBottom: 2 },
  commentText: { fontSize: 14, color: "#333", lineHeight: 19 },
  commentImage: { width: "100%", height: 160, borderRadius: 8, marginTop: 8 },
  commentDocRow: { backgroundColor: "#fff", borderRadius: 8, padding: 8, marginTop: 8 },
  commentInputRow: { marginTop: 6 },
  commentInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1C1B18",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 60,
    textAlignVertical: "top",
  },
  attachRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 10 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  attachBtnText: { fontSize: 12, fontWeight: "600", color: "#1C1B18" },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5EFE0",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  tagChipText: { fontSize: 12, color: "#1C1B18", fontWeight: "600" },
  postCommentBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  postCommentBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
