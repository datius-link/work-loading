import { View, Text, TextInput, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import styles from "./styles/serviceProviderStyles";

export default function ServiceProviderSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Provider Account</Text>

      <TextInput
        placeholder="Full Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email Address"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.phoneRow}>
        <Text style={styles.prefix}>+255</Text>
        <TextInput
          placeholder="Phone Number"
          style={styles.phoneInput}
          value={phone}
          onChangeText={setPhone}
          keyboardType="numeric"
          maxLength={9} // user enters only 9 digits
        />
      </View>

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        placeholder="Confirm Password"
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
