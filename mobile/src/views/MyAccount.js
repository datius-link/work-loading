// src/views/MyAccount.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import stylesBase from "../styles/profileStyles";

export default function MyAccount() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={local.container}>

      {/* TOP SECTION - Account Identity */}
      <View style={local.headerBox}>
        <FontAwesome5 name="user" size={32} color="#0B6B63" />
        <Text style={local.headerTitle}>You're on a Normal User Account</Text>
        <Text style={local.headerBody}>
          You currently use the app to browse services, request help, and chat
          with professionals.  
          To offer services and earn, move to the professional provider workspace.
        </Text>
      </View>

      {/* Provider Mode Explanation */}
      <View style={local.modeCard}>
        <Text style={local.modeTitle}>What is Provider Mode?</Text>

        <Text style={local.modeBody}>
          Provider mode unlocks a dedicated workspace for professionals:
        </Text>

        <View style={local.bulletWrap}>
          <Text style={local.bullet}>• Posts — publish offers & service updates</Text>
          <Text style={local.bullet}>• Requests — manage job requests</Text>
          <Text style={local.bullet}>• Alerts — notifications for your work</Text>
          <Text style={local.bullet}>• MyProfile — your service provider identity</Text>
        </View>

        <Text style={local.note}>
          If you're already a provider, log in. Otherwise, create a provider account.
        </Text>
      </View>

      {/* ACTION BUTTONS */}
      <View style={local.actions}>
        <TouchableOpacity
          style={[local.actionBtn, local.primaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderLogin")}
        >
          <FontAwesome5 name="sign-in-alt" size={22} color="#fff" />
          <Text style={local.primaryText}>Login as Service Provider</Text>
          <Text style={local.subTextLight}>
            Use this if you already have a provider account.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[local.actionBtn, local.secondaryBtn]}
          onPress={() => navigation.navigate("ServiceProviderSignUp")}
        >
          <FontAwesome5 name="user-plus" size={22} color="#0B6B63" />
          <Text style={local.secondaryText}>Become a Service Provider</Text>
          <Text style={local.subTextDark}>
            Create a provider account and start offering services.
          </Text>
        </TouchableOpacity>

        {/* QUICK PROVIDER ACCESS */}
        <TouchableOpacity
          style={[local.actionBtn, local.ghostBtn]}
          onPress={() => navigation.navigate("ServiceProviderProfile")}
        >
          <FontAwesome5 name="user-tie" size={22} color="#4ECDC4" />
          <Text style={local.ghostText}>Open Provider Workspace</Text>
          <Text style={local.subTextDark}>
            For already logged-in providers.
          </Text>
        </TouchableOpacity>
      </View>

      {/* SETTINGS */}
      <TouchableOpacity
        style={[stylesBase.card, local.settingsCard]}
        onPress={() => {}}
      >
        <FontAwesome5 name="cog" size={26} color="#4ECDC4" />
        <View style={stylesBase.textWrap}>
          <Text style={stylesBase.cardTitle}>Settings & Preferences</Text>
          <Text style={stylesBase.cardDesc}>
            Customize the app to your liking.
          </Text>
        </View>
      </TouchableOpacity>

    </ScrollView>
  );
}

const local = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },

  /* TOP HEADER */
  headerBox: {
    backgroundColor: "#E9F7F5",
    paddingVertical: 25,
    paddingHorizontal: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 18,
  },
  headerTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#0B6B63",
    textAlign: "center",
  },
  headerBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: "92%",
  },

  /* MODE CARD */
  modeCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E4E4E4",
    marginBottom: 18,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  modeBody: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  bulletWrap: {
    marginTop: 10,
    marginLeft: 8,
  },
  bullet: {
    color: "#333",
    marginVertical: 2,
    fontSize: 14,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#777",
  },

  /* ACTION BUTTONS */
  actions: {
    marginBottom: 20,
  },
  actionBtn: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 1,
  },

  primaryBtn: {
    backgroundColor: "#0B6B63",
  },
  primaryText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#0B6B63",
    backgroundColor: "#F4FFFD",
  },
  secondaryText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#0B6B63",
  },

  ghostBtn: {
    backgroundColor: "#F7FFFE",
    borderWidth: 1,
    borderColor: "#D4F8F3",
  },
  ghostText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#0B6B63",
  },

  subTextLight: {
    fontSize: 13,
    color: "#EAF8F6",
  },
  subTextDark: {
    fontSize: 13,
    color: "#444",
  },

  /* SETTINGS */
  settingsCard: {
    marginTop: 10,
  },
});
