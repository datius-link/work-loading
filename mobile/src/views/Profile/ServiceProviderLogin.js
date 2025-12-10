import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../../api/api";
import styles from "./styles/serviceProviderStyles";

export default function ServiceProviderLogin({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Enter email & password");
      return;
    }

    try {
      setSuccessMsg("Checking your account…");

      const res = await API.post("/auth/login", { email, password });

      if (!res.data.success) {
        setErrorMsg(res.data.message);
        setSuccessMsg("");
        return;
      }

      const token = res.data.token;

      if (token) {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("role", user.accountType);
      }

      setSuccessMsg("Login successful!");

      setTimeout(() => {
        navigation.replace("ServiceProviderProfile");
      }, 1000);

    } catch (e) {
      setErrorMsg("Server error, try again later");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >

        <View style={styles.container}>
          <Text style={styles.title}>Service Provider Login</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* EMAIL */}
          <View style={styles.inputRow}>
            <Feather name="mail" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="Email Address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          {/* PASSWORD */}
          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity style={styles.btn} onPress={handleLogin}>
            <Text style={styles.btnText}>Login</Text>
          </TouchableOpacity>

          {/* CREATE ACCOUNT LINK */}
          <TouchableOpacity
            onPress={() => navigation.navigate("ServiceProviderSignUp")}
          >
            <Text style={styles.signInText}>
              Don’t have an account?{" "}
              <Text style={styles.signInLink}>Create one</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
