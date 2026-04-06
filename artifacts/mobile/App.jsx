import React from "react";
import { StyleSheet, View } from "react-native";
import Helmet from "./components/Helmet";

export default function App() {
  return (
    <View style={styles.container}>
      <Helmet
        shellColor="#E5E7EB"
        facemaskColor="#DC2828"
        chinstrapColor="#DC2828"
        visorColor="#0F172A"
        outlineColor="#111827"
        width={340}
        height={311}
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
