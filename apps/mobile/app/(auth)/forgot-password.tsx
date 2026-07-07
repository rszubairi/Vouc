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
import { useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";

type Step = "email" | "otp" | "newPassword";

export default function ForgotPasswordScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!email.trim()) {
      Alert.alert("Validation", "Please enter your email address.");
      return;
    }
    try {
      setLoading(true);
      await signIn("resend-otp", { email });
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) {
      Alert.alert("Validation", "Please enter the OTP code.");
      return;
    }
    setStep("newPassword");
  }

  async function handleResetPassword() {
    const pw = newPassword;
    if (pw.length < 8) { Alert.alert("Validation", "Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(pw)) { Alert.alert("Validation", "Must contain uppercase letter."); return; }
    if (!/[a-z]/.test(pw)) { Alert.alert("Validation", "Must contain lowercase letter."); return; }
    if (!/[0-9]/.test(pw)) { Alert.alert("Validation", "Must contain a digit."); return; }
    if (!/[^A-Za-z0-9]/.test(pw)) { Alert.alert("Validation", "Must contain a special character."); return; }

    try {
      setLoading(true);
      await signIn("resend-otp", { email, code: otp, newPassword });
      Alert.alert("Success", "Your password has been reset.", [
        { text: "Sign In", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to reset password.");
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
        <Text style={styles.title}>Reset Password</Text>

        {step === "email" && (
          <>
            <Text style={styles.desc}>
              Enter your email address and we'll send you a one-time code.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === "otp" && (
          <>
            <Text style={styles.desc}>Enter the code sent to {email}.</Text>
            <TextInput
              style={styles.input}
              placeholder="OTP code"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
            <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp}>
              <Text style={styles.btnText}>Verify Code</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "newPassword" && (
          <>
            <Text style={styles.desc}>Enter your new password.</Text>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#999"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", color: "#1C1B18", marginBottom: 12 },
  desc: { fontSize: 15, color: "#666", marginBottom: 24, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1C1B18",
    marginBottom: 14,
    backgroundColor: "#f9f9f9",
  },
  btn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  back: { alignItems: "center", marginTop: 8 },
  backText: { color: "#555", fontSize: 14 },
});
