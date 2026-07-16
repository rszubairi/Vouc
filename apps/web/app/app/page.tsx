import { Suspense } from "react";
import { StoreBadges } from "../../components/StoreBadges";
import { AppLinkOpener } from "./AppLinkOpener";

export const metadata = { title: "Get the Vouch App" };

export default function AppDownloadPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white to-[#FBF6E9] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift-a absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#F2650C]/20 blur-3xl" />
        <div className="animate-drift-b absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#F5EFE0] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm bg-[#F5EFE0] border border-black/10 rounded-xl p-8 shadow-xl text-center">
        <h1 className="text-2xl font-bold text-black mb-2">Get Vouch</h1>
        <Suspense fallback={null}>
          <AppLinkOpener />
        </Suspense>
        <p className="text-sm text-gray-600 mb-6">
          Someone shared a discussion with you on Vouch. Install the app to
          view it — if you already have Vouch installed, it should have
          opened automatically.
        </p>
        <div className="flex justify-center">
          <StoreBadges />
        </div>
      </div>
    </div>
  );
}
