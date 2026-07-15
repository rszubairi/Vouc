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
  const categories = useQuery(api.categories.list, { scope: "knowledgeHub" });
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Getting Started Guide"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Type</Text>
      <TextInput
        style={styles.input}
        value={type}
        onChangeText={setType}
        placeholder="e.g. Guide, Video, Document"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this resource about?"
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Category (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {(categories ?? []).map((cat) => (
          <TouchableOpacity
            key={cat._id}
            style={[styles.chip, categoryId === cat._id && styles.chipActive]}
            onPress={() => setCategoryId(categoryId === cat._id ? undefined : cat._id)}
          >
            <Text style={[styles.chipText, categoryId === cat._id && styles.chipTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Video Link (optional)</Text>
      <TextInput
        style={styles.input}
        value={nonChinaVideoLink}
        onChangeText={setNonChinaVideoLink}
        placeholder="https://..."
        placeholderTextColor="#aaa"
        autoCapitalize="none"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow Retweet</Text>
        <Switch value={allowRetweet} onValueChange={setAllowRetweet} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Must Read</Text>
        <Switch value={mustRead} onValueChange={setMustRead} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Upline</Text>
        <Switch value={toUpline} onValueChange={setToUpline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Downline</Text>
        <Switch value={toDownline} onValueChange={setToDownline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Create Item</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  toggleLabel: { fontSize: 15, color: "#1C1B18" },
  submitBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
