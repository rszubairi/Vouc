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
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { IANA_TIMEZONES } from "../../../constants/timezones";

const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Hermes doesn't reliably support Intl.supportedValuesOf, so fall back to
// the bundled IANA list — merging in the device zone in case it's not
// already present in the curated list.
const TIMEZONES: string[] =
  typeof (Intl as any).supportedValuesOf === "function" &&
  (Intl as any).supportedValuesOf("timeZone").length > 1
    ? (Intl as any).supportedValuesOf("timeZone")
    : Array.from(new Set([DEVICE_TIMEZONE, ...IANA_TIMEZONES]));

function parseScheduledDateTime(dateStr: string, timeStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const ms = new Date(`${dateStr}T${timeStr}:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

type PendingAttachment = {
  storageId: Id<"_storage">;
  kind: "image" | "file";
  fileName?: string;
};

export default function CreateDiscussionScreen() {
  const router = useRouter();
  const { categoryId: paramCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const createDiscussion = useMutation(api.discussions.createDiscussion);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const categories = useQuery(api.categories.list, { scope: "discussion" });

  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(
    paramCategoryId ? (paramCategoryId as Id<"categories">) : null
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [nonChinaVideoLink, setNonChinaVideoLink] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toDownline, setToDownline] = useState(true);
  const [toUpline, setToUpline] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(""); // "YYYY-MM-DD"
  const [scheduleTime, setScheduleTime] = useState(""); // "HH:MM"
  const [timezone, setTimezone] = useState(DEVICE_TIMEZONE);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
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
      Alert.alert("Permission needed", "Please allow photo library access to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      await uploadAsset(asset.uri, asset.mimeType, asset.fileName ?? undefined, "image");
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

  async function handleSubmit() {
    if (!details.trim()) {
      Alert.alert("Required", "Please enter discussion details.");
      return;
    }
    let postDate: number | undefined;
    if (isScheduled) {
      const ms = parseScheduledDateTime(scheduleDate, scheduleTime);
      if (ms === null) {
        Alert.alert("Invalid schedule", "Please pick a valid date and time.");
        return;
      }
      if (ms <= Date.now()) {
        Alert.alert("Invalid schedule", "Scheduled time must be in the future.");
        return;
      }
      postDate = ms;
    }
    setSubmitting(true);
    try {
      const discussionId = await createDiscussion({
        topic: topic.trim() || undefined,
        details: details.trim(),
        categoryIds: categoryId ? [categoryId] : undefined,
        tags: tags.length ? tags : undefined,
        nonChinaVideoLink: nonChinaVideoLink.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
        postDate,
        selectedZone: isScheduled ? timezone : undefined,
        mustRead: false,
        allowRetweet: true,
        toUpline,
        toDownline,
        toSelectGroup: false,
        toCustom: false,
      });
      router.replace(`/(app)/discussion/${discussionId}`);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create discussion.");
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Subject</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Best CRM for a small team?"
        placeholderTextColor="#aaa"
      />

      <Text style={styles.label}>Details *</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={details}
        onChangeText={setDetails}
        placeholder="What would you like to ask, share, or discuss?"
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
            onPress={() => setCategoryId((prev) => (prev === cat._id ? null : cat._id))}
          >
            <Text style={[styles.chipText, categoryId === cat._id && styles.chipTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Tags / Keywords (optional)</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, styles.tagInput]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Add a tag"
          placeholderTextColor="#aaa"
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
          <Text style={styles.addTagBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={styles.tagList}>
          {tags.map((t) => (
            <TouchableOpacity key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
              <Text style={styles.tagChipText}>{t}</Text>
              <Ionicons name="close" size={12} color="#1C1B18" />
            </TouchableOpacity>
          ))}
        </View>
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
          <Text style={styles.attachBtnText}>Photo</Text>
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

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Downline</Text>
        <Switch value={toDownline} onValueChange={setToDownline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Share to Upline</Text>
        <Switch value={toUpline} onValueChange={setToUpline} trackColor={{ true: "#1C1B18" }} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Schedule Post</Text>
        <Switch value={isScheduled} onValueChange={setIsScheduled} trackColor={{ true: "#1C1B18" }} />
      </View>

      {isScheduled && (
        <View style={styles.scheduleBox}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}>
            <Text style={scheduleDate ? styles.scheduleValue : styles.schedulePlaceholder}>
              {scheduleDate || "Select a date"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            value={scheduleTime}
            onChangeText={setScheduleTime}
            placeholder="HH:MM (24-hour)"
            placeholderTextColor="#aaa"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.label}>Timezone</Text>
          <TouchableOpacity style={styles.input} onPress={() => setZonePickerVisible(true)}>
            <Text style={styles.scheduleValue}>{timezone}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting || uploading}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{isScheduled ? "Schedule Post" : "Start Discussion"}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={datePickerVisible} animationType="slide" transparent onRequestClose={() => setDatePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDatePickerVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={new Date().toISOString().split("T")[0]}
              onDayPress={(day: { dateString: string }) => {
                setScheduleDate(day.dateString);
                setDatePickerVisible(false);
              }}
              markedDates={scheduleDate ? { [scheduleDate]: { selected: true, selectedColor: "#1C1B18" } } : {}}
              theme={{
                todayTextColor: "#1C1B18",
                selectedDayBackgroundColor: "#1C1B18",
                arrowColor: "#1C1B18",
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={zonePickerVisible} animationType="slide" transparent onRequestClose={() => setZonePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setZonePickerVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalSheet, styles.zoneModalSheet]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setZonePickerVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={zoneSearch}
              onChangeText={setZoneSearch}
              placeholder="Search timezone"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />
            <FlatList
              data={TIMEZONES.filter((z) => z.toLowerCase().includes(zoneSearch.trim().toLowerCase()))}
              keyExtractor={(z) => z}
              style={styles.zoneList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.zoneRow}
                  onPress={() => {
                    setTimezone(item);
                    setZonePickerVisible(false);
                    setZoneSearch("");
                  }}
                >
                  <Text style={styles.zoneRowText}>{item}</Text>
                  {item === timezone && <Ionicons name="checkmark" size={18} color="#F2650C" />}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagInput: { flex: 1 },
  addTagBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addTagBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
  scheduleBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 4,
  },
  scheduleValue: { fontSize: 15, color: "#1C1B18" },
  schedulePlaceholder: { fontSize: 15, color: "#aaa" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  zoneModalSheet: { height: "80%" },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1C1B18" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  zoneList: { marginTop: 12 },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  zoneRowText: { fontSize: 14, color: "#1C1B18" },
  applyBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  submitBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
