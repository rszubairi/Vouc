import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, RefreshControl, Modal } from "react-native";
import { useMemo, useState } from "react";
import { Calendar } from "react-native-calendars";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { usePullReveal } from "../../../hooks/usePullReveal";
import { useHeaderSearchButton } from "../../../hooks/useHeaderSearchButton";

type SortMode = "recent" | "liked";

export default function CalendarScreen() {
  const router = useRouter();
  const toggleEngagement = useMutation(api.engagements.toggleEngagement);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortMode>("recent");
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const activeFilterCount = (sort !== "recent" ? 1 : 0) + (onlyStarred ? 1 : 0);
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
    sortBy: sort,
    onlyStarred: onlyStarred || undefined,
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
          <View style={styles.searchBar}>
            <TextInput
              style={styles.search}
              placeholder="Search events"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <TouchableOpacity style={styles.filterIconBtn} onPress={() => setSortVisible(true)}>
              <Ionicons name="filter" size={18} color="#1C1B18" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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
              <View style={styles.eventTypeRow}>
                <Text style={styles.eventType}>{event.eventTypes?.join(", ")}</Text>
                <TouchableOpacity
                  style={styles.starIcon}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleEngagement({ targetType: "event", targetId: event._id, kind: "Star" });
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={event.isStarred ? "star" : "star-outline"}
                    size={16}
                    color={event.isStarred ? "#F2650C" : "#666"}
                  />
                </TouchableOpacity>
              </View>
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

      <Modal visible={sortVisible} animationType="slide" transparent onRequestClose={() => setSortVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortVisible(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filter Events</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSortVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color="#1C1B18" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Sort by</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, sort === "recent" && styles.chipActive]}
                onPress={() => setSort("recent")}
              >
                <Text style={[styles.chipText, sort === "recent" && styles.chipTextActive]}>Most Recent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sort === "liked" && styles.chipActive]}
                onPress={() => setSort("liked")}
              >
                <Text style={[styles.chipText, sort === "liked" && styles.chipTextActive]}>Most Liked</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Starred</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, onlyStarred && styles.chipActive]}
                onPress={() => setOnlyStarred((v) => !v)}
              >
                <Text style={[styles.chipText, onlyStarred && styles.chipTextActive]}>
                  {onlyStarred ? "Showing starred only" : "Show starred only"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setSortVisible(false)}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#F2650C",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
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
  eventTypeRow: { flexDirection: "row", alignItems: "center" },
  eventType: { fontSize: 12, color: "#888", marginBottom: 4, textTransform: "uppercase" },
  starIcon: { marginLeft: "auto" },
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
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1C1B18" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8, marginTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FAF5EA",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipActive: { backgroundColor: "#1C1B18", borderColor: "#1C1B18" },
  chipText: { fontSize: 13, color: "#1C1B18", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  applyBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
