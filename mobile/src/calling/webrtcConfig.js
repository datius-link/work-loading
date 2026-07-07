// ICE server configuration for the WebRTC peer connection. STUN alone only
// gets two phones talking if their NAT type is forgiving (e.g. same WiFi, or
// simple home routers) — most mobile-carrier connections use symmetric NAT,
// which needs a TURN relay to actually connect. Metered's "openrelay" TURN
// servers are a free, publicly documented set of test credentials (used in
// most WebRTC tutorials) — fine for coursework/demo traffic, but they're
// shared and rate-limited, so swap in your own Metered/Twilio account for
// real production load.
export const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};
