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
        autofocus="on"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScan}
      />
      <View style={styles.frameContainer} pointerEvents="none">
        <View style={styles.scanFrame} />
        {!processing && !lastResult && <Text style={styles.hintText}>Point camera at QR code</Text>}
      </View>
      <View style={styles.overlay}>
        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.processingText}>Scanning...</Text>
          </View>
        )}
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
  frameContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
  hintText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    gap: 10,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  processingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
