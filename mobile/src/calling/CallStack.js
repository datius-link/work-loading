import React, { useEffect, useRef, useState } from "react";
import CallScreen from "./CallScreen";
import IncomingCallBanner from "./IncomingCallBanner";
import CallBubble from "./CallBubble";
import { useCall } from "./CallProvider";

// Owns *presentation* mode ('banner' | 'bubble' | 'fullscreen'), separate
// from CallProvider's call-session state — this is what makes "keep
// browsing the app during a call" possible: only 'fullscreen' renders
// inside a Modal (CallScreen manages that internally); banner and bubble
// are plain overlays that don't block touches to the rest of the app.
export default function CallStack() {
  const call = useCall();
  const [uiMode, setUiMode] = useState("fullscreen");
  const prevCallStateRef = useRef(call.callState);

  useEffect(() => {
    const prev = prevCallStateRef.current;
    const next = call.callState;
    if (prev === "idle" && next !== "idle") {
      // New call - reset to the natural default for how it started.
      setUiMode(next === "incoming" ? "banner" : "fullscreen");
    } else if (prev === "incoming" && next === "active" && uiMode === "banner") {
      // Answered straight from the banner's inline Accept button - the
      // banner has no "active call" representation, so hand off to the
      // full call screen rather than leaving nothing visible.
      setUiMode("fullscreen");
    }
    prevCallStateRef.current = next;
  }, [call.callState, uiMode]);

  return (
    <>
      {uiMode === "banner" ? (
        <IncomingCallBanner onExpand={() => setUiMode("fullscreen")} onAutoMinimize={() => setUiMode("bubble")} />
      ) : null}
      {uiMode === "bubble" ? <CallBubble onExpand={() => setUiMode("fullscreen")} /> : null}
      <CallScreen isFullscreenRequested={uiMode === "fullscreen"} onMinimize={() => setUiMode("bubble")} />
    </>
  );
}
