import { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const LAST_SEEN_KEY = "lastSeenReleaseVersion";

export function WhatsNewModal() {
  const platform = Platform.OS === "android" ? "android" : "ios";
  const latest = useQuery(api.releases.latest, { platform });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!latest) return;
    SecureStore.getItemAsync(LAST_SEEN_KEY).then((lastSeen) => {
      if (lastSeen !== latest.version) setVisible(true);
    });
  }, [latest?.version]);

  if (!latest || !visible) return null;

  function dismiss() {
    setVisible(false);
    if (latest) SecureStore.setItemAsync(LAST_SEEN_KEY, latest.version);
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>What's New</Text>
          <Text style={styles.version}>Version {latest.version}</Text>
          <Text style={styles.notes}>{latest.releaseNotes}</Text>
          <TouchableOpacity style={styles.button} onPress={dismiss}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#FAF5EA", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400 },
  title: { fontSize: 20, fontWeight: "700", color: "#1C1B18", marginBottom: 4 },
  version: { fontSize: 13, fontWeight: "600", color: "#F2650C", marginBottom: 16 },
  notes: { fontSize: 15, color: "#333", lineHeight: 22, marginBottom: 24 },
  button: { backgroundColor: "#1C1B18", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#F2650C", fontSize: 15, fontWeight: "700" },
});
