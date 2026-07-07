import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useOnboarding } from "../contexts/OnboardingContext";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Welcome to Vouch",
    subtitle: "Your business network, all in one place. Connect, share, and grow together.",
    icon: "🌟",
  },
  {
    id: "2",
    title: "Share & Engage",
    subtitle: "Post updates to your network, like and endorse content, and join the conversation with comments.",
    icon: "💬",
  },
  {
    id: "3",
    title: "Grow Your Network",
    subtitle: "Manage your team, track events on the calendar, and stay on top of notifications.",
    icon: "🚀",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { markComplete } = useOnboarding();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  }

  async function handleGetStarted() {
    await markComplete();
    router.replace("/(auth)/login");
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.slideIcon}>{item.icon}</Text>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{isLast ? "Get Started" : "Next"}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={handleGetStarted} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1B18",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    marginBottom: 16,
  },
  slide: {
    width,
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  slideIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 32,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: "#ffffff",
    width: 24,
  },
  footer: {
    width: "100%",
    paddingHorizontal: 32,
    marginTop: 24,
    gap: 12,
  },
  nextBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#1C1B18",
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
});
