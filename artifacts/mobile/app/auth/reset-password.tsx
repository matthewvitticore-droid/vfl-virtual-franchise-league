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

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleUpdate = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.replace("/(tabs)"), 2500);
  };

  if (done) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successBox, { backgroundColor: "#003087" + "20", borderColor: "#003087" }]}>
          <Feather name="check-circle" size={36} color="#60A5FA" style={{ marginBottom: 12 }} />
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Password updated!</Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            Taking you to the app…
          </Text>
        </View>
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

        <Text style={[styles.heading, { color: colors.foreground }]}>New Password</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Choose a new password for your account.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(s => !s)}>
                <Feather name={showPw ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
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
            onPress={handleUpdate}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : "#003087" }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.submitText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  successBox:   { width: "100%", padding: 28, borderRadius: 18, borderWidth: 1, alignItems: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 10 },
  successBody:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
