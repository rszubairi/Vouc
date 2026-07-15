import { TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingHorizontal: 12 }}
    >
      <Ionicons name="arrow-back" size={22} color="#F2650C" />
    </TouchableOpacity>
  );
}

const subScreenOptions = {
  headerLeft: () => <BackButton />,
  headerStyle: { backgroundColor: "#1C1B18" },
  headerTintColor: "#F2650C",
  headerTitleStyle: { fontWeight: "700" as const },
};

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      {/* Pushed on top of the drawer's own stack, so back always returns to the actual previous screen. */}
      <Stack.Screen name="discussion/[id]" options={{ ...subScreenOptions, title: "Discussion" }} />
      <Stack.Screen name="discussion/create" options={{ ...subScreenOptions, title: "Start Discussion" }} />
      <Stack.Screen name="event/[id]" options={{ ...subScreenOptions, title: "Event" }} />
      <Stack.Screen name="event/create" options={{ ...subScreenOptions, title: "Create Event" }} />
      <Stack.Screen name="library/[id]" options={{ ...subScreenOptions, title: "Library Item" }} />
      <Stack.Screen name="library/create" options={{ ...subScreenOptions, title: "Create Library Item" }} />
      <Stack.Screen name="network/[id]" options={{ ...subScreenOptions, title: "Member Profile" }} />
      <Stack.Screen name="profile" options={{ ...subScreenOptions, title: "My Profile" }} />
    </Stack>
  );
}
