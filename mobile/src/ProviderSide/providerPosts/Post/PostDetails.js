import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function UploadScreen({ route, navigation }) {
  const { mediaToUpload, postType } = route.params || {};
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async () => {
    if (!mediaToUpload || mediaToUpload.length === 0) {
      Alert.alert("Error", "No media to upload");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement your upload logic here
      // This would typically involve:
      // 1. Uploading each media file to your server/cloud storage
      // 2. Getting back the URLs
      // 3. Sending the post data to your API
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        "Success",
        `${postType === "reel" ? "Reel" : "Moment"} uploaded successfully!`,
        [
          { 
            text: "OK", 
            onPress: () => navigation.navigate("Home") 
          }
        ]
      );

    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Please try again later");
    } finally {
      setIsLoading(false);
    }
  };

  const mediaCount = mediaToUpload?.length || 0;
  const imageCount = mediaToUpload?.filter(m => m.type === "image").length || 0;
  const videoCount = mediaToUpload?.filter(m => m.type === "video").length || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Create {postType === "reel" ? "Reel" : "Moment"}</Text>

        <TouchableOpacity onPress={handleUpload} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#0095f6" />
          ) : (
            <Text style={styles.shareText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* MEDIA SUMMARY */}
        <View style={styles.mediaSummary}>
          <Icon 
            name={postType === "reel" ? "videocam" : "collections"} 
            size={24} 
            color="#0095f6" 
          />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {mediaCount} {postType === "reel" ? "Video" : "Media Items"}
            </Text>
            {postType === "moment" && (
              <Text style={styles.summarySubtitle}>
                {imageCount} photo{imageCount !== 1 ? 's' : ''}
                {videoCount > 0 && ` • ${videoCount} video${videoCount !== 1 ? 's' : ''}`}
              </Text>
            )}
          </View>
        </View>

        {/* CAPTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Write a caption..."
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
          <Text style={styles.charCount}>{caption.length}/2200</Text>
        </View>

        {/* LOCATION */}
        <TouchableOpacity 
          style={styles.section}
          onPress={() => Alert.alert("Coming Soon", "Location picker")}
        >
          <Text style={styles.sectionTitle}>Add Location</Text>
          <View style={styles.locationRow}>
            <Icon name="location-on" size={20} color="#666" />
            <Text style={styles.locationText}>
              {location || "Add location"}
            </Text>
            <Icon name="chevron-right" size={24} color="#666" />
          </View>
        </TouchableOpacity>

        {/* TAGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add tags separated by commas"
            placeholderTextColor="#999"
            value={tags}
            onChangeText={setTags}
          />
          <Text style={styles.helperText}>
            Tags help people discover your content
          </Text>
        </View>

        {/* ADVANCED OPTIONS */}
        <TouchableOpacity 
          style={styles.advancedBtn}
          onPress={() => Alert.alert("Advanced Options", "Coming soon")}
        >
          <Text style={styles.advancedText}>Advanced Options</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </ScrollView>

      {/* LOADING OVERLAY */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0095f6" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  title: { 
    fontSize: 18, 
    fontWeight: "700",
    color: "#000",
  },

  shareText: { 
    color: "#0095f6", 
    fontSize: 16,
    fontWeight: "700" 
  },

  content: {
    flex: 1,
    padding: 16,
  },

  mediaSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },

  summaryText: {
    marginLeft: 12,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  summarySubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },

  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },

  charCount: {
    textAlign: "right",
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },

  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },

  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  advancedBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  advancedText: {
    fontSize: 16,
    color: "#000",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
});