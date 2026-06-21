import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const paths = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  briefcase: "M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-10 0h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm3 0h6",
  "direct-hire": "M4 9h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 1-1.7V8a2 2 0 0 1 2-2h3V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1m-6 0h6M3 13h14m-9 0v2h4v-2m7-10v6m-3-3 3 3 3-3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  users: "M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8.5-1a3 3 0 1 0 0-6M3 21a5 5 0 0 1 10 0m2-2a4.5 4.5 0 0 1 6 2",
  bell: "M18 16H6l1.2-1.8V10a4.8 4.8 0 0 1 9.6 0v4.2L18 16zm-8 3h4",
  login: "M10 17l5-5-5-5m5 5H3m13-7h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3",
  plusUser: "M15 21a6 6 0 0 0-12 0m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 1v6m3-3h-6",
  shield: "M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z",
  mail: "M4 6h16v12H4z M4 7l8 6 8-6",
  message: "M21 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-5 3 1.7-5.2A7.5 7.5 0 1 1 21 11.5zM8 10h8M8 14h5",
  music: "M9 18V5l10-2v13M9 18a3 3 0 1 1-2-2.8A3 3 0 0 1 9 18zm10-2a3 3 0 1 1-2-2.8A3 3 0 0 1 19 16zM9 8l10-2",
  lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6z",
  key: "M14 7a4 4 0 1 0 2.8 6.8L19 16h2v2h-2v2h-2.2l-2.4-2.4A4 4 0 0 0 14 7zM7 11h0.01",
  arrowLeft: "M15 18l-6-6 6-6m-5.5 6H21",
  edit: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zm12-13 3 3",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4 2-1-2-4-2 1a8 8 0 0 0-2-1.2L15.6 4h-7.2L8 6.8A8 8 0 0 0 6 8L4 7l-2 4 2 1a8.4 8.4 0 0 0 0 2l-2 1 2 4 2-1a8 8 0 0 0 2 1.2l.4 2.8h7.2l.4-2.8A8 8 0 0 0 18 18l2 1 2-4-2-1a8.4 8.4 0 0 0 0-2z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrowRight: "M9 18l6-6-6-6m5.5 6H3",
  "chevron-right": "M9 18l6-6-6-6",
  trash: "M6 7h12m-10 0 1 14h6l1-14M10 7V5h4v2",
  history: "M4 12a8 8 0 1 0 2.3-5.7M4 5v5h5m3-3v6l4 2",
  help: "M12 18h0.01M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7",
  logout: "M14 17l5-5-5-5m5 5H8m3 7H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6",
  userSlash: "M4 4l16 16M12 12a4 4 0 0 0 2.8-6.8M9.2 5.2A4 4 0 0 0 12 12m-7 9a7 7 0 0 1 10.5-6",
  activity: "M4 13h4l2-6 4 12 2-6h4",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3z",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm-3 0-1 6 4-2 4 2-1-6",
  upload: "M12 17V5m0 0 4 4m-4-4-4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2",
  fileText: "M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6M9 8h2",
  "file-text": "M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6M9 8h2",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-4-9 2.5 2.5L16 9",
  "check-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-4-9 2.5 2.5L16 9",
  plusCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v8m-4-4h8",
  "plus-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v8m-4-4h8",
  trendingUp: "M4 17 10 11l4 4 6-8m0 0h-5m5 0v5",
  "trending-up": "M4 17 10 11l4 4 6-8m0 0h-5m5 0v5",
  moreHorizontal: "M5 12h0.01M12 12h0.01M19 12h0.01",
  "more-horizontal": "M5 12h0.01M12 12h0.01M19 12h0.01",
  posts: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5",
  tasks: "M5 7h2m3 0h9M5 12h2m3 0h9M5 17h2m3 0h9",
  dots: "M5 12h0.01M12 12h0.01M19 12h0.01",
  warning: "M12 4 21 20H3L12 4zm0 5v5m0 3h0.01",
  close: "M6 6l12 12M18 6 6 18",
  phone: "M7 4h4l1 5-2.5 1.5a12 12 0 0 0 4 4L15 12l5 1v4a2 2 0 0 1-2 2A14 14 0 0 1 5 6a2 2 0 0 1 2-2z",
  video: "M4 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4zm12 3 4-2v8l-4-2",
  play: "M8 5v14l11-7z",
  pause: "M8 5v14m8-14v14",
  volumeUp: "M4 10v4h4l5 4V6l-5 4H4zm12-1a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12",
  volumeOff: "M4 10v4h4l5 4V6l-5 4H4zm12 0 4 4m0-4-4 4",
  tag: "M4 12V5h7l9 9-7 7-9-9zm4-4h0.01",
  search: "M10.5 18a7.5 7.5 0 1 1 5.3-12.8 7.5 7.5 0 0 1-5.3 12.8zm5.3-2.2L21 21",
  mapPin: "M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  "map-pin": "M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  share: "M18 8a3 3 0 1 0-2.8-4M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12-2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.7 14.7l6.6-3.4M8.7 9.3l6.6 3.4",
  share2: "M12 5v10m0-10 4 4m-4-4-4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  chart: "M5 19V9m7 10V5m7 14v-7M3 19h18",
  comment: "M21 11.5C21 16.75 16.97 21 12 21C10.5 21 9.09 20.65 7.83 20L3 21L4.34 16.17C3.12 14.85 2.5 13.22 2.5 11.5C2.5 6.25 6.53 2 12 2C17.47 2 21 6.25 21 11.5Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.4 3.8-5.4 3.8-9S14.5 5.4 12 3m0 18c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3M3.6 9h16.8M3.6 15h16.8",
  calendar: "M7 3v4m10-4v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2",
  circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  thumbsUp: "M7 10v10H4V10h3zm3 10h7.2a2 2 0 0 0 2-1.7l1-6A2 2 0 0 0 18.2 10H15l.7-3.4A2.1 2.1 0 0 0 13.6 4L10 10v10z",
  "thumbs-up": "M7 10v10H4V10h3zm3 10h7.2a2 2 0 0 0 2-1.7l1-6A2 2 0 0 0 18.2 10H15l.7-3.4A2.1 2.1 0 0 0 13.6 4L10 10v10z",
  playCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8l6 4-6 4V8z",
  "play-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8l6 4-6 4V8z",
  uploadCloud: "M16 16l-4-4-4 4m4-4v9M20 16.5a4.5 4.5 0 0 0-2.4-8.3A6 6 0 0 0 6.2 10 4 4 0 0 0 7 18h1",
  "upload-cloud": "M16 16l-4-4-4 4m4-4v9M20 16.5a4.5 4.5 0 0 0-2.4-8.3A6 6 0 0 0 6.2 10 4 4 0 0 0 7 18h1",
  heart: "M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z",
  moon: "M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z",
  send: "M20.8 12H10.1M3 8h2.5M4 12h1.5M4.5 16h1M10 12.5l-.9 3c-.3 1.1.4 1.7 1.4 1.2l8.6-4.3c.9-.5.9-1.3 0-1.8L10.5 6.3c-1-.5-1.7.1-1.4 1.2l.9 3c.1.4.1.6 0 1Z",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m0-12.8L4.2 4.2m15.6 15.6-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};

function SocialIcon({ name, size, color, strokeWidth }) {
  if (name === "instagram") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="4" width="16" height="16" rx="5" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="12" cy="12" r="3.6" stroke={color} strokeWidth={strokeWidth} />
        <Circle cx="16.8" cy="7.2" r="1" fill={color} />
      </Svg>
    );
  }

  if (name === "facebook") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.4V5a18 18 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9V11H8v3h2.4v7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === "twitter" || name === "x") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 4h4.2l10 16H15L5 4Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M19 4 5 20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "linkedin") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="4" width="16" height="16" rx="2.5" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M8 10v7M12 17v-4c0-1.8 1.1-3 2.8-3S18 11.2 18 13.5V17M12 10v1.2M8 7.3h.01" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === "youtube") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3.5" y="7" width="17" height="10" rx="3" stroke={color} strokeWidth={strokeWidth} />
        <Path d="m10.5 10 4 2-4 2v-4Z" fill={color} />
      </Svg>
    );
  }

  if (name === "tiktok") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14 4v10.2a4 4 0 1 1-4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d="M14 5.5c1.1 2.4 2.7 3.7 5 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "github") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.6-.2.6-.5v-1.8c-2.5.5-3-1.1-3-1.1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.2-2-.2-4.1-1-4.1-4.2 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .8-.2 2.4.9.7-.2 1.4-.3 2.1-.3s1.4.1 2.1.3c1.6-1.1 2.4-.9 2.4-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.2-2.1 4-4.1 4.2.3.3.6.8.6 1.6v2.6c0 .3.2.6.6.5A8.5 8.5 0 0 0 12 3.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === "threads") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18.5 10.8c-.5-4-2.8-6.3-6.5-6.3-4.3 0-7 3-7 7.5s2.8 7.5 7.2 7.5c3.4 0 5.8-1.8 6.4-4.6.5-2.6-1.1-4.4-4.5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d="M14.8 13.6c-.3 1.2-1.2 2-2.6 2-1.5 0-2.6-.9-2.6-2.2s1.1-2.2 2.7-2.2c1.2 0 2.5.4 4.1 1.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === "snapchat") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 4c2.4 0 4 1.8 4 4.5v2c0 .9 1.5 1.3 2.4 1.6-.4 1.1-1.3 1.7-2.4 2.1.1 1.4 1.1 2.2 2 2.8-1 .6-2 .7-3.1.6-.8 1.2-1.7 1.9-2.9 1.9s-2.1-.7-2.9-1.9c-1.1.1-2.1 0-3.1-.6.9-.6 1.9-1.4 2-2.8-1.1-.4-2-1-2.4-2.1.9-.3 2.4-.7 2.4-1.6v-2C8 5.8 9.6 4 12 4Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return null;
}

export default function AppIcon({
  name,
  size = 22,
  color = "#0F172A",
  strokeWidth = 2,
  filled = false,
}) {
  const social = SocialIcon({ name, size, color, strokeWidth });
  if (social) return social;

  if (name === "logo") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" fill={color} opacity="0.14" />
        <Path
          d="M7 13.5h10M8.5 10h7M9 16.5h5.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "check" ? (
        <Path
          d="M5 12.5 10 17l9-10"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : name === "image" ? (
        <>
          <Rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Circle cx="9" cy="10" r="1.5" fill={color} />
          <Path
            d="M5 17l4.5-4 3 3 2.5-2.5L19 17"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <Path
          d={paths[name] || paths.user}
          fill={filled ? color : "none"}
          stroke={filled ? "none" : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
