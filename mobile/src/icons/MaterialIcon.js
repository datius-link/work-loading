import React from "react";
import AppIcon from "./AppIcon";

const iconMap = {
  "alternate-email": "mail",
  "arrow-forward": "arrowRight",
  "category": "briefcase",
  "check-circle": "check",
  "chevron-left": "arrowLeft",
  "close": "close",
  "cloud-upload": "image",
  "collections": "image",
  "error": "warning",
  "info": "help",
  "pause-circle-filled": "pause",
  "person": "user",
  "photo-library": "image",
  "play-circle-filled": "play",
  "play-circle-outline": "play",
  "tag": "tag",
  "videocam": "video",
  "volume-off": "volumeOff",
  "volume-up": "volumeUp",
};

export default function MaterialIcon({ name, size, color, ...props }) {
  return (
    <AppIcon
      name={iconMap[name] || name}
      size={size}
      color={color}
      {...props}
    />
  );
}
