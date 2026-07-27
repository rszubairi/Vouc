import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function formatCountdown(postDate: number, now: number): string {
  const diffMs = postDate - now;
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "publishing soon";
  if (diffMins < 60) return `in ${diffMins} min${diffMins === 1 ? "" : "s"}`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

export function ScheduledBadge({ postDate }: { postDate: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (postDate <= now) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={12} color="#F2650C" />
      <Text style={styles.text}>Scheduled {formatCountdown(postDate, now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FDECE0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F2650C",
  },
});
