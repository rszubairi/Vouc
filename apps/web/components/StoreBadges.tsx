"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faGooglePlay } from "@fortawesome/free-brands-svg-icons";

const APK_URL =
  "https://github.com/rszubairi/Vouc/releases/download/release/vouch.apk";

// The app isn't on the App Store / Play Store yet, so these link directly
// to the GitHub release artifacts. iOS installs via an OTA manifest
// (see public/manifest.plist) since a bare .ipa link can't be installed
// on-device; Android downloads the .apk directly.
export function StoreBadges({ className = "" }: { className?: string }) {
  function getManifestUrl() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `itms-services://?action=download-manifest&url=${encodeURIComponent(
      `${origin}/manifest.plist`
    )}`;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.location.href = getManifestUrl();
        }}
        title="Install on iOS"
        className="flex items-center gap-2 bg-black/80 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/10 transition-colors"
      >
        <FontAwesomeIcon icon={faApple} className="w-5 h-5" />
        <span className="text-left leading-tight">
          <span className="block text-[9px] text-white/60">Download on the</span>
          <span className="block text-sm font-semibold -mt-0.5">App Store</span>
        </span>
      </a>
      <a
        href={APK_URL}
        title="Download for Android"
        className="flex items-center gap-2 bg-black/80 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/10 transition-colors"
      >
        <FontAwesomeIcon icon={faGooglePlay} className="w-4.5 h-4.5" />
        <span className="text-left leading-tight">
          <span className="block text-[9px] text-white/60">GET IT ON</span>
          <span className="block text-sm font-semibold -mt-0.5">Google Play</span>
        </span>
      </a>
    </div>
  );
}
