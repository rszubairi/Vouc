import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLayoutEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

type PendingAttachment = {
  storageId: Id<"_storage">;
  kind: "image" | "file";
  fileName?: string;
};

export default function CreateLibraryItemScreen() {
  const router = useRouter();
  const { source, categoryId: paramCategoryId } = useLocalSearchParams<{
    source?: string;
    categoryId?: string;
  }>();
  const isDirectory = source === "directory";
  const navigation = useNavigation();

  useLayoutEffect(() => {
    if (isDirectory) {
      navigation.setOptions({ title: "Directory Item" });
    }
  }, [isDirectory, navigation]);

  // Directory items inherit their single category from the page they were
  // created from (see categoryIds below) — no picker needed, so the
  // category list is only fetched for the Knowledge Hub multi-select.
  const categories = useQuery(api.categories.list, isDirectory ? "skip" : { scope: "knowledgeHub" });
  const createLibraryItem = useMutation(api.library.createLibraryItem);
  const createKnowledgeHubItem = useMutation(api.knowledgeHub.createItem);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(
    paramCategoryId ? (paramCategoryId as Id<"categories">) : null
  );
  const [nonChinaVideoLink, setNonChinaVideoLink] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

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
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      await uploadAsset(asset.uri, asset.mimeType, asset.name, "file");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!subject.trim() || !details.trim()) {
      Alert.alert("Missing info", "Please fill in subject and details.");
      return;
    }

    try {
      setSubmitting(true);
      const commonArgs = {
        title: subject.trim(),
        description: details.trim(),
        categoryIds: categoryId ? [categoryId] : undefined,
        nonChinaVideoLink: nonChinaVideoLink.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
        allowRetweet: true,
        mustRead: false,
        toUpline: true,
        toDownline: true,
        toSelectGroup: false,
        toCustom: false,
      };
      const itemId = isDirectory
        ? await createLibraryItem(commonArgs)
        : await createKnowledgeHubItem(commonArgs);
      router.replace(
        isDirectory ? `/(app)/directory/item/${itemId}` : `/(app)/library/${itemId}`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create the item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Getting Started Guide"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Details *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={details}
          onChangeText={setDetails}
          placeholder="What is this resource about?"
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {!isDirectory && (
          <>
            <Text style={styles.label}>Category (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(categories ?? []).map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[styles.chip, categoryId === cat._id && styles.chipActive]}
                  onPress={() => setCategoryId((prev) => (prev === cat._id ? null : cat._id))}
                >
                  <Text style={[styles.chipText, categoryId === cat._id && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Video Link (optional)</Text>
        <TextInput
          style={styles.input}
          value={nonChinaVideoLink}
          onChangeText={setNonChinaVideoLink}
          placeholder="https://..."
          placeholderTextColor="#aaa"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Attachments (optional)</Text>
        <View style={styles.attachRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
            <Ionicons name="image-outline" size={18} color="#1C1B18" />
            <Text style={styles.attachBtnText}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickFile} disabled={uploading}>
            <Ionicons name="document-attach-outline" size={18} color="#1C1B18" />
            <Text style={styles.attachBtnText}>File</Text>
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

        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting || uploading}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Item</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1B18",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  multiline: { minHeight: 120, paddingTop: 12 },
  chipScroll: { marginTop: 2 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipActive: { backgroundColor: "#1C1B18", borderColor: "#1C1B18" },
  chipText: { fontSize: 13, color: "#1C1B18", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  attachRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  attachBtnText: { fontSize: 13, fontWeight: "600", color: "#1C1B18" },
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
  submitBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
