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
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "expo-router";

export default function CreateEventScreen() {
  const router = useRouter();
  const createEvent = useMutation(api.events.createEvent);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [details, setDetails] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [startTime, setStartTime] = useState(""); // HH:MM
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [noPayment, setNoPayment] = useState(true);
  const [allowRetweet, setAllowRetweet] = useState(true);
  const [mustRead, setMustRead] = useState(false);
  const [toUpline, setToUpline] = useState(true);
  const [toDownline, setToDownline] = useState(true);

  function parseDateTime(dateStr: string, timeStr: string): number | null {
    if (!dateStr || !timeStr) return null;
    const iso = `${dateStr}T${timeStr}:00`;
    const ts = new Date(iso).getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  async function handleCreate() {
    if (!title.trim() || !eventType.trim() || !details.trim()) {
      Alert.alert("Missing info", "Please fill in title, type, and details.");
      return;
    }
    const start = parseDateTime(startDate, startTime);
    const end = parseDateTime(endDate, endTime);
    if (!start || !end) {
      Alert.alert(
        "Invalid dates",
        "Please enter dates as YYYY-MM-DD and times as HH:MM (24-hour)."
      );
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
        eventType: eventType.trim(),
        details: details.trim(),
        speaker: speaker.trim() || undefined,
        eventLink: eventLink.trim() || undefined,
        eventDateStart: start,
        eventDateEnd: end,
        noPayment,
        allowRetweet,
        mustRead,
        toUpline,
        toDownline,
        toSelectGroup: false,
        toCustom: false,
      });
      router.replace(`/(app)/event/${eventId}`);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create the event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Event Type</Text>
      <TextInput
        style={styles.input}
        value={eventType}
        onChangeText={setEventType}
        placeholder="e.g. Health Club, Webinar"
      />

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={details}
        onChangeText={setDetails}
        multiline
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Start Date</Text>
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Start Time</Text>
          <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>End Date</Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>End Time</Text>
          <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
        </View>
      </View>

      <Text style={styles.label}>Speaker (optional)</Text>
      <TextInput style={styles.input} value={speaker} onChangeText={setSpeaker} />

      <Text style={styles.label}>Event Link (optional)</Text>
      <TextInput style={styles.input} value={eventLink} onChangeText={setEventLink} autoCapitalize="none" />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Free event (no payment required)</Text>
        <Switch value={noPayment} onValueChange={setNoPayment} trackColor={{ true: "#C9A227" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Allow sharing/retweet</Text>
        <Switch value={allowRetweet} onValueChange={setAllowRetweet} trackColor={{ true: "#C9A227" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Mark as must-read</Text>
        <Switch value={mustRead} onValueChange={setMustRead} trackColor={{ true: "#C9A227" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visible to upline</Text>
        <Switch value={toUpline} onValueChange={setToUpline} trackColor={{ true: "#C9A227" }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visible to downline</Text>
        <Switch value={toDownline} onValueChange={setToDownline} trackColor={{ true: "#C9A227" }} />
      </View>

      <TouchableOpacity
        style={[styles.createBtn, submitting && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#F5EFE0" />
        ) : (
          <Text style={styles.createBtnText}>Create Event</Text>
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
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
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
  createBtnText: { color: "#C9A227", fontSize: 16, fontWeight: "700" },
});
