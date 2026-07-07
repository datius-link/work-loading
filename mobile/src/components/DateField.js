import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../icons/AppIcon";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_LABELS_SW = ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"];

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday
  const cells = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  return cells;
}

/**
 * A real, tappable date input — no native dependency (avoids needing an EAS
 * rebuild just for a calendar), just a compact month-grid popover matching
 * the app's own visual language. `value`/`onChange` use plain "YYYY-MM-DD"
 * strings, same as the rest of this codebase's date handling.
 */
export default function DateField({ value, onChange, theme, language, placeholder, allowPast = false }) {
  const [open, setOpen] = useState(false);
  const initialMonth = value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
  const [viewMonth, setViewMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const styles = useMemo(() => createStyles(theme), [theme]);
  const monthLabels = language === "sw" ? MONTH_LABELS_SW : MONTH_LABELS_EN;

  const today = startOfDay(new Date());
  const selected = value && !Number.isNaN(new Date(value).getTime()) ? startOfDay(new Date(value)) : null;
  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goPrevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const displayValue = selected
    ? selected.toLocaleDateString(language === "sw" ? "sw-TZ" : undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : placeholder || (language === "sw" ? "Chagua tarehe" : "Choose a date");

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.field} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <AppIcon name="calendar" size={18} color={theme.colors.primary} />
        <Text style={[styles.fieldText, !selected && styles.fieldPlaceholder]} numberOfLines={1}>
          {displayValue}
        </Text>
        <AppIcon name={open ? "chevron-right" : "chevron-right"} size={14} color={theme.colors.textMuted} strokeWidth={2.5} />
      </TouchableOpacity>

      {open ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="arrowLeft" size={16} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.panelMonth}>
              {monthLabels[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppIcon name="arrowRight" size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={`${label}-${i}`} style={styles.weekdayText}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cellDate, i) => {
              if (!cellDate) return <View key={`blank-${i}`} style={styles.dayCell} />;
              const disabled = !allowPast && startOfDay(cellDate) < today;
              const isSelected = selected && startOfDay(cellDate).getTime() === selected.getTime();
              const isToday = startOfDay(cellDate).getTime() === today.getTime();
              return (
                <TouchableOpacity
                  key={cellDate.toISOString()}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  disabled={disabled}
                  onPress={() => {
                    onChange?.(toIsoDate(cellDate));
                    setOpen(false);
                  }}
                >
                  <View style={[styles.dayBubble, isSelected && styles.dayBubbleSelected]}>
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                      ]}
                    >
                      {cellDate.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    wrap: { marginBottom: 12 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.xs,
      paddingHorizontal: 14,
      minHeight: 54,
    },
    fieldText: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: "700" },
    fieldPlaceholder: { color: theme.colors.textVeryMuted, fontWeight: "500" },
    panel: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.surface,
      padding: 12,
    },
    panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    navBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceSoft },
    panelMonth: { fontSize: 14, fontWeight: "900", color: theme.colors.text },
    weekdayRow: { flexDirection: "row" },
    weekdayText: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: theme.colors.textMuted },
    grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    dayBubble: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    dayBubbleSelected: { backgroundColor: theme.colors.primary },
    dayText: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
    dayTextDisabled: { color: theme.colors.textVeryMuted, opacity: 0.4 },
    dayTextSelected: { color: theme.colors.onPrimary },
    dayTextToday: { color: theme.colors.primary, fontWeight: "900" },
  });
