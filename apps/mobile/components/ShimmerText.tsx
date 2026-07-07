import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { COLORS, TIMING } from "./SplashConstants";

// Fixed footprint for the wordmark. A splash screen shows one short, known
// string, so a fixed box keeps the gradient/mask layers pixel-aligned
// without measuring text at runtime.
const BOX_WIDTH = 260;
const BOX_HEIGHT = 72;
const SHIMMER_BAND_WIDTH = 90;
const BLOOM_SIZE = 260;

type Props = {
  text: string;
  /** ms after mount to start the one-time reflective shimmer sweep. */
  shimmerDelay: number;
  /** ms after mount to start the looping "breathing" bloom behind the text. */
  glowDelay: number;
};

export default function ShimmerText({ text, shimmerDelay, glowDelay }: Props) {
  // Progress of the single shimmer pass across the text, -1 (fully left of
  // the box) to 2 (fully right of the box) so the band enters/exits clean.
  const shimmerProgress = useSharedValue(-1);
  // Breathing bloom intensity, looping 0 -> 1 -> 0 every ~2.5s.
  const glow = useSharedValue(0.4);

  useEffect(() => {
    // 5. Soft gold shimmer sweeps across the text once.
    shimmerProgress.value = withDelay(
      shimmerDelay,
      withTiming(2, { duration: TIMING.shimmer, easing: Easing.out(Easing.cubic) })
    );
  }, [shimmerDelay]);

  useEffect(() => {
    // 6. Slight breathing glow animation while waiting, pulsing every 2.5s.
    glow.value = withDelay(
      glowDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 1250, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [glowDelay]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [-1, 2],
      [-SHIMMER_BAND_WIDTH, BOX_WIDTH + SHIMMER_BAND_WIDTH]
    );
    return { transform: [{ translateX }] };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.6,
    transform: [{ scale: 1 + glow.value * 0.08 }],
  }));

  return (
    <View style={styles.wrapper}>
      {/* Soft bloom behind the wordmark, breathing gently and continuously */}
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
        <Svg width={BLOOM_SIZE} height={BLOOM_SIZE}>
          <Defs>
            <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.champagne} stopOpacity={0.5} />
              <Stop offset="60%" stopColor={COLORS.gold} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={BLOOM_SIZE / 2} cy={BLOOM_SIZE / 2} r={BLOOM_SIZE / 2} fill="url(#bloom)" />
        </Svg>
      </Animated.View>

      {/* Base metallic gold fill */}
      <MaskedView style={styles.box} maskElement={<Text style={styles.text}>{text}</Text>}>
        <LinearGradient
          colors={[COLORS.gold, COLORS.champagne, COLORS.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.box}
        />
      </MaskedView>

      {/* One-time reflective shimmer sweep, masked to the letterforms */}
      <MaskedView
        style={[styles.box, StyleSheet.absoluteFillObject]}
        maskElement={<Text style={styles.text}>{text}</Text>}
      >
        <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.9)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: BLOOM_SIZE,
    height: BLOOM_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  },
  text: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    lineHeight: BOX_HEIGHT,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 3,
    textAlign: "center",
    color: "#000",
    backgroundColor: "transparent",
  },
  shimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SHIMMER_BAND_WIDTH,
  },
});
