import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const paths = {
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  briefcase: "M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-10 0h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm3 0h6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  users: "M8 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8.5-1a3 3 0 1 0 0-6M3 21a5 5 0 0 1 10 0m2-2a4.5 4.5 0 0 1 6 2",
  bell: "M18 16H6l1.2-1.8V10a4.8 4.8 0 0 1 9.6 0v4.2L18 16zm-8 3h4",
  login: "M10 17l5-5-5-5m5 5H3m13-7h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3",
  plusUser: "M15 21a6 6 0 0 0-12 0m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 1v6m3-3h-6",
  shield: "M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z",
  mail: "M4 6h16v12H4z M4 7l8 6 8-6",
  lock: "M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6z",
  key: "M14 7a4 4 0 1 0 2.8 6.8L19 16h2v2h-2v2h-2.2l-2.4-2.4A4 4 0 0 0 14 7zM7 11h0.01",
  arrowLeft: "M15 18l-6-6 6-6m-5.5 6H21",
  edit: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zm12-13 3 3",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4 2-1-2-4-2 1a8 8 0 0 0-2-1.2L15.6 4h-7.2L8 6.8A8 8 0 0 0 6 8L4 7l-2 4 2 1a8.4 8.4 0 0 0 0 2l-2 1 2 4 2-1a8 8 0 0 0 2 1.2l.4 2.8h7.2l.4-2.8A8 8 0 0 0 18 18l2 1 2-4-2-1a8.4 8.4 0 0 0 0-2z",
  plus: "M12 5v14M5 12h14",
  arrowRight: "M9 18l6-6-6-6m5.5 6H3",
  trash: "M6 7h12m-10 0 1 14h6l1-14M10 7V5h4v2",
  history: "M4 12a8 8 0 1 0 2.3-5.7M4 5v5h5m3-3v6l4 2",
  help: "M12 18h0.01M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.7 1.3-1.7 2.7",
  logout: "M14 17l5-5-5-5m5 5H8m3 7H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6",
  userSlash: "M4 4l16 16M12 12a4 4 0 0 0 2.8-6.8M9.2 5.2A4 4 0 0 0 12 12m-7 9a7 7 0 0 1 10.5-6",
  activity: "M4 13h4l2-6 4 12 2-6h4",
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
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  share: "M18 8a3 3 0 1 0-2.8-4M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12-2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.7 14.7l6.6-3.4M8.7 9.3l6.6 3.4",
  chart: "M5 19V9m7 10V5m7 14v-7M3 19h18",
  comment: "M21 11.5C21 16.75 16.97 21 12 21C10.5 21 9.09 20.65 7.83 20L3 21L4.34 16.17C3.12 14.85 2.5 13.22 2.5 11.5C2.5 6.25 6.53 2 12 2C17.47 2 21 6.25 21 11.5Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.4 3.8-5.4 3.8-9S14.5 5.4 12 3m0 18c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3M3.6 9h16.8M3.6 15h16.8",
  heart: "M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z",
  moon: "M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z",
  send: "M20.8 12H10.1M3 8h2.5M4 12h1.5M4.5 16h1M10 12.5l-.9 3c-.3 1.1.4 1.7 1.4 1.2l8.6-4.3c.9-.5.9-1.3 0-1.8L10.5 6.3c-1-.5-1.7.1-1.4 1.2l.9 3c.1.4.1.6 0 1Z",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m0-12.8L4.2 4.2m15.6 15.6-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};

export default function AppIcon({
  name,
  size = 22,
  color = "#0F172A",
  strokeWidth = 2,
  filled = false,
}) {
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
