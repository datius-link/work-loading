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
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "./styles/serviceProviderStyles";
import { FontAwesome, Feather } from "@expo/vector-icons";
import { API } from "../../api/api";


export default function ServiceProviderSignUp({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

    const handleSignUp = async () => {
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

    try {
        setSuccessMsg("Creating your account...");

        const response = await API.post("/auth/register", {
        name,
        email,
        phone: "+255" + phone,
        password,
        accountType: "serviceProvider",
        });

        if (response.data.success) {
        setSuccessMsg(response.data.message);
        
        const token = response.data.token;

        if (token) {
          await AsyncStorage.setItem("token", token);
        }

        await AsyncStorage.setItem("token", response.data.token);

        navigation.navigate("VerifyProvider", {
          email,
          phone: "+255" + phone,
        });

        } else {
        setErrorMsg(response.data.message);
        setSuccessMsg("");
        }
    } catch (err) {
        setErrorMsg("Server error. Please try again.");
        setSuccessMsg("");
    }
    };

    const handlePhoneInput = (value) => {
    // Reset error first
    setPhoneError("");

    // Remove spaces automatically
    const cleaned = value.replace(/\s+/g, "");

    // Prevent letters
    if (!/^\d*$/.test(cleaned)) {
        setPhoneError("Phone number must contain digits only.");
        return;
    }

    // Prevent 0 at the start
    if (cleaned.startsWith("0")) {
        setPhoneError("Do not start with 0. Example: 712345678");
    }

    // Limit to 9 digits
    if (cleaned.length > 9) {
        setPhoneError("Phone number must be exactly 9 digits.");
    }

    // Update value
    setPhone(cleaned);
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
                onChangeText={handlePhoneInput}
                keyboardType="numeric"
                maxLength={9}
              />
            </View>

            {phoneError !== "" && (
            <View style={styles.errorBox}>
                <Text style={styles.errorText}>{phoneError}</Text>
            </View>
            )}

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
