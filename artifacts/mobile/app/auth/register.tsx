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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim()) { setError("Please enter a display name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError(null);
    const err = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.successBadge, { backgroundColor: colors.success + "20" }]}>
          <Text style={{ fontSize: 48 }}>🏈</Text>
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Account Created!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Check your email to confirm your account, then sign in to join a franchise.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/auth/login")}
          style={[styles.submitBtn, { backgroundColor: colors.nflRed, marginTop: 24 }]}
        >
          <Feather name="log-in" size={18} color="#fff" />
          <Text style={styles.submitText}>Go to Sign In</Text>
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.heading, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Set up your Co-GM profile. You'll use this to join or create a franchise.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Display Name</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. ChiefsGM2026"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
            </View>
          </View>

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
                placeholder="Min. 6 characters"
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
                placeholder="Repeat password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
              />
            </View>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.danger + "20", borderColor: colors.danger }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : colors.nflBlue }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="#fff" />
                <Text style={styles.submitText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  content: { paddingHorizontal: 24 },
  backBtn: { marginBottom: 24, width: 40 },
  heading: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 32 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, marginTop: 4 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  successBadge: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  successTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 10 },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
});
