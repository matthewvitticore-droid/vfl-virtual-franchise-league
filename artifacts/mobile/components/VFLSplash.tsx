import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { VFLLogo } from "@/components/VFLLogo";

export function VFLSplash() {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const sub   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(sub, { toValue: 1, duration: 350, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={st.container}>
      <View style={st.glow} />

      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <VFLLogo size="xl" />
      </Animated.View>

      <Animated.View style={[st.wordmarkRow, { opacity: sub }]}>
        <Text style={st.wordmarkVFL}>VFL</Text>
      </Animated.View>

      <Animated.Text style={[st.tagline, { opacity: sub }]}>
        VIRTUAL FRANCHISE LEAGUE
      </Animated.Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07070F",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  glow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#003087",
    opacity: 0.10,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    gap: 2,
  },
  wordmarkVFL: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff40",
    letterSpacing: 3,
    marginTop: 6,
  },
});
