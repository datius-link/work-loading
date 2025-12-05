import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

export default function Profile() {
  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="user-tie" size={26} color="#4ECDC4" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Join as a Service Provider</Text>
          <Text style={styles.cardDesc}>Offer your skills to earn income.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="handshake" size={26} color="#45B7D1" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Request a Service</Text>
          <Text style={styles.cardDesc}>Get professionals to handle your tasks.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="exchange-alt" size={26} color="#FF6B6B" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Switch Role</Text>
          <Text style={styles.cardDesc}>Change between provider or requester.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="cog" size={26} color="#4ECDC4" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Settings & Preferences</Text>
          <Text style={styles.cardDesc}>Customize the app to your liking.</Text>
        </View>
      </TouchableOpacity>

    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: "#f7f7f7",
    flex: 1,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },

  textWrap: {
    marginLeft: 15,
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  cardDesc: {
    color: "#555",
    marginTop: 2,
    fontSize: 13,
  },
});