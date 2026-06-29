import { Text, StyleSheet } from "react-native";

export function formatCommentTime(createdAt) {
  if (!createdAt) return "now";

  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;

  if (diffMs < 60_000) return "now";

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const TOKEN_REGEX = /([@#])([a-zA-Z0-9_]+)/g;

export function MentionText({
  text,
  mentions = [],
  onMentionPress,
  onHashtagPress,
  style,
  mentionStyle,
  hashtagStyle,
  numberOfLines,
  ellipsizeMode,
}) {
  if (!text) return null;

  const mentionMap = new Map(
    (mentions || []).map((m) => [String(m.username).toLowerCase(), m])
  );

  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(TOKEN_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    const [, prefix, value] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    parts.push({ type: prefix === "@" ? "mention" : "hashtag", value });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <Text key={`t-${index}`}>{part.value}</Text>;
        }

        if (part.type === "hashtag") {
          return (
            <Text
              key={`h-${index}`}
              style={[style, hashtagStyle || mentionStyle]}
              onPress={() => onHashtagPress?.(part.value)}
            >
              #{part.value}
            </Text>
          );
        }

        const mention = mentionMap.get(part.value.toLowerCase());

        return (
          <Text
            key={`m-${index}`}
            style={[style, mentionStyle]}
            onPress={() => onMentionPress?.(part.value, mention)}
          >
            @{part.value}
          </Text>
        );
      })}
    </Text>
  );
}

export function CommentBody(props) {
  return (
    <MentionText
      {...props}
      style={[styles.commentText, props.style]}
      mentionStyle={[styles.mention, props.mentionStyle]}
      hashtagStyle={[styles.mention, props.hashtagStyle || props.mentionStyle]}
    />
  );
}

export function getGridMediaUri(media) {
  if (!media) return null;
  if (media.type === "video") {
    return media.thumbnail || media.poster || media.url || null;
  }
  return media.url || null;
}

// Move styles inside component or make dynamic
const styles = StyleSheet.create({
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mention: {
    fontWeight: "800",
  },
});
