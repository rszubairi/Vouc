"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Best-effort attempt to hand off to the installed app via its custom
// scheme. If the app isn't installed this is a no-op (the OS just ignores
// the unknown scheme) and the visitor stays on this page to download it.
export function AppLinkOpener() {
  const searchParams = useSearchParams();
  const discussionId = searchParams.get("discussion");

  useEffect(() => {
    if (!discussionId) return;
    window.location.href = `oolala://discussion/${discussionId}`;
  }, [discussionId]);

  return null;
}
