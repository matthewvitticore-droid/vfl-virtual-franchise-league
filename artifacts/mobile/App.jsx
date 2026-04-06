import React from "react";
import { StyleSheet, View } from "react-native";
import Helmet from "./components/Helmet";

export default function App() {
  return (
    <View style={styles.container}>
      <Helmet
        size={300}
        shellColor="#E5E7EB"
        facemaskColor="#DC2626"
        visorColor="#0F172A"
        chinstrapColor="#1D4ED8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});
