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

export default function LoginScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      await signIn("password", { email, password, flow: "signIn" });
      // AuthGate in _layout.tsx will redirect to (app)
    } catch (err: any) {
      Alert.alert("Login failed", err.message ?? "Invalid credentials.");
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
        <Text style={styles.logo}>Vouch</Text>
        <Text style={styles.tagline}>Your network. Your future.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
          >
            <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.registerRow}>
          <Text style={styles.registerLabel}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: "#1C1B18",
    textAlign: "center",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
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
  passwordRow: {
    position: "relative",
    marginBottom: 14,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkBtn: { alignItems: "center", marginBottom: 20 },
  linkText: { color: "#555", fontSize: 14 },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  registerLabel: { color: "#555", fontSize: 14 },
  registerLink: { color: "#1C1B18", fontSize: 14, fontWeight: "700" },
});
