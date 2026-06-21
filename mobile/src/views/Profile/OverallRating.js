import React from "react";
import { StyleSheet, Text, View } from "react-native";

import AppIcon from "../../icons/AppIcon";

const GOLD = "#F5B301";

export default function OverallRating({ value, count, theme, textColor, mutedColor, compact = false }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const filledStars = Math.round(rating);

  return (
    <View style={styles.wrap}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <AppIcon key={star} name="star" size={compact ? 15 : 22} color={GOLD} filled={star <= filledStars} />
        ))}
      </View>
      <Text style={[styles.value, compact && styles.valueCompact, { color: textColor || theme.colors.text }]}>{rating.toFixed(1)}</Text>
      {Number(count) > 0 ? (
        <Text style={[styles.count, { color: mutedColor || theme.colors.textMuted }]}>({Number(count)})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stars: { flexDirection: "row", alignItems: "center", gap: 2 },
  value: { marginLeft: 4, fontSize: 15, fontWeight: "900" },
  valueCompact: { fontSize: 13, marginLeft: 2 },
  count: { fontSize: 12, fontWeight: "700" },
});
