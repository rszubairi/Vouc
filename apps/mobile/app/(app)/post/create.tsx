import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState } from "react";

export default function CreatePostScreen() {
  const router = useRouter();
  const createPost = useMutation(api.posts.createPost);

  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [mustRead, setMustRead] = useState(false);
  const [allowRetweet, setAllowRetweet] = useState(true);
  const [toDownline, setToDownline] = useState(true);
  const [toUpline, setToUpline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!details.trim()) {
      Alert.alert("Required", "Please enter post details.");
      return;
    }
    setSubmitting(true);
    try {
      await createPost({
        topic: topic.trim() || undefined,
        details: details.trim(),
        mustRead,
        allowRetweet,
        toUpline,
        toDownline,
        toSelectGroup: false,
        toCustom: false,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Topic (optional)</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Product Update"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Details *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={details}
        onChangeText={setDetails}
        placeholder="What would you like to share?"
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Must Read</Text>
        <Switch value={mustRead} onValueChange={setMustRead} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow Retweet</Text>
        <Switch value={allowRetweet} onValueChange={setAllowRetweet} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Downline</Text>
        <Switch value={toDownline} onValueChange={setToDownline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Upline</Text>
        <Switch value={toUpline} onValueChange={setToUpline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Post</Text>
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
