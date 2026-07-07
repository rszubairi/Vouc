import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";

function CustomDrawerContent(props: any) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const me = useQuery(api.profiles.me);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      {/* Logo */}
      <Text style={styles.logo}>Vouch</Text>

      {/* Profile header */}
      <TouchableOpacity
        style={styles.profileHeader}
        onPress={() => {
          props.navigation.closeDrawer();
          router.push("/(app)/profile");
        }}
      >
        {me?.profileImageUrl ? (
          <Image source={{ uri: me.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {me?.nickName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{me?.nickName ?? "Loading..."}</Text>
          <Text style={styles.profileCity}>{me?.city ?? ""}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <DrawerItemList {...props} />

      <View style={styles.spacer} />

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          signOut();
          router.replace("/(auth)/login");
        }}
      >
        <Ionicons name="log-out-outline" size={16} color="#C9A227" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const drawerIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "newspaper-outline",
  divisions: "cube-outline",
  library: "book-outline",
  calendar: "calendar-outline",
  network: "people-outline",
  notifications: "notifications-outline",
  help: "help-circle-outline",
};

function drawerIcon(name: string) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={drawerIcons[name] ?? "help-circle-outline"} size={size} color={color} />
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingHorizontal: 12 }}
    >
      <Ionicons name="arrow-back" size={22} color="#C9A227" />
    </TouchableOpacity>
  );
}

const subScreenOptions = {
  headerLeft: () => <BackButton />,
  swipeEnabled: false,
  drawerItemStyle: { display: "none" as const },
};

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: "#1C1B18" },
          headerTintColor: "#C9A227",
          headerTitleStyle: { fontWeight: "700" },
          drawerActiveTintColor: "#C9A227",
          drawerActiveBackgroundColor: "#1C1B1815",
          drawerInactiveTintColor: "#1C1B18",
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Posts", drawerLabel: "Posts", drawerIcon: drawerIcon("index") }} />
        <Drawer.Screen name="divisions" options={{ title: "Products", drawerLabel: "Products", drawerIcon: drawerIcon("divisions") }} />
        <Drawer.Screen name="library" options={{ title: "Library", drawerLabel: "Library", drawerIcon: drawerIcon("library") }} />
        <Drawer.Screen name="calendar" options={{ title: "Calendar", drawerLabel: "Calendar", drawerIcon: drawerIcon("calendar") }} />
        <Drawer.Screen name="network" options={{ title: "My Network", drawerLabel: "My Network", drawerIcon: drawerIcon("network") }} />
        <Drawer.Screen name="notifications" options={{ title: "Notifications", drawerLabel: "Notifications", drawerIcon: drawerIcon("notifications") }} />
        <Drawer.Screen name="help" options={{ title: "Help Center", drawerLabel: "Help Center", drawerIcon: drawerIcon("help") }} />
        {/* Hidden from drawer — opened via navigation, with a back button instead of the drawer toggle */}
        <Drawer.Screen name="post/[id]" options={{ ...subScreenOptions, title: "Post" }} />
        <Drawer.Screen name="post/create" options={{ ...subScreenOptions, title: "Create Post" }} />
        <Drawer.Screen name="event/[id]" options={{ ...subScreenOptions, title: "Event" }} />
        <Drawer.Screen name="event/create" options={{ ...subScreenOptions, title: "Create Event" }} />
        <Drawer.Screen name="library/[id]" options={{ ...subScreenOptions, title: "Library Item" }} />
        <Drawer.Screen name="library/create" options={{ ...subScreenOptions, title: "Create Library Item" }} />
        <Drawer.Screen name="network/[id]" options={{ ...subScreenOptions, title: "Member Profile" }} />
        <Drawer.Screen name="profile" options={{ ...subScreenOptions, title: "My Profile" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: "#F5EFE0" },
  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#C9A227",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    backgroundColor: "#1C1B18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#C9A227", fontSize: 22, fontWeight: "700" },
  profileInfo: { marginLeft: 12, flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#1C1B18" },
  profileCity: { fontSize: 13, color: "#666" },
  divider: { height: 1, backgroundColor: "#C9A227", opacity: 0.2, marginHorizontal: 16, marginBottom: 8 },
  spacer: { flex: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    padding: 14,
    backgroundColor: "#1C1B18",
    borderRadius: 10,
  },
  logoutText: { color: "#F5EFE0", fontWeight: "700", fontSize: 15 },
});
