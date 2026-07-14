import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter, Link } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const PASSWORD_HINT =
  "Min 8 chars · Uppercase · Lowercase · Number · Special character";

function validate(fields: {
  email: string;
  password: string;
  confirmPassword: string;
  nickName: string;
  firstName: string;
  lastName: string;
  sponsorEmail: string;
  city: string;
  country: string;
  termsAccepted: boolean;
}) {
  if (!fields.nickName.trim()) return "Nickname is required.";
  if (!fields.firstName.trim()) return "First name is required.";
  if (!fields.lastName.trim()) return "Last name is required.";
  if (!fields.sponsorEmail.trim()) return "Sponsor email address is required.";
  if (!fields.email.trim()) return "Email address is required.";
  if (!fields.city.trim()) return "City is required.";
  if (!fields.country.trim()) return "Country is required.";
  if (!fields.termsAccepted) return "You must accept the terms and conditions.";
  const pw = fields.password;
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain a digit.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain a special character.";
  if (pw !== fields.confirmPassword) return "Passwords do not match.";
  return null;
}

export default function RegisterScreen() {
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.profiles.create);
  const router = useRouter();

  const [nickName, setNickName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const error = validate({
      email,
      password,
      confirmPassword,
      nickName,
      firstName,
      lastName,
      sponsorEmail,
      city,
      country,
      termsAccepted,
    });
    if (error) {
      Alert.alert("Validation", error);
      return;
    }

    try {
      setLoading(true);

      // 1. Create auth account
      await signIn("password", { email, password, flow: "signUp" });

      // 2. Create profile record linked to the auth account
      await createProfile({
        nickName,
        firstName,
        middleName: middleName || undefined,
        lastName,
        emailAddress: email,
        sponsorEmailAddress: sponsorEmail,
        city,
        country,
      });

      Alert.alert(
        "Registration successful",
        "Your account is pending sponsor approval. You will be notified once approved.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Registration failed", err.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        <Field label="Nickname *" value={nickName} onChangeText={setNickName} />
        <Field label="First Name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Middle Name" value={middleName} onChangeText={setMiddleName} />
        <Field label="Last Name *" value={lastName} onChangeText={setLastName} />
        <Field
          label="Sponsor's Email Address *"
          value={sponsorEmail}
          onChangeText={setSponsorEmail}
          keyboardType="email-address"
        />
        <Field
          label="Your Email Address *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          hint={PASSWORD_HINT}
        />
        <Field
          label="Confirm Password *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <Field label="City *" value={city} onChangeText={setCity} />
        <Field label="Country *" value={country} onChangeText={setCountry} />

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setTermsAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>I accept the Terms and Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Register</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1B18",
    marginBottom: 28,
  },
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
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#1C1B18",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#1C1B18" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: "#333" },
  btn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginRow: { flexDirection: "row", justifyContent: "center" },
  loginLabel: { color: "#555", fontSize: 14 },
  loginLink: { color: "#1C1B18", fontSize: 14, fontWeight: "700" },
});
