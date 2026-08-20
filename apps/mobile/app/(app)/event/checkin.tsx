import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useConvexAuth } from "convex/react";

export default function CheckinScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const router = useRouter();
  const checkInAttendee = useMutation(api.events.checkInAttendee);
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");
  const [message, setMessage] = useState("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (authLoading || ranRef.current) return;
    if (!isAuthenticated) {
      setStatus("error");
      setMessage("Log in as the event host to check in attendees.");
      return;
    }
    if (kind !== "attendance" && kind !== "guest") {
      setStatus("error");
      setMessage("This QR code isn't a valid check-in code.");
      return;
    }
    ranRef.current = true;
    checkInAttendee({ kind, id: id as any })
      .then((result) => {
        setStatus("done");
        setMessage(
          result.alreadyCheckedIn
            ? `${result.name ?? "Attendee"} was already checked in.`
            : `${result.name ?? "Attendee"} checked in!`
        );
      })
      .catch((e: any) => {
        setStatus("error");
        setMessage(e.message ?? "Couldn't check in this attendee.");
      });
  }, [authLoading, isAuthenticated, kind, id, checkInAttendee]);

  return (
    <View style={styles.container}>
      {status === "pending" && <ActivityIndicator size="large" color="#F2650C" />}
      {status !== "pending" && (
        <>
          <Text style={[styles.message, status === "error" && styles.errorMessage]}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 20, backgroundColor: "#fff" },
  message: { fontSize: 17, fontWeight: "600", color: "#1C1B18", textAlign: "center" },
  errorMessage: { color: "#B3261E" },
  btn: { backgroundColor: "#1C1B18", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 },
  btnText: { color: "#F2650C", fontWeight: "700" },
});
