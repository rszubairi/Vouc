import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useMemo, useState } from "react";
import { Calendar } from "react-native-calendars";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { visible: searchVisible, toggle: toggleSearch } = usePullReveal();
  useHeaderSearchButton(searchVisible, toggleSearch);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  const startOfMonth = new Date(selectedDate);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const events = useQuery(api.events.calendarEvents, {
    startDate: startOfMonth.getTime(),
    endDate: endOfMonth.getTime(),
  });

  // Build marked dates for calendar
  const markedDates: Record<string, any> = {};
  if (events) {
    for (const event of events) {
      const dateStr = new Date(event.eventDateStart).toISOString().split("T")[0];
      markedDates[dateStr] = {
        marked: true,
        dotColor: "#1C1B18",
        ...(dateStr === selectedDate ? { selected: true, selectedColor: "#1C1B18" } : {}),
      };
    }
  }
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: "#1C1B18" };
  }

  const dayEvents = useMemo(() => {
    const forDay =
      events?.filter(
        (e) => new Date(e.eventDateStart).toISOString().split("T")[0] === selectedDate
      ) ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return forDay;
    return forDay.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.speaker?.toLowerCase().includes(q) ||
        e.eventTypes?.some((t) => t.toLowerCase().includes(q))
    );
  }, [events, selectedDate, search]);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          todayTextColor: "#1C1B18",
          selectedDayBackgroundColor: "#1C1B18",
          arrowColor: "#1C1B18",
        }}
      />

      <ScrollView
        style={styles.eventList}
        contentContainerStyle={styles.eventListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1C1B18" />
        }
      >
        <Text style={styles.dateHeader}>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {searchVisible && (
          <TextInput
            style={styles.search}
            placeholder="Search events"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        )}

        {events === undefined ? (
          <ActivityIndicator color="#1C1B18" style={{ marginTop: 20 }} />
        ) : dayEvents.length === 0 ? (
          <Text style={styles.noEvents}>No events on this day.</Text>
        ) : (
          dayEvents.map((event) => (
            <TouchableOpacity
              key={event._id}
              style={styles.eventCard}
              onPress={() => router.push(`/(app)/event/${event._id}`)}
            >
              <Text style={styles.eventType}>{event.eventTypes?.join(", ")}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>
                {new Date(event.eventDateStart).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" – "}
                {new Date(event.eventDateEnd).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {event.speaker && (
                <Text style={styles.eventSpeaker}>Speaker: {event.speaker}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/(app)/event/create")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF5EA" },
  eventList: { flex: 1 },
  eventListContent: { padding: 16, paddingBottom: 80 },
  dateHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1B18",
    marginBottom: 14,
  },
  noEvents: { color: "#888", fontSize: 15 },
  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  eventType: { fontSize: 12, color: "#888", marginBottom: 4, textTransform: "uppercase" },
  eventTitle: { fontSize: 16, fontWeight: "700", color: "#1C1B18", marginBottom: 4 },
  eventTime: { fontSize: 13, color: "#555" },
  eventSpeaker: { fontSize: 13, color: "#888", marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34 },
});
