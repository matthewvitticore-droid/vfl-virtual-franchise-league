import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    // On success, AuthContext will update and _layout will redirect
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: colors.nflRed }]}>
            <Text style={styles.logoText}>🏈</Text>
          </View>
          <View>
            <Text style={[styles.appName, { color: colors.foreground }]}>FootballSim</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Co-GM Franchise Mode</Text>
          </View>
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Sign In</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Join your franchise and manage your team with your co-GMs in real time.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(s => !s)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.danger + "20", borderColor: colors.danger }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : colors.nflRed }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="log-in" size={18} color="#fff" />
                <Text style={styles.submitText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>New here?</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/auth/register")}
          style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="user-plus" size={16} color={colors.foreground} />
          <Text style={[styles.secondaryText, { color: colors.foreground }]}>Create Account</Text>
        </TouchableOpacity>

        {/* Offline mode */}
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.offlineBtn}>
          <Text style={[styles.offlineText, { color: colors.mutedForeground }]}>
            Continue Offline (local only)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 40 },
  logoBadge: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 26 },
  appName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  tagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  heading: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 32 },
  form: { gap: 16, marginBottom: 24 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  secondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  offlineBtn: { alignItems: "center", paddingVertical: 8 },
  offlineText: { fontSize: 12, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
});
