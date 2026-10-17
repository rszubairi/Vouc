import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FormField as Field, errorMessage } from "../components/FormField";

// Shown by AuthGate to a signed-in user whose account has no profile, e.g. an
// account left half-registered by an older app build. Once the profile is
// created, AuthGate sees the status change and moves them into the app.
export default function CompleteProfileScreen() {
  const { signOut } = useAuthActions();
  const createProfile = useMutation(api.profiles.create);

  const [nickName, setNickName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    let error: string | null = null;
    if (!nickName.trim()) error = "Nickname is required.";
    else if (!firstName.trim()) error = "First name is required.";
    else if (!lastName.trim()) error = "Last name is required.";
    else if (!sponsorEmail.trim()) error = "Referrer's email address is required.";
    else if (!city.trim()) error = "City is required.";
    else if (!country.trim()) error = "Country is required.";
    if (error) {
      Alert.alert("Validation", error);
      return;
    }

    try {
      setLoading(true);
      await createProfile({
        nickName: nickName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        sponsorEmailAddress: sponsorEmail.trim(),
        city: city.trim(),
        country: country.trim(),
      });
      Alert.alert(
        "Profile created",
        "Your account is pending referrer approval. You will be notified once approved."
      );
    } catch (err: any) {
      Alert.alert("Could not create profile", errorMessage(err));
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
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Your account was created, but your profile details are missing. Fill them in to
          continue.
        </Text>

        <Field label="Nickname *" value={nickName} onChangeText={setNickName} />
        <Field label="First Name *" value={firstName} onChangeText={setFirstName} />
        <Field label="Middle Name" value={middleName} onChangeText={setMiddleName} />
        <Field label="Last Name *" value={lastName} onChangeText={setLastName} />
        <Field
          label="Referrer's Email Address *"
          value={sponsorEmail}
          onChangeText={setSponsorEmail}
          keyboardType="email-address"
        />
        <Field label="City *" value={city} onChangeText={setCity} />
        <Field label="Country *" value={country} onChangeText={setCountry} />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signOut()} style={styles.signOutRow}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1B18",
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 24 },
  btn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  signOutRow: { alignItems: "center" },
  signOutText: { color: "#1C1B18", fontSize: 14, fontWeight: "700" },
});
