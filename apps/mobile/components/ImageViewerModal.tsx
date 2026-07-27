import { useState } from "react";
import { Modal, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

export function ImageViewerModal({
  uri,
  visible,
  onClose,
}: {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!uri) return;
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to save this image.");
        return;
      }
      const fileName = uri.split("/").pop()?.split("?")[0] || `image-${Date.now()}.jpg`;
      const dest = `${FileSystem.cacheDirectory}${fileName}`;
      const { uri: localUri } = await FileSystem.downloadAsync(uri, dest);
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert("Saved", "Image saved to your photo library.");
    } catch {
      Alert.alert("Error", "Couldn't save this image. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal visible={visible && !!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.headerRow, Platform.OS === "ios" && styles.headerRowIOS]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDownload} disabled={downloading} hitSlop={10}>
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {uri && (
          <Image source={{ uri }} style={styles.image} contentFit="contain" transition={150} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    zIndex: 1,
  },
  headerRowIOS: { paddingTop: 56 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { flex: 1 },
});
