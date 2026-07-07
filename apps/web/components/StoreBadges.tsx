"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faGooglePlay } from "@fortawesome/free-brands-svg-icons";

// Placeholder store badges. Replace `href="#"` with the real listing URLs
// once the app is published to the App Store / Google Play.
export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        title="Coming soon"
        className="flex items-center gap-2 bg-black/80 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/10 transition-colors cursor-not-allowed"
      >
        <FontAwesomeIcon icon={faApple} className="w-5 h-5" />
        <span className="text-left leading-tight">
          <span className="block text-[9px] text-white/60">Download on the</span>
          <span className="block text-sm font-semibold -mt-0.5">App Store</span>
        </span>
      </a>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        title="Coming soon"
        className="flex items-center gap-2 bg-black/80 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/10 transition-colors cursor-not-allowed"
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
