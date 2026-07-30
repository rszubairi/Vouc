import { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Avatar } from "../../../components/Avatar";

type Row = {
  key: string;
  kind: "attendance" | "guest";
  id: Id<"eventAttendances"> | Id<"eventGuests">;
  name: string;
  city?: string;
  rsvpOn: number;
  checkedIn: boolean;
};

export default function RsvpListScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const attendees = useQuery(
    api.events.getEventAttendees,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );
  const toggleAttendance = useMutation(api.events.toggleAttendance);
  const [exporting, setExporting] = useState(false);

  const rows: Row[] = (attendees ?? []).flatMap((a) => {
    const main: Row = {
      key: a._id,
      kind: "attendance",
      id: a._id,
      name: a.attendeeNickName,
      city: a.attendeeCity,
      rsvpOn: a.transactionDate ?? a._creationTime,
      checkedIn: !!a.hasAttended,
    };
    const guests: Row[] = a.guests.map((g) => ({
      key: g._id,
      kind: "guest",
      id: g._id,
      name: `${g.name} RSVP by ${a.attendeeNickName}`,
      city: a.attendeeCity,
      rsvpOn: a.transactionDate ?? a._creationTime,
      checkedIn: g.checkedIn,
    }));
    return [main, ...guests];
  });

  async function handleExport() {
    if (!attendees) return;
    try {
      setExporting(true);
      const header = "Name,City,RSVP On,Status\n";
      const csvRows = rows
        .map((r) =>
          [r.name, r.city ?? "", new Date(r.rsvpOn).toLocaleDateString(), r.checkedIn ? "Present" : "Absent"]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      const path = `${FileSystem.cacheDirectory}rsvp-list-${eventId}.csv`;
      await FileSystem.writeAsStringAsync(path, header + csvRows);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Export RSVP List" });
      } else {
        Alert.alert("Sharing unavailable", "Sharing isn't supported on this device.");
      }
    } catch (e: any) {
      Alert.alert("Export failed", e.message ?? "Please try again.");
    } finally {
      setExporting(false);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(app)/event/checkin-scan", params: { eventId } })}
            hitSlop={10}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="qr-code-outline" size={22} color="#F2650C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} disabled={exporting} hitSlop={10} style={{ paddingHorizontal: 10 }}>
            {exporting ? (
              <ActivityIndicator size="small" color="#F2650C" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#F2650C" />
            )}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, eventId, exporting, rows]);

  async function handleToggle(row: Row) {
    try {
      await toggleAttendance({ kind: row.kind, id: row.id as any });
    } catch (e: any) {
      Alert.alert("Couldn't update", e.message ?? "Please try again.");
    }
  }

  if (attendees === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {rows.length === 0 ? (
        <Text style={styles.empty}>No RSVPs yet.</Text>
      ) : (
        rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Avatar
              name={row.name}
              imageStyle={styles.avatarImage}
              placeholderStyle={styles.avatarPlaceholder}
              textStyle={styles.avatarText}
            />
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{row.name}</Text>
              {row.city && <Text style={styles.rowMeta}>{row.city}</Text>}
              <Text style={styles.rowMeta}>RSVP On: {new Date(row.rsvpOn).toLocaleDateString()}</Text>
            </View>
            <View style={styles.rowStatus}>
              <Switch value={row.checkedIn} onValueChange={() => handleToggle(row)} />
              <Text style={styles.rowStatusText}>{row.checkedIn ? "Present" : "Absent"}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E9EAEC" },
  content: { padding: 12 },
  loader: { flex: 1, marginTop: 60 },
  empty: { textAlign: "center", color: "#666", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#F2650C", fontWeight: "700", fontSize: 18 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "700", color: "#1C1B18" },
  rowMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  rowStatus: { alignItems: "center", gap: 4 },
  rowStatusText: { fontSize: 11, color: "#666", fontWeight: "600" },
});
