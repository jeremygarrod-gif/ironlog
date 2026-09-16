import { useCallback, useEffect, useRef, useState } from "react";

// Navigation for an installed web app.
//
// A PWA launched from the home screen has no browser chrome, so there is no
// back button and nothing driving browser history. This keeps a stack of routes
// and mirrors it into history.pushState, which gives us three things at once:
// the in-app back buttons, the iOS edge-swipe gesture, and the Android hardware
// back button all end up calling the same code path.

export function useNavStack(initial = { screen: "home" }) {
  const [stack, setStack] = useState([initial]);
  const lastPop = useRef(0);

  useEffect(() => {
    const onPop = () => {
      lastPop.current = Date.now();
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((screen, params = {}) => {
    setStack((s) => [...s, { screen, ...params }]);
    window.history.pushState({ ironlog: true }, "");
  }, []);

  const back = useCallback(() => {
    // Let history drive it so the stack and the browser stay in step
    setStack((s) => {
      if (s.length > 1) window.history.back();
      return s;
    });
  }, []);

  const home = useCallback(() => {
    setStack((s) => {
      const depth = s.length - 1;
      if (depth > 0) window.history.go(-depth);
      return s;
    });
  }, []);

  // Replace the whole stack without touching history — used after finishing a
  // session, where going "back" into the log screen would be wrong.
  const reset = useCallback(() => {
    setStack((s) => {
      const depth = s.length - 1;
      if (depth > 0) window.history.go(-depth);
      return s;
    });
  }, []);

  return { route: stack[stack.length - 1], depth: stack.length, go, back, home, reset, lastPop };
}

// Edge swipe, for the cases where iOS does not hand us its own gesture.
// Only fires from the very left edge, and never when the touch began inside
// something that scrolls sideways — the comparison tables, mainly.

export function useEdgeSwipeBack(onBack, lastPop) {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const inHorizontalScroller = (el) => {
      let node = el;
      while (node && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 4) return true;
        node = node.parentElement;
      }
      return false;
    };

    const onStart = (e) => {
      const t = e.touches[0];
      tracking = t.clientX <= 28 && !inHorizontalScroller(e.target);
      startX = t.clientX;
      startY = t.clientY;
    };

    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      // If iOS already ran its own back gesture, don't run a second one
      if (lastPop && Date.now() - lastPop.current < 500) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 80 && dy < 60) onBack();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onBack, lastPop]);
}
