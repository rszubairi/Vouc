import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { IANA_TIMEZONES } from "../../../constants/timezones";
import { EVENT_TYPES } from "../../../constants/eventTypes";

const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TIMEZONES: string[] =
  typeof (Intl as any).supportedValuesOf === "function" &&
  (Intl as any).supportedValuesOf("timeZone").length > 1
    ? (Intl as any).supportedValuesOf("timeZone")
    : Array.from(new Set([DEVICE_TIMEZONE, ...IANA_TIMEZONES]));

type PendingAttachment = {
  storageId: Id<"_storage">;
  kind: "image" | "file";
  fileName?: string;
};

function parseDateTime(dateStr: string, timeStr: string): number | null {
  if (!dateStr || !timeStr) return null;
  const ts = new Date(`${dateStr}T${timeStr}:00`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const createEvent = useMutation(api.events.createEvent);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const directory = useQuery(api.profiles.listDirectory, {});
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [customEventType, setCustomEventType] = useState("");
  const [details, setDetails] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [nonChinaVideoLink, setNonChinaVideoLink] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timezone, setTimezone] = useState(DEVICE_TIMEZONE);
  const [datePickerFor, setDatePickerFor] = useState<"start" | "end" | null>(null);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");

  const [noPayment, setNoPayment] = useState(true);
  const [hostIds, setHostIds] = useState<Id<"profiles">[]>([]);
  const [hostPickerVisible, setHostPickerVisible] = useState(false);
  const [hostSearch, setHostSearch] = useState("");

  function toggleHost(id: Id<"profiles">) {
    setHostIds((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
  }

  function toggleEventType(t: string) {
    setEventTypes((prev) => (prev.includes(t) ? prev.filter((et) => et !== t) : [...prev, t]));
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
      mediaTypes: ["images", "videos"],
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
      Alert.alert("Error", e.message ?? "Failed to upload media.");
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
    const resolvedEventTypes = eventTypes
      .map((t) => (t === "Other" ? customEventType.trim() : t))
      .filter((t) => t.length > 0);
    if (!title.trim() || !resolvedEventTypes.length || !details.trim()) {
      Alert.alert("Missing info", "Please fill in title, at least one event type, and details.");
      return;
    }
    const start = parseDateTime(startDate, startTime);
    const end = parseDateTime(endDate, endTime);
    if (!start || !end) {
      Alert.alert("Invalid dates", "Please pick a valid start and end date/time.");
      return;
    }
    if (end <= start) {
      Alert.alert("Invalid dates", "End time must be after start time.");
      return;
    }

    try {
      setSubmitting(true);
      const eventId = await createEvent({
        title: title.trim(),
        eventTypes: resolvedEventTypes,
        details: details.trim(),
        eventLink: eventLink.trim() || undefined,
        nonChinaVideoLink: nonChinaVideoLink.trim() || undefined,
        eventDateStart: start,
        eventDateEnd: end,
        selectedZone: timezone,
        noPayment,
        allowRetweet: true,
        mustRead: false,
        toUpline: true,
        toDownline: true,
        toSelectGroup: false,
        toCustom: false,
        coHostIds: hostIds.length ? hostIds : undefined,
        attachments: attachments.length ? attachments : undefined,
      });
      router.replace(`/(app)/event/${eventId}`);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create the event.");
    } finally {
      setSubmitting(false);
    }
  }

  const hostNamesById = new Map((directory ?? []).map((p) => [p._id, p.nickName]));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Dynamic Stretching" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Event Type (select all that apply)</Text>
        <View style={styles.chipRow}>
          {EVENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, eventTypes.includes(t) && styles.chipActive]}
              onPress={() => toggleEventType(t)}
            >
              <Text style={[styles.chipText, eventTypes.includes(t) && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {eventTypes.includes("Other") && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={customEventType}
            onChangeText={setCustomEventType}
            placeholder="Enter a custom event type"
            placeholderTextColor="#aaa"
          />
        )}

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={details}
          onChangeText={setDetails}
          placeholder="Event details, address, speaker info, requirements..."
          placeholderTextColor="#aaa"
          multiline
        />

        <Text style={styles.label}>Event Host(s)</Text>
        <TouchableOpacity style={styles.input} onPress={() => setHostPickerVisible(true)}>
          <Text style={hostIds.length ? styles.value : styles.placeholder}>
            {hostIds.length
              ? hostIds.map((id) => hostNamesById.get(id) ?? "Unknown").join(", ")
              : "Select host(s) from users"}
          </Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setDatePickerFor("start")}>
              <Text style={startDate ? styles.value : styles.placeholder}>{startDate || "Select date"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" placeholderTextColor="#aaa" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setDatePickerFor("end")}>
              <Text style={endDate ? styles.value : styles.placeholder}>{endDate || "Select date"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>End Time</Text>
            <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="HH:MM" placeholderTextColor="#aaa" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        <Text style={styles.label}>Timezone</Text>
        <TouchableOpacity style={styles.input} onPress={() => setZonePickerVisible(true)}>
          <Text style={styles.value}>{timezone}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Event Link (optional)</Text>
        <TextInput style={styles.input} value={eventLink} onChangeText={setEventLink} autoCapitalize="none" placeholder="https://..." placeholderTextColor="#aaa" />

        <Text style={styles.label}>Video Link (optional)</Text>
        <TextInput style={styles.input} value={nonChinaVideoLink} onChangeText={setNonChinaVideoLink} autoCapitalize="none" placeholder="https://..." placeholderTextColor="#aaa" />

        <Text style={styles.label}>Attachments (optional)</Text>
        <View style={styles.attachRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
            <Ionicons name="image-outline" size={18} color="#1C1B18" />
            <Text style={styles.attachBtnText}>Photos/Video</Text>
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Free event (no payment required)</Text>
          <TouchableOpacity
            style={[styles.freeToggle, noPayment && styles.freeToggleActive]}
            onPress={() => setNoPayment(!noPayment)}
          >
            <Text style={[styles.freeToggleText, noPayment && styles.freeToggleTextActive]}>
              {noPayment ? "Free" : "Paid"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (submitting || uploading) && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator color="#F5EFE0" />
          ) : (
            <Text style={styles.createBtnText}>Create Event</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={datePickerFor !== null} animationType="slide" transparent onRequestClose={() => setDatePickerFor(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerFor(null)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDatePickerFor(null)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={new Date().toISOString().split("T")[0]}
              onDayPress={(day: { dateString: string }) => {
                if (datePickerFor === "start") setStartDate(day.dateString);
                else if (datePickerFor === "end") setEndDate(day.dateString);
                setDatePickerFor(null);
              }}
              markedDates={
                datePickerFor === "start" && startDate
                  ? { [startDate]: { selected: true, selectedColor: "#1C1B18" } }
                  : datePickerFor === "end" && endDate
                  ? { [endDate]: { selected: true, selectedColor: "#1C1B18" } }
                  : {}
              }
              theme={{ todayTextColor: "#1C1B18", selectedDayBackgroundColor: "#1C1B18", arrowColor: "#1C1B18" }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={zonePickerVisible} animationType="slide" transparent onRequestClose={() => setZonePickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setZonePickerVisible(false)}>
          <TouchableOpacity style={[styles.modalSheet, styles.tallModalSheet]} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setZonePickerVisible(false)} hitSlop={8}>
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
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => {
                    setTimezone(item);
                    setZonePickerVisible(false);
                    setZoneSearch("");
                  }}
                >
                  <Text style={styles.listRowText}>{item}</Text>
                  {item === timezone && <Ionicons name="checkmark" size={18} color="#F2650C" />}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={hostPickerVisible} animationType="slide" transparent onRequestClose={() => setHostPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setHostPickerVisible(false)}>
          <TouchableOpacity style={[styles.modalSheet, styles.tallModalSheet]} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Event Host(s)</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setHostPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={hostSearch}
              onChangeText={setHostSearch}
              placeholder="Search users"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
            />
            <FlatList
              data={(directory ?? []).filter((p) =>
                p.nickName.toLowerCase().includes(hostSearch.trim().toLowerCase())
              )}
              keyExtractor={(p) => p._id}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listRow} onPress={() => toggleHost(item._id)}>
                  <Text style={styles.listRowText}>{item.nickName}</Text>
                  {hostIds.includes(item._id) && <Ionicons name="checkmark" size={18} color="#F2650C" />}
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
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
  value: { fontSize: 15, color: "#1C1B18" },
  placeholder: { fontSize: 15, color: "#aaa" },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  switchLabel: { fontSize: 14, color: "#1C1B18", flex: 1, marginRight: 10 },
  freeToggle: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  freeToggleActive: { backgroundColor: "#1C1B18", borderColor: "#1C1B18" },
  freeToggleText: { fontSize: 13, fontWeight: "700", color: "#1C1B18" },
  freeToggleTextActive: { color: "#F2650C" },
  createBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 30,
  },
  btnDisabled: { opacity: 0.6 },
  createBtnText: { color: "#F2650C", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  tallModalSheet: { height: "80%" },
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
  list: { marginTop: 12 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  listRowText: { fontSize: 14, color: "#1C1B18" },
});
