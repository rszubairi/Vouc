import { Platform, View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import Constants from "expo-constants";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

function currentVersionParts(): [number, number, number] {
  const raw = Constants.expoConfig?.version ?? "0.0.0";
  const [major = 0, minor = 0, patch = 0] = raw.split(".").map((n) => Number(n) || 0);
  return [major, minor, patch];
}

export function AppUpdateGate({ children }: { children: React.ReactNode }) {
  const platform = Platform.OS === "android" ? "android" : "ios";
  const [major, minor, patch] = currentVersionParts();

  const result = useQuery(api.releases.checkMinimumVersion, { platform, major, minor, patch });

  if (result?.updateRequired) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.body}>
          A newer version of Vouch is required to continue.
          {result.minimumVersion ? ` (minimum version ${result.minimumVersion})` : ""}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            Linking.openURL(
              platform === "ios"
                ? "https://apps.apple.com/app/id0000000000"
                : "market://details?id=com.oolala.app"
            )
          }
        >
          <Text style={styles.buttonText}>Update Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { color: "#F5EFE0", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  body: { color: "#c9c4b8", fontSize: 15, textAlign: "center", marginBottom: 28 },
  button: { backgroundColor: "#F2650C", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14 },
  buttonText: { color: "#1C1B18", fontSize: 16, fontWeight: "700" },
});
