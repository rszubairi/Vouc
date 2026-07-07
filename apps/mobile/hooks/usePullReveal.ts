import { useState } from "react";

// Search bars start hidden and are toggled via a header button. (A pull-down
// reveal gesture was tried first, but it competes with RefreshControl for the
// same overscroll gesture — on Android in particular, SwipeRefreshLayout
// captures the pull before the list ever reports a negative contentOffset,
// so the search bar never appeared.)
export function usePullReveal() {
  const [visible, setVisible] = useState(false);
  return { visible, toggle: () => setVisible((v) => !v) };
}
