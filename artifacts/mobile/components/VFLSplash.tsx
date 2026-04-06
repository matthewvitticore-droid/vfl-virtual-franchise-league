import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { HelmetSVGWithLogo } from "@/components/HelmetSVG";

export function VFLSplash() {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const sub   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // helmet pops in
      Animated.parallel([
        Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      // subtitle fades in after helmet
      Animated.timing(sub, { toValue: 1, duration: 350, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={st.container}>
      {/* Radial glow behind helmet */}
      <View style={st.glow} />

      {/* Helmet */}
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <HelmetSVGWithLogo
          width={300}
          shellColor="#ECEEF2"
          facemaskColor="#C0C6D0"
          visorColor="#080C14"
          chinstrapColor="#ECEEF2"
          abbreviation="VFL"
          logoColor="#4F46E5"
        />
      </Animated.View>

      {/* Wordmark below */}
      <Animated.View style={[st.wordmarkRow, { opacity: sub }]}>
        <Text style={st.wordmarkPlus}>+</Text>
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
    backgroundColor: "#4F46E5",
    opacity: 0.08,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    gap: 2,
  },
  wordmarkPlus: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#4F46E5",
    marginTop: 4,
    letterSpacing: 0,
  },
  wordmarkVFL: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff40",
    letterSpacing: 3,
    marginTop: 6,
  },
});
