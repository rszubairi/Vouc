import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function CreateLibraryItemScreen() {
  const router = useRouter();
  const categories = useQuery(api.library.listCategories, {});
  const createLibraryItem = useMutation(api.library.createLibraryItem);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | undefined>(undefined);
  const [nonChinaVideoLink, setNonChinaVideoLink] = useState("");
  const [allowRetweet, setAllowRetweet] = useState(true);
  const [mustRead, setMustRead] = useState(false);
  const [toUpline, setToUpline] = useState(true);
  const [toDownline, setToDownline] = useState(true);

  async function handleCreate() {
    if (!title.trim() || !type.trim() || !description.trim()) {
      Alert.alert("Missing info", "Please fill in title, type, and description.");
      return;
    }

    try {
      setSubmitting(true);
      const itemId = await createLibraryItem({
        title: title.trim(),
        type: type.trim(),
        description: description.trim(),
        categoryId,
        nonChinaVideoLink: nonChinaVideoLink.trim() || undefined,
        allowRetweet,
        mustRead,
        toUpline,
        toDownline,
        toSelectGroup: false,
        toCustom: false,
      });
      router.replace(`/(app)/library/${itemId}`);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create the library item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Type</Text>
      <TextInput
        style={styles.input}
        value={type}
        onChangeText={setType}
        placeholder="e.g. Guide, Video, Document"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Category (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {(categories ?? []).map((cat) => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.categoryChip, categoryId === cat._id && styles.categoryChipActive]}
            onPress={() => setCategoryId(categoryId === cat._id ? undefined : cat._id)}
          >
            <Text
              style={[
                styles.categoryChipText,
                categoryId === cat._id && styles.categoryChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Video Link (optional)</Text>
      <TextInput
        style={styles.input}
        value={nonChinaVideoLink}
        onChangeText={setNonChinaVideoLink}
        autoCapitalize="none"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Allow sharing/retweet</Text>
        <Switch value={allowRetweet} onValueChange={setAllowRetweet} trackColor={{ true: "#F2650C" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Mark as must-read</Text>
        <Switch value={mustRead} onValueChange={setMustRead} trackColor={{ true: "#F2650C" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visible to upline</Text>
        <Switch value={toUpline} onValueChange={setToUpline} trackColor={{ true: "#F2650C" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visible to downline</Text>
        <Switch value={toDownline} onValueChange={setToDownline} trackColor={{ true: "#F2650C" }} />
      </View>

      <TouchableOpacity
        style={[styles.createBtn, submitting && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#F5EFE0" />
        ) : (
          <Text style={styles.createBtnText}>Create Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1B18",
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  categoryScroll: { marginTop: 4 },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: "#1C1B18", borderColor: "#1C1B18" },
  categoryChipText: { fontSize: 13, color: "#1C1B18" },
  categoryChipTextActive: { color: "#F2650C", fontWeight: "700" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  switchLabel: { fontSize: 14, color: "#1C1B18", flex: 1, marginRight: 10 },
  createBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 30,
  },
  btnDisabled: { opacity: 0.6 },
  createBtnText: { color: "#F2650C", fontSize: 16, fontWeight: "700" },
});
