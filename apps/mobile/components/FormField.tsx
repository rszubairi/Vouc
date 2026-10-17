import { View, Text, TextInput, StyleSheet } from "react-native";

export function FormField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  hint?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        placeholderTextColor="#999"
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Message to show for an error thrown by a Convex call: ConvexError carries a
// user-facing message in `data`; anything else falls back to `message`.
export function errorMessage(err: any): string {
  if (typeof err?.data === "string") return err.data;
  return err?.message ?? "Please try again.";
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: "#555", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1B18",
    backgroundColor: "#FAF5EA",
  },
  hint: { fontSize: 11, color: "#999", marginTop: 4 },
});
