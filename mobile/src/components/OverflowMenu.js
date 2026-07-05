import React, { useMemo } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import AppIcon from "../icons/AppIcon";
import Txt from "../Txt";
import { useAppTheme } from "../theme";

/**
 * A small, hand-rolled overflow ("⋮") menu — a header icon button that opens
 * a lightweight dropdown anchored under the top-right corner. Built with
 * React Native's own Modal + Pressable (no extra UI-kit dependency) so it
 * matches the app's existing Modal-based sheet/notice patterns.
 *
 * Usage:
 *   <OverflowMenu
 *     items={[
 *       { icon: "refresh", en: "Refresh", sw: "Onyesha upya", onPress: doRefresh },
 *       ...
 *     ]}
 *   />
 */
export default function OverflowMenu({ items = [], iconColor, size = 20 }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = React.useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel="More options"
        accessibilityRole="button"
      >
        <AppIcon name="more-vertical" size={size} color={iconColor || theme.colors.text} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
          <View style={styles.menuAnchor}>
            <View style={styles.menu}>
              {items.map((item, index) => (
                <React.Fragment key={item.en}>
                  {index ? <View style={styles.divider} /> : null}
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      close();
                      item.onPress?.();
                    }}
                  >
                    <AppIcon name={item.icon} size={16} color={item.danger ? theme.colors.danger : theme.colors.text} />
                    <Txt
                      en={item.en}
                      sw={item.sw || item.en}
                      style={[styles.menuItemText, item.danger && { color: theme.colors.danger }]}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    trigger: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    menuAnchor: {
      position: "absolute",
      top: 56,
      right: 14,
      alignItems: "flex-end",
    },
    menu: {
      minWidth: 210,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    menuItem: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 14,
    },
    menuItemText: { color: theme.colors.text, fontSize: 13.5, fontWeight: "700" },
    divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: 8 },
  });
