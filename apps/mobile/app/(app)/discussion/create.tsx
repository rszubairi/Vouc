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
import { LANGUAGES, ALL_LANGUAGES } from "../../../constants/languages";
import { MARKETS, ALL_MARKETS } from "../../../constants/markets";

const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Hermes doesn't reliably support Intl.supportedValuesOf, so fall back to
// the bundled IANA list — merging in the device zone in case it's not
// already present in the curated list.
const TIMEZONES: string[] =
  typeof (Intl as any).supportedValuesOf === "function" &&
  (Intl as any).supportedValuesOf("timeZone").length > 1
    ? (Intl as any).supportedValuesOf("timeZone")
    : Array.from(new Set([DEVICE_TIMEZONE, ...IANA_TIMEZONES]));

// Returns the UTC offset (ms) that `timeZone` observes at `atUtcMs`, i.e. how
// far local wall-clock time in that zone is ahead of UTC at that instant.
function getTimeZoneOffsetMs(timeZone: string, atUtcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(atUtcMs));
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asIfUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asIfUTC - atUtcMs;
}

// Converts a wall-clock date/time as observed in `timeZone` into the
// corresponding UTC instant (ms). Using the device's local timezone here
// (as `new Date(...)` would) silently mis-schedules posts whenever the
// selected timezone differs from the device's.
function parseScheduledDateTime(dateStr: string, timeStr: string, timeZone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const naiveUtcMs = Date.UTC(y, mo - 1, d, h, mi, 0);
  if (Number.isNaN(naiveUtcMs)) return null;
  const offset = getTimeZoneOffsetMs(timeZone, naiveUtcMs);
  return naiveUtcMs - offset;
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
  const selectedCategoryName = categories?.find((c) => c._id === categoryId)?.name ?? null;
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [nonChinaVideoLink, setNonChinaVideoLink] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(""); // "YYYY-MM-DD"
  const [scheduleTime, setScheduleTime] = useState(""); // "HH:MM"
  const [timezone, setTimezone] = useState(DEVICE_TIMEZONE);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");

  // Visibility distribution is not configurable from the mobile app right
  // now — always share to downline only.
  const toDownline = true;
  const toUpline = false;

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function toggleLanguage(language: string) {
    setLanguages((prev) => {
      if (language === ALL_LANGUAGES) return [ALL_LANGUAGES];
      const withoutAll = prev.filter((l) => l !== ALL_LANGUAGES);
      return withoutAll.includes(language)
        ? withoutAll.filter((l) => l !== language)
        : [...withoutAll, language];
    });
  }

  function toggleMarket(market: string) {
    setMarkets((prev) => {
      if (market === ALL_MARKETS) return [ALL_MARKETS];
      const withoutAll = prev.filter((m) => m !== ALL_MARKETS);
      return withoutAll.includes(market)
        ? withoutAll.filter((m) => m !== market)
        : [...withoutAll, market];
    });
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

  function openRename(index: number) {
    setRenamingIndex(index);
    setRenameValue(attachments[index]?.fileName ?? "");
  }

  function confirmRename() {
    if (renamingIndex === null) return;
    const name = renameValue.trim();
    setAttachments((prev) =>
      prev.map((a, i) => (i === renamingIndex ? { ...a, fileName: name || a.fileName } : a))
    );
    setRenamingIndex(null);
    setRenameValue("");
  }

  async function handleSubmit() {
    if (!details.trim()) {
      Alert.alert("Required", "Please enter discussion details.");
      return;
    }
    if (languages.length === 0) {
      Alert.alert("Required", "Please select at least one language to target.");
      return;
    }
    if (markets.length === 0) {
      Alert.alert("Required", "Please select at least one market to target.");
      return;
    }
    let postDate: number | undefined;
    if (isScheduled) {
      const ms = parseScheduledDateTime(scheduleDate, scheduleTime, timezone);
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
        languages,
        markets,
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
      <TouchableOpacity style={styles.input} onPress={() => setCategoryPickerVisible(true)}>
        <Text style={selectedCategoryName ? styles.scheduleValue : styles.schedulePlaceholder}>
          {selectedCategoryName ?? "Select a category"}
        </Text>
      </TouchableOpacity>

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

      <Text style={styles.label}>Language *</Text>
      <View style={styles.tagList}>
        <TouchableOpacity
          style={[styles.chip, languages.includes(ALL_LANGUAGES) && styles.chipActive]}
          onPress={() => toggleLanguage(ALL_LANGUAGES)}
        >
          <Text style={[styles.chipText, languages.includes(ALL_LANGUAGES) && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {LANGUAGES.map((language) => (
          <TouchableOpacity
            key={language}
            style={[styles.chip, languages.includes(language) && styles.chipActive]}
            onPress={() => toggleLanguage(language)}
          >
            <Text style={[styles.chipText, languages.includes(language) && styles.chipTextActive]}>
              {language}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Market *</Text>
      <View style={styles.tagList}>
        <TouchableOpacity
          style={[styles.chip, markets.includes(ALL_MARKETS) && styles.chipActive]}
          onPress={() => toggleMarket(ALL_MARKETS)}
        >
          <Text style={[styles.chipText, markets.includes(ALL_MARKETS) && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {MARKETS.map((market) => (
          <TouchableOpacity
            key={market}
            style={[styles.chip, markets.includes(market) && styles.chipActive]}
            onPress={() => toggleMarket(market)}
          >
            <Text style={[styles.chipText, markets.includes(market) && styles.chipTextActive]}>
              {market}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
            <View key={i} style={styles.tagChip}>
              <Ionicons name={a.kind === "image" ? "image" : "document"} size={12} color="#1C1B18" />
              <TouchableOpacity onPress={() => openRename(i)}>
                <Text style={styles.tagChipText} numberOfLines={1}>{a.fileName ?? a.kind}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeAttachment(i)} hitSlop={6}>
                <Ionicons name="close" size={12} color="#1C1B18" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

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

      <Modal visible={categoryPickerVisible} animationType="slide" transparent onRequestClose={() => setCategoryPickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCategoryPickerVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.zoneRow}
              onPress={() => {
                setCategoryId(null);
                setCategoryPickerVisible(false);
              }}
            >
              <Text style={styles.zoneRowText}>None</Text>
              {categoryId === null && <Ionicons name="checkmark" size={18} color="#F2650C" />}
            </TouchableOpacity>
            {(categories ?? []).map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.zoneRow}
                onPress={() => {
                  setCategoryId(cat._id);
                  setCategoryPickerVisible(false);
                }}
              >
                <Text style={styles.zoneRowText}>{cat.name}</Text>
                {categoryId === cat._id && <Ionicons name="checkmark" size={18} color="#F2650C" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={renamingIndex !== null} animationType="slide" transparent onRequestClose={() => setRenamingIndex(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRenamingIndex(null)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Rename Attachment</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setRenamingIndex(null)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="File name"
              placeholderTextColor="#aaa"
              autoFocus
            />
            <TouchableOpacity style={styles.applyBtn} onPress={confirmRename}>
              <Text style={styles.applyBtnText}>Save</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
