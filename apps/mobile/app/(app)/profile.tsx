import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const me = useQuery(api.profiles.me);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const requestDeleteAccount = useMutation(api.profiles.requestDeleteAccount);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const setProfileImage = useMutation(api.profiles.setProfileImage);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    nickName: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    city: "",
    country: "",
    bio: "",
    website: "",
    instagram: "",
    facebook: "",
  });

  useEffect(() => {
    if (me) {
      setForm({
        nickName: me.nickName ?? "",
        firstName: me.firstName ?? "",
        lastName: me.lastName ?? "",
        phoneNumber: me.phoneNumber ?? "",
        city: me.city ?? "",
        country: me.country ?? "",
        bio: me.bio ?? "",
        website: me.website ?? "",
        instagram: me.instagram ?? "",
        facebook: me.facebook ?? "",
      });
    }
  }, [me?._id]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateProfile(form);
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to update your picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      setUploadingImage(true);
      const uploadUrl = await generateUploadUrl({});

      const asset = result.assets[0];
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
      });
      const { storageId } = JSON.parse(uploadResult.body);

      await setProfileImage({ storageId });
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Could not upload your picture.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will submit a request to delete your account. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: async () => {
            await requestDeleteAccount({});
            Alert.alert("Request Sent", "Your account deletion request has been submitted.");
          },
        },
      ]
    );
  }

  if (me === undefined) {
    return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#1C1B18" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage} activeOpacity={0.8}>
          {me?.profileImageUrl ? (
            <Image source={{ uri: me.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {me?.nickName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#F5EFE0" />
            ) : (
              <Ionicons name="camera" size={14} color="#F5EFE0" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </View>

      <Text style={styles.label}>Display Name</Text>
      <TextInput style={styles.input} value={form.nickName} onChangeText={(v) => set("nickName", v)} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>First Name</Text>
          <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => set("firstName", v)} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => set("lastName", v)} />
        </View>
      </View>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={form.phoneNumber}
        onChangeText={(v) => set("phoneNumber", v)}
        keyboardType="phone-pad"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={form.city} onChangeText={(v) => set("city", v)} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Country</Text>
          <TextInput style={styles.input} value={form.country} onChangeText={(v) => set("country", v)} />
        </View>
      </View>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.bio}
        onChangeText={(v) => set("bio", v)}
        multiline
      />

      <Text style={styles.label}>Website</Text>
      <TextInput style={styles.input} value={form.website} onChangeText={(v) => set("website", v)} autoCapitalize="none" />

      <Text style={styles.label}>Instagram</Text>
      <TextInput style={styles.input} value={form.instagram} onChangeText={(v) => set("instagram", v)} autoCapitalize="none" />

      <Text style={styles.label}>Facebook</Text>
      <TextInput style={styles.input} value={form.facebook} onChangeText={(v) => set("facebook", v)} autoCapitalize="none" />

      <TouchableOpacity style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#F5EFE0" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Text style={styles.deleteBtnText}>Request Account Deletion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  content: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#C9A227", fontSize: 32, fontWeight: "700" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C9A227",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f4f4f8",
  },
  avatarHint: { fontSize: 12, color: "#888", marginTop: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1C1B18",
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  saveBtn: {
    backgroundColor: "#1C1B18",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#C9A227", fontSize: 16, fontWeight: "700" },
  deleteBtn: { alignItems: "center", marginTop: 20, padding: 10 },
  deleteBtnText: { color: "#c0392b", fontSize: 14, fontWeight: "600" },
});
