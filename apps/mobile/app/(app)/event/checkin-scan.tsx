import { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function CheckinScanScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const checkInAttendee = useMutation(api.events.checkInAttendee);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  async function handleScan({ data }: { data: string }) {
    if (processing || data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    try {
      setProcessing(true);
      const payload = JSON.parse(data) as { kind: "attendance" | "guest"; id: string };
      const result = await checkInAttendee({ kind: payload.kind, id: payload.id as any });
      setLastResult(
        result.alreadyCheckedIn
          ? `${result.name ?? "Attendee"} was already checked in.`
          : `${result.name ?? "Attendee"} checked in!`
      );
    } catch (e: any) {
      setLastResult(null);
      Alert.alert("Scan failed", e.message ?? "Couldn't read this QR code.");
    } finally {
      setProcessing(false);
      setTimeout(() => {
        lastScannedRef.current = null;
      }, 2000);
    }
  }

  if (!permission) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is needed to scan check-in QR codes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScan}
      />
      <View style={styles.overlay}>
        {processing && <ActivityIndicator size="large" color="#fff" />}
        {lastResult && <Text style={styles.resultText}>{lastResult}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  permissionText: { fontSize: 15, color: "#1C1B18", textAlign: "center", marginBottom: 16 },
  permissionBtn: { backgroundColor: "#1C1B18", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24 },
  permissionBtnText: { color: "#F2650C", fontWeight: "700" },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 10,
  },
  resultText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
