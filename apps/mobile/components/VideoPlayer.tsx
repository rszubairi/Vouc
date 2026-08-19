import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { WebView } from "react-native-webview";

function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.pathname === "/watch" ? parsed.searchParams.get("v") : parsed.pathname.split("/").pop();
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (host === "youtu.be") {
      const videoId = parsed.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    // not a parseable URL — fall through to loading it as-is
  }
  return url;
}

export function VideoPlayer({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const embedUrl = toEmbedUrl(url);

  if (failed) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text style={styles.fallbackLink} numberOfLines={1}>
          Video: {url}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  fallbackLink: {
    color: "#1C1B18",
    textDecorationLine: "underline",
  },
});
