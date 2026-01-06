import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";

export default function EditMedia({ route, navigation }) {
  const { type, media } = route.params;

  const [items] = useState(media);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex];

  const goNext = () => {
    navigation.navigate("PostDetails", {
      type,
      media: items,
    });
  };

  return (
    <View style={styles.screen}>
      {/* PREVIEW */}
      <View style={styles.preview}>
        {activeItem.type === "video" ? (
          <View style={styles.videoBox}>
            <Text style={styles.videoText}>Video selected</Text>
          </View>
        ) : (
          <Image source={{ uri: activeItem.uri }} style={styles.media} />
        )}
      </View>

      {/* INFO */}
      <View style={styles.tools}>
        <Text style={styles.toolHint}>
          Editing disabled in v1. Media will be uploaded as selected.
        </Text>
      </View>

      {/* THUMBNAILS */}
      <FlatList
        data={items}
        horizontal
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.thumbRow}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => setActiveIndex(index)}>
            <Image
              source={{ uri: item.uri }}
              style={[
                styles.thumb,
                index === activeIndex && styles.thumbActive,
              ]}
            />
          </TouchableOpacity>
        )}
      />

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  preview: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  media: {
    width: "100%",
    height: "100%",
  },

  videoBox: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  videoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  tools: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  toolHint: {
    fontSize: 12,
    color: "#777",
  },

  thumbRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },

  thumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
    opacity: 0.6,
  },

  thumbActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: "#111",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  back: {
    fontWeight: "600",
    color: "#666",
  },

  nextBtn: {
    backgroundColor: "#111",
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 20,
  },

  nextText: {
    color: "#fff",
    fontWeight: "700",
  },
});
