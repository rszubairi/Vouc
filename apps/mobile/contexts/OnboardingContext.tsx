import { createContext, useContext } from "react";

type OnboardingContextType = {
  hasSeenOnboarding: boolean;
  onboardingLoaded: boolean;
  markComplete: () => Promise<void>;
};

export const OnboardingContext = createContext<OnboardingContextType>({
  hasSeenOnboarding: false,
  onboardingLoaded: false,
  markComplete: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);
