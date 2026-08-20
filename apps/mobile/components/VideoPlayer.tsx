import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { WebView } from "react-native-webview";

function toYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      return parsed.pathname === "/watch" ? parsed.searchParams.get("v") : parsed.pathname.split("/").pop() ?? null;
    }
    if (host === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    // not a parseable URL
  }
  return null;
}

// YouTube's embed player rejects requests without a matching document origin when
// loaded directly as a WebView `uri`, surfacing "Video player configuration error".
// Wrapping it in an HTML page with a real origin/referrer avoids that check.
function youtubeEmbedHtml(videoId: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <style>html,body{margin:0;padding:0;background:#000;height:100%;}iframe{width:100%;height:100%;border:0;}</style>
      </head>
      <body>
        <iframe
          src="https://www.youtube.com/embed/${videoId}?playsinline=1"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;
}

export function VideoPlayer({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const youtubeVideoId = toYoutubeVideoId(url);

  if (failed) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text style={styles.fallbackLink} numberOfLines={1}>
          Video: {url}
        </Text>
      </TouchableOpacity>
    );
  }

  const source = youtubeVideoId
    ? { html: youtubeEmbedHtml(youtubeVideoId), baseUrl: "https://www.youtube.com" }
    : { uri: url };

  return (
    <View style={styles.container}>
      <WebView
        source={source}
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
