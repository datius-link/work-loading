import { View, Text, TouchableOpacity } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import styles from "../styles/profileStyles";

export default function Profile() {

    const navigation = useNavigation();

  return (
    <View style={styles.container}>

      <TouchableOpacity style={styles.card}
            onPress={() => navigation.navigate('ServiceProviderSignUp')}
       >
        <FontAwesome5 name="user-tie" size={26} color="#4ECDC4" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Join as a Service Provider</Text>
          <Text style={styles.cardDesc}>
            Offer your skills to earn income.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="handshake" size={26} color="#45B7D1" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Request a Service</Text>
          <Text style={styles.cardDesc}>
            Get professionals to handle your tasks.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="exchange-alt" size={26} color="#FF6B6B" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Switch Role</Text>
          <Text style={styles.cardDesc}>
            Change between provider or requester.
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <FontAwesome5 name="cog" size={26} color="#4ECDC4" />
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>Settings & Preferences</Text>
          <Text style={styles.cardDesc}>
            Customize the app to your liking.
          </Text>
        </View>
      </TouchableOpacity>

    </View>
  );
}
