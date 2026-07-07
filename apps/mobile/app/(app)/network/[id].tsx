import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const SOCIAL_LINKS: {
  key: "website" | "instagram" | "facebook" | "twitter" | "tiktok";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "website", label: "Website", icon: "globe-outline" },
  { key: "instagram", label: "Instagram", icon: "logo-instagram" },
  { key: "facebook", label: "Facebook", icon: "logo-facebook" },
  { key: "twitter", label: "Twitter", icon: "logo-twitter" },
  { key: "tiktok", label: "TikTok", icon: "logo-tiktok" },
];

function formatMemberSince(creationTime: number) {
  return new Date(creationTime).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useQuery(api.profiles.getById, { profileId: id as Id<"profiles"> });

  if (profile === undefined) {
    return <ActivityIndicator style={styles.loader} size="large" color="#1C1B18" />;
  }
  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Member not found.</Text>
      </View>
    );
  }

  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const activeLinks = SOCIAL_LINKS.filter((s) => profile[s.key]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={["#1C1B18", "#2E2B24"]} style={styles.banner} />

      <View style={styles.avatarWrap}>
        {profile.profileImageUrl ? (
          <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {profile.nickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.identity}>
        <Text style={styles.name}>{profile.nickName}</Text>

        {location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#999" />
            <Text style={styles.subText}>{location}</Text>
          </View>
        ) : null}

        <View style={styles.sinceBadge}>
          <Ionicons name="ribbon-outline" size={13} color="#C9A227" />
          <Text style={styles.sinceBadgeText}>
            Member since {formatMemberSince(profile._creationTime)}
          </Text>
        </View>
      </View>

      {profile.bio ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.bio}>{profile.bio}</Text>
        </View>
      ) : null}

      {activeLinks.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Links</Text>
          {activeLinks.map((s, i) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.linkRow, i === activeLinks.length - 1 && styles.linkRowLast]}
              onPress={() => Linking.openURL(profile[s.key]!)}
            >
              <View style={styles.linkIconWrap}>
                <Ionicons name={s.icon} size={16} color="#C9A227" />
              </View>
              <Text style={styles.linkLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f8" },
  content: { paddingBottom: 60 },
  loader: { flex: 1, marginTop: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { height: 130, width: "100%" },
  avatarWrap: {
    alignItems: "center",
    marginTop: -56,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: "#f4f4f8",
  },
  avatarPlaceholder: { backgroundColor: "#1C1B18", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#C9A227", fontSize: 38, fontWeight: "700" },
  identity: { alignItems: "center", marginTop: 12, paddingHorizontal: 20 },
  name: { fontSize: 21, fontWeight: "800", color: "#1C1B18" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  subText: { fontSize: 14, color: "#777" },
  sinceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5EFE0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  sinceBadgeText: { fontSize: 12, color: "#8a6d1a", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#1C1B18", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  bio: { fontSize: 14, color: "#333", lineHeight: 21 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f8",
  },
  linkRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5EFE0",
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: { flex: 1, fontSize: 14, color: "#1C1B18", fontWeight: "600" },
});
