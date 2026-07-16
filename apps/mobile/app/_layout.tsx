import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { OnboardingContext } from "../contexts/OnboardingContext";
import { api } from "../../../convex/_generated/api";

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
  const { signOut } = useAuthActions();
  const segments = useSegments();
  const router = useRouter();

  // Reactive: fires again the moment an admin disables this account, even
  // mid-session, since Convex queries re-run on the server-side change.
  const accountStatus = useQuery(api.profiles.myAccountStatus, isAuthenticated ? {} : "skip");
  const handledDisabled = useRef(false);

  useEffect(() => {
    if (isAuthenticated && accountStatus === "disabled" && !handledDisabled.current) {
      handledDisabled.current = true;
      signOut();
      Alert.alert(
        "Account disabled",
        "Your account has been disabled. Contact support if you believe this is a mistake."
      );
    } else if (!isAuthenticated) {
      handledDisabled.current = false;
    }
  }, [isAuthenticated, accountStatus, signOut]);

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
      </ConvexAuthProvider>
    </OnboardingContext.Provider>
  );
}
