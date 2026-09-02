import React from "react";
import { LoginScreen } from "./LoginScreen";

interface RegisterScreenProps {
  navigation: any;
  route?: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  return <LoginScreen navigation={navigation} route={{ params: { tab: "signup", ...route?.params } }} />;
};
