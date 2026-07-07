import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const event = useQuery(api.events.getEvent, id ? { eventId: id as Id<"events"> } : "skip");
  const rsvp = useMutation(api.events.rsvpEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("0");
  const [paidVia, setPaidVia] = useState("");
  const [guestName, setGuestName] = useState("");
  const [remarks, setRemarks] = useState("");

  if (event === undefined || me === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  const isOwner = me?._id === event.userId;

  async function handleRsvp() {
    try {
      setSubmitting(true);
      await rsvp({
        eventId: id as Id<"events">,
        paidBy: me?.nickName ?? "",
        paidTo: event!.creatorNickName,
        paidVia: event!.noPayment ? "N/A" : paidVia,
        amount: event!.noPayment ? 0 : Number(amount) || 0,
        transactionDate: Date.now(),
        guestName: guestName || undefined,
        remarks: remarks || undefined,
      });
      setShowRsvpForm(false);
      Alert.alert("RSVP Confirmed", "You're on the list for this event.");
    } catch (err: any) {
      Alert.alert("RSVP failed", err.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete Event", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEvent({ eventId: id as Id<"events"> });
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eventType}>{event.eventType}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.hostedBy}>Hosted by {event.creatorNickName}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {new Date(event.eventDateStart).toLocaleString()} – {new Date(event.eventDateEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      {event.speaker && <Text style={styles.metaText}>Speaker: {event.speaker}</Text>}
      {event.selectedZone && <Text style={styles.metaText}>Timezone: {event.selectedZone}</Text>}

      <Text style={styles.details}>{event.details}</Text>

      {event.eventLink && (
        <TouchableOpacity onPress={() => Linking.openURL(event.eventLink!)}>
          <Text style={styles.link}>{event.eventLink}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        <Text style={styles.statText}>👥 {event.attendeeCount} attending</Text>
        <Text style={styles.statText}>❤️ {event.likeCount}</Text>
        <Text style={styles.statText}>💬 {event.commentCount}</Text>
      </View>

      {!showRsvpForm ? (
        <TouchableOpacity style={styles.rsvpBtn} onPress={() => setShowRsvpForm(true)}>
          <Text style={styles.rsvpBtnText}>RSVP</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.rsvpForm}>
          {!event.noPayment && (
            <>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <Text style={styles.label}>Payment Method</Text>
              <TextInput style={styles.input} value={paidVia} onChangeText={setPaidVia} placeholder="e.g. Bank Transfer" />
            </>
          )}
          <Text style={styles.label}>Guest Name (optional)</Text>
          <TextInput style={styles.input} value={guestName} onChangeText={setGuestName} />
          <Text style={styles.label}>Remarks (optional)</Text>
          <TextInput style={styles.input} value={remarks} onChangeText={setRemarks} />

          <TouchableOpacity
            style={[styles.rsvpBtn, submitting && styles.btnDisabled]}
            onPress={handleRsvp}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#F5EFE0" />
            ) : (
              <Text style={styles.rsvpBtnText}>Confirm RSVP</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isOwner && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Event</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 60 },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eventType: { fontSize: 12, color: "#888", textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "800", color: "#1C1B18", marginBottom: 4 },
  hostedBy: { fontSize: 14, color: "#666", marginBottom: 14 },
  metaRow: { marginBottom: 4 },
  metaText: { fontSize: 14, color: "#555", marginBottom: 4 },
  details: { fontSize: 15, color: "#222", lineHeight: 22, marginVertical: 14 },
  link: { color: "#C9A227", fontSize: 14, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 16, marginVertical: 14 },
  statText: { fontSize: 13, color: "#555" },
  rsvpBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  rsvpBtnText: { color: "#C9A227", fontWeight: "700", fontSize: 16 },
  rsvpForm: { marginTop: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1B18",
  },
  deleteBtn: { alignItems: "center", marginTop: 24, padding: 10 },
  deleteBtnText: { color: "#c0392b", fontWeight: "700", fontSize: 14 },
});
