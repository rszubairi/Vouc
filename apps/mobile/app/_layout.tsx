import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { OnboardingContext } from "../contexts/OnboardingContext";
import VouchSplashScreen from "../components/SplashScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const convex = new ConvexReactClient(
  Constants.expoConfig?.extra?.convexUrl || process.env.EXPO_PUBLIC_CONVEX_URL || ""
);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { hasSeenOnboarding, onboardingLoaded } = useContext(OnboardingContext);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !onboardingLoaded) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!hasSeenOnboarding) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isAuthenticated, isLoading, segments, hasSeenOnboarding, onboardingLoaded]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function init() {
      const val = await SecureStore.getItemAsync("hasSeenOnboarding");
      setHasSeenOnboarding(val === "true");
      setOnboardingLoaded(true);
      SplashScreen.hideAsync().catch(() => {});
    }
    init();
  }, []);

  const markComplete = useCallback(async () => {
    await SecureStore.setItemAsync("hasSeenOnboarding", "true");
    setHasSeenOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ hasSeenOnboarding, onboardingLoaded, markComplete }}>
      <ConvexAuthProvider client={convex} storage={secureStorage}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
        {showSplash && <VouchSplashScreen onFinish={() => setShowSplash(false)} />}
      </ConvexAuthProvider>
    </OnboardingContext.Provider>
  );
}
