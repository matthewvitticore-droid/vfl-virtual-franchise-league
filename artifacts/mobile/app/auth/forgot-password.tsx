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
import { VFLLogo } from "@/components/VFLLogo";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    setError(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : undefined;

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successBox, { backgroundColor: "#003087" + "20", borderColor: "#003087" }]}>
          <Feather name="mail" size={32} color="#60A5FA" style={{ marginBottom: 12 }} />
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Check your inbox</Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            We sent a password reset link to{"\n"}
            <Text style={{ color: colors.foreground }}>{email}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.replace("/auth/login")} style={styles.backBtn}>
          <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <View style={styles.logoSection}>
          <VFLLogo size="lg" showWordmark />
          <View style={[styles.dividerAccent, { backgroundColor: "#C8A84B" }]} />
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Reset Password</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Enter your email and we'll send you a reset link.
        </Text>

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

          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#C8102E" + "20", borderColor: "#C8102E" }]}>
              <Feather name="alert-circle" size={14} color="#C8102E" />
              <Text style={[styles.errorText, { color: "#C8102E" }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : "#003087" }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  center:       { alignItems: "center", justifyContent: "center", padding: 24 },
  content:      { paddingHorizontal: 24 },
  logoSection:  { alignItems: "flex-start", marginBottom: 36, gap: 16 },
  dividerAccent:{ height: 2, width: 40, borderRadius: 1 },
  heading:      { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 8 },
  subheading:   { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 32 },
  form:         { gap: 16, marginBottom: 24 },
  field:        { gap: 6 },
  label:        { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap:    { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  input:        { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText:    { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14 },
  submitText:   { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  successBox:   { width: "100%", padding: 28, borderRadius: 18, borderWidth: 1, alignItems: "center", marginBottom: 32 },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 10 },
  successBody:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  backBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  backText:     { fontSize: 13, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
});
