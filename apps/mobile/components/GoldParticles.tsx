import { useMemo, useEffect, memo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { COLORS } from "./SplashConstants";

type Particle = {
  id: number;
  left: number; // horizontal position, in %
  size: number; // diameter in px
  travel: number; // upward distance travelled per loop, in px
  duration: number; // ms per loop
  delay: number; // ms before this particle starts its first loop
  amplitude: number; // horizontal sway distance, in px
  maxOpacity: number; // peak opacity reached mid-flight
};

const PARTICLE_COUNT = 22;

function GoldDustParticle({ particle }: { particle: Particle }) {
  // 0 -> 1 drives one full upward drift; looped forever, each particle
  // running on its own randomized speed/delay so the field never feels mechanical.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1, { duration: particle.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [0, 1], [0, -particle.travel]);
    // gentle side-to-side sway so the drift doesn't read as a straight line
    const translateX = Math.sin(progress.value * Math.PI * 2) * particle.amplitude;
    // fade in on the way up, fade out before the loop resets, so the reset is invisible
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.85, 1],
      [0, particle.maxOpacity, particle.maxOpacity, 0]
    );

    return { opacity, transform: [{ translateY }, { translateX }] };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${particle.left}%`,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
        },
        style,
      ]}
    />
  );
}

type Props = {
  /** Drives the fade-in of the whole particle field (controlled by SplashScreen). */
  containerOpacity: SharedValue<number>;
  count?: number;
};

function GoldParticles({ containerOpacity, count = PARTICLE_COUNT }: Props) {
  // Randomized once per mount — never re-rolled on re-render.
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        travel: 220 + Math.random() * 260,
        duration: 6000 + Math.random() * 6000,
        delay: Math.random() * 4000,
        amplitude: 6 + Math.random() * 14,
        maxOpacity: 0.25 + Math.random() * 0.35,
      })),
    [count]
  );

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, containerStyle]}>
      {particles.map((particle) => (
        <GoldDustParticle key={particle.id} particle={particle} />
      ))}
    </Animated.View>
  );
}

export default memo(GoldParticles);

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    bottom: -20,
    backgroundColor: COLORS.champagne,
  },
});
