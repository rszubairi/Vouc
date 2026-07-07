import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Rect, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GoldParticles from "./GoldParticles";
import ShimmerText from "./ShimmerText";
import { COLORS, TIMING } from "./SplashConstants";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const GRAIN_DOT_COUNT = 140;

// Static film-grain texture: a handful of near-invisible dots rendered once.
// No animation needed — it only exists so the black background doesn't read
// as a flat, dead color.
function NoiseOverlay() {
  const dots = useMemo(
    () =>
      Array.from({ length: GRAIN_DOT_COUNT }, () => ({
        x: Math.random() * SCREEN_W,
        y: Math.random() * SCREEN_H,
        r: Math.random() * 0.8 + 0.3,
        o: Math.random() * 0.035 + 0.015,
      })),
    []
  );

  return (
    <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((dot, i) => (
        <Circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill="#FFFFFF" opacity={dot.o} />
      ))}
    </Svg>
  );
}

type Props = {
  onFinish: () => void;
};

/**
 * Premium animated splash screen for Vouch.
 *
 * Timeline (from mount):
 *  1. Background fades in                         [0        -> bgFade]
 *  2. Gold dust particles fade in                  [~150     -> +bgFade+200]
 *  3+4. "Vouch" fades in, slides up 20px, scales up [textStart -> +textAnim]
 *  5. One-time metallic shimmer sweeps the text     [textStart+textAnim -> +shimmer]
 *  6. Breathing bloom loops behind the text         [textStart -> exit start]
 *  7. Whole screen holds, then fades out            [textStart+textAnim+hold -> +exit] -> onFinish
 */
export default function SplashScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();

  const bgOpacity = useSharedValue(0);
  const particlesOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const textScale = useSharedValue(0.92);
  const vignettePulse = useSharedValue(0);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Background fades in.
    bgOpacity.value = withTiming(1, {
      duration: TIMING.bgFade,
      easing: Easing.out(Easing.quad),
    });

    // 2. Gold particles slowly appear, staggered slightly behind the background.
    particlesOpacity.value = withDelay(
      150,
      withTiming(1, { duration: TIMING.bgFade + 200, easing: Easing.out(Easing.quad) })
    );

    // 3. "Vouch" fades in while moving upward ~20px.
    textOpacity.value = withDelay(
      TIMING.textStart,
      withTiming(1, { duration: TIMING.textAnim, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      TIMING.textStart,
      withTiming(0, { duration: TIMING.textAnim, easing: Easing.out(Easing.cubic) })
    );
    // 4. Text scales from 0.92 -> 1.0, with a very light overshoot for a premium "settle".
    textScale.value = withDelay(
      TIMING.textStart,
      withTiming(1, { duration: TIMING.textAnim, easing: Easing.out(Easing.back(1.4)) })
    );

    // Ultra-subtle animated vignette, breathing independently of the text glow.
    vignettePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // 7. After the entrance completes and holds, fade the whole splash out.
    const exitDelay = TIMING.textStart + TIMING.textAnim + TIMING.hold;
    rootOpacity.value = withDelay(
      exitDelay,
      withTiming(
        0,
        { duration: TIMING.exit, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        }
      )
    );
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const textWrapperStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }, { scale: textScale.value }],
  }));
  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + vignettePulse.value * 0.08,
  }));

  return (
    // No pointerEvents override here: the splash should block touches to the
    // app underneath for as long as it's visible, fading away with the opacity.
    <Animated.View style={[styles.root, rootStyle]}>
      {/* 1. Deep matte black background with soft ambient gold lighting */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <View style={[StyleSheet.absoluteFill, styles.base]} />
        <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="ambient" cx="50%" cy="42%" r="55%">
              <Stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.16} />
              <Stop offset="55%" stopColor={COLORS.gold} stopOpacity={0.05} />
              <Stop offset="100%" stopColor={COLORS.black} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={SCREEN_W} height={SCREEN_H} fill="url(#ambient)" />
        </Svg>
        <NoiseOverlay />
      </Animated.View>

      {/* Gold dust drifting upward at varying speeds */}
      <GoldParticles containerOpacity={particlesOpacity} />

      {/* Centered wordmark */}
      <View style={[styles.center, { paddingBottom: insets.bottom }]}>
        <Animated.View style={textWrapperStyle}>
          <ShimmerText
            text="Vouch"
            shimmerDelay={TIMING.textStart + TIMING.textAnim}
            glowDelay={TIMING.textStart}
          />
        </Animated.View>
      </View>

      {/* Ultra-subtle animated vignette around the screen edges */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, vignetteStyle]}>
        <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="vignette" cx="50%" cy="50%" r="72%">
              <Stop offset="55%" stopColor={COLORS.black} stopOpacity={0} />
              <Stop offset="100%" stopColor={COLORS.black} stopOpacity={0.85} />
            </RadialGradient>
          </Defs>
          <Rect width={SCREEN_W} height={SCREEN_H} fill="url(#vignette)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  base: {
    backgroundColor: COLORS.black,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
