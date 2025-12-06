import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import styles from "./styles/serviceProviderStyles";
import { FontAwesome, Feather } from "@expo/vector-icons";

export default function ServiceProviderSignUp({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignUp = () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !email || !phone || !password || !confirmPassword) {
      setErrorMsg("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setSuccessMsg("Looks good! Processing...");
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Create Your Service Provider Account</Text>

          {errorMsg !== "" && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {successMsg !== "" && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputRow}>
            <FontAwesome name="user" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="Full Name"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
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

          {/* Phone */}
          <View style={styles.phoneRow}>
            <Text style={styles.prefix}>+255</Text>

            <View style={styles.inputRowPhone}>
              <Feather name="phone" size={20} color="#777" style={styles.icon} />
              <TextInput
                placeholder="Phone Number"
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
          </View>

          {/* Password */}
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

          {/* Confirm Password */}
          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#777" style={styles.icon} />
            <TextInput
              placeholder="Confirm Password"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity style={styles.btn} onPress={handleSignUp}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity onPress={() => navigation.navigate("ServiceProviderLogin")}>
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
