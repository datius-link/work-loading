import React from "react";
import { View } from "react-native";
import AuthLayout from "./AuthLayout";
import Txt from "../../../Txt";

export default function ResetPassword() {
  return (
    <AuthLayout>
      <View>
        <Txt en="Reset password" sw="Weka nenosiri jipya" />
      </View>
    </AuthLayout>
  );
}
