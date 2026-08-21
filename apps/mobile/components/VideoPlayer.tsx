import { useState } from "react";
import { Platform, View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { WebView } from "react-native-webview";

// YouTube's embed player blocks requests whose user agent doesn't look like a real
// mobile browser, which react-native-webview's default UA does not. Spoofing a
// standard Safari/Chrome UA avoids the "Video unavailable" (error 152) rejection.
const YOUTUBE_USER_AGENT = Platform.select({
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  default: undefined,
});

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

// A bare top-level navigation to youtube.com/embed/... makes YouTube think the page
// isn't actually embedded (error 153, "video player configuration error"), so the
// request has to originate from an iframe on a real page. youtube-nocookie.com is used
// instead of youtube.com to skip the consent.youtube.com cookie-consent redirect, which
// WebView's stricter cookie/navigation handling can otherwise break.
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
          src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&origin=https://www.youtube-nocookie.com"
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
    ? { html: youtubeEmbedHtml(youtubeVideoId), baseUrl: "https://www.youtube-nocookie.com" }
    : { uri: url };

  return (
    <View style={styles.container}>
      <WebView
        source={source}
        style={styles.webview}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        userAgent={youtubeVideoId ? YOUTUBE_USER_AGENT : undefined}
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        originWhitelist={["*"]}
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
