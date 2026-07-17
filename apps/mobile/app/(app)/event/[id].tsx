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
import * as Calendar from "expo-calendar";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const me = useQuery(api.profiles.me);
  const event = useQuery(api.events.getEvent, id ? { eventId: id as Id<"events"> } : "skip");
  const attendees = useQuery(
    api.events.getEventAttendees,
    id && event?.isHost ? { eventId: id as Id<"events"> } : "skip"
  );
  const rsvp = useMutation(api.events.rsvpEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("0");
  const [paidVia, setPaidVia] = useState("");
  const [guestName, setGuestName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  async function handleAddToCalendar() {
    if (!event) return;
    try {
      setAddingToCalendar(true);
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow calendar access to save this event.");
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar =
        calendars.find((c) => c.allowsModifications) ?? calendars[0];
      if (!defaultCalendar) {
        Alert.alert("No calendar found", "Couldn't find a calendar to save this event to.");
        return;
      }
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: event.title,
        startDate: new Date(event.eventDateStart),
        endDate: new Date(event.eventDateEnd),
        timeZone: event.selectedZone ?? undefined,
        notes: event.details,
        location: event.eventLink ?? undefined,
      });
      Alert.alert("Saved", "Event added to your calendar.");
    } catch (err: any) {
      Alert.alert("Couldn't save event", err.message ?? "Please try again.");
    } finally {
      setAddingToCalendar(false);
    }
  }

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
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventType}>{event.eventType}</Text>
          <Text style={styles.title}>{event.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={handleAddToCalendar}
          disabled={addingToCalendar}
        >
          {addingToCalendar ? (
            <ActivityIndicator size="small" color="#1C1B18" />
          ) : (
            <Text style={styles.calendarBtnText}>📅 Save</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.hostedBy}>Hosted by {event.creatorNickName}</Text>
      {event.hosts.length > 0 && (
        <Text style={styles.hostedBy}>Hosts: {event.hosts.map((h) => h.nickName).join(", ")}</Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {new Date(event.eventDateStart).toLocaleString()} – {new Date(event.eventDateEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
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

      {event.isHost && (
        <View style={styles.registrationBox}>
          <Text style={styles.registrationTitle}>Registration ({attendees?.length ?? 0})</Text>
          {attendees === undefined ? (
            <ActivityIndicator size="small" color="#1C1B18" />
          ) : attendees.length === 0 ? (
            <Text style={styles.metaText}>No RSVPs yet.</Text>
          ) : (
            attendees.map((a) => (
              <View key={a._id} style={styles.attendeeRow}>
                <Text style={styles.attendeeName}>{a.guestName || a.attendeeNickName}</Text>
                {!event.noPayment && <Text style={styles.metaText}>{a.paidVia} · {a.amount}</Text>}
              </View>
            ))
          )}
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
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  calendarBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calendarBtnText: { fontSize: 13, fontWeight: "700", color: "#1C1B18" },
  registrationBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  registrationTitle: { fontSize: 15, fontWeight: "700", color: "#1C1B18", marginBottom: 8 },
  attendeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  attendeeName: { fontSize: 14, color: "#1C1B18" },
  eventType: { fontSize: 12, color: "#888", textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "800", color: "#1C1B18", marginBottom: 4 },
  hostedBy: { fontSize: 14, color: "#666", marginBottom: 14 },
  metaRow: { marginBottom: 4 },
  metaText: { fontSize: 14, color: "#555", marginBottom: 4 },
  details: { fontSize: 15, color: "#222", lineHeight: 22, marginVertical: 14 },
  link: { color: "#F2650C", fontSize: 14, marginBottom: 14 },
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
  rsvpBtnText: { color: "#F2650C", fontWeight: "700", fontSize: 16 },
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
