import { useLayoutEffect } from "react";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Puts a search toggle icon in the screen's navigation bar (top right).
export function useHeaderSearchButton(visible: boolean, toggle: () => void) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={toggle} hitSlop={10} style={{ paddingHorizontal: 12 }}>
          <Ionicons name={visible ? "close" : "search-outline"} size={22} color="#F2650C" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, visible, toggle]);
}
