import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
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
import { VFLLogo } from "@/components/VFLLogo";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, joinFranchise, createFranchise } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // After franchise creation: show the share code screen
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [franchiseName, setFranchiseName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);

    const signInErr = await signIn(email.trim(), password);
    if (signInErr) {
      setLoading(false);
      setError(signInErr);
      return;
    }

    // Process any pending Co-GM action (create or join)
    try {
      const raw = await AsyncStorage.getItem("vfl_pending_action");
      if (raw) {
        const action = JSON.parse(raw);

        if (action.type === "create") {
          setStatus("Creating franchise…");
          const { error: err, joinCode } = await createFranchise(
            action.franchiseName,
            action.teamId,
            action.role ?? "GM",
            action.displayName ?? "Commissioner",
          );
          if (err) {
            setLoading(false);
            setError(`Franchise creation failed: ${err}`);
            return;
          }
          await AsyncStorage.removeItem("vfl_pending_action");
          await AsyncStorage.setItem("vfl_gm_mode", "cogm");
          setLoading(false);
          // Show the join code before entering the game
          setCreatedCode(joinCode ?? "");
          setFranchiseName(action.franchiseName ?? "");
          return;

        } else if (action.type === "join") {
          setStatus("Joining franchise…");
          const err = await joinFranchise(
            action.code,
            action.role ?? "Coach",
            action.displayName ?? "Co-GM",
          );
          if (err) {
            setLoading(false);
            setError(`Join failed: ${err}`);
            return;
          }
          await AsyncStorage.removeItem("vfl_pending_action");
          await AsyncStorage.setItem("vfl_gm_mode", "cogm");
        }
      }
    } catch (e) {
      console.warn("[VFL] Pending action failed:", e);
    }

    setLoading(false);
    router.replace("/(tabs)");
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    await Clipboard.setStringAsync(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Franchise Created Screen ─────────────────────────────────────────────────
  if (createdCode !== null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Success badge */}
          <View style={styles.successBadge}>
            <Feather name="check-circle" size={48} color="#22C55E" />
          </View>

          <Text style={[styles.heading, { color: colors.foreground, textAlign: "center" }]}>
            Franchise Created!
          </Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground, textAlign: "center" }]}>
            {franchiseName}
          </Text>

          {/* Code block */}
          <View style={[styles.codeBlock, { borderColor: "#22C55E55", backgroundColor: "#22C55E08" }]}>
            <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>SHARE THIS CODE WITH YOUR CO-GMs</Text>
            <Text style={[styles.codeText, { color: "#22C55E" }]}>{createdCode}</Text>
            <Text style={[styles.codeSub, { color: colors.mutedForeground }]}>
              They'll enter it on the "Join Franchise" screen to connect to your franchise.
            </Text>
          </View>

          {/* Copy button */}
          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.copyBtn, { borderColor: copied ? "#22C55E" : colors.nflBlue + "60", backgroundColor: copied ? "#22C55E15" : colors.card }]}
          >
            <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "#22C55E" : colors.nflBlue} />
            <Text style={[styles.copyText, { color: copied ? "#22C55E" : colors.nflBlue }]}>
              {copied ? "Copied!" : "Copy Code"}
            </Text>
          </TouchableOpacity>

          {/* Enter game */}
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={[styles.submitBtn, { backgroundColor: colors.nflBlue, marginTop: 8 }]}
          >
            <Feather name="arrow-right-circle" size={18} color="#fff" />
            <Text style={styles.submitText}>Enter My Franchise</Text>
          </TouchableOpacity>

          <Text style={[styles.codeHint, { color: colors.mutedForeground }]}>
            You can also find this code in the Franchise → Meeting Room tab once you're in the game.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Sign In Screen ────────────────────────────────────────────────────────────
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
          <View style={[styles.dividerAccent, { backgroundColor: colors.nflGold }]} />
        </View>

        <Text style={[styles.heading, { color: colors.foreground }]}>Sign In</Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Sign in to create or join a franchise and play in real time with your co-GMs.
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

          {status && !error && (
            <View style={[styles.errorBox, { backgroundColor: "#003087" + "30", borderColor: "#003087" }]}>
              <ActivityIndicator size="small" color="#60A5FA" />
              <Text style={[styles.errorText, { color: "#60A5FA" }]}>{status}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : colors.nflBlue }]}
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
          style={[styles.secondaryBtn, { borderColor: colors.nflBlue + "60", backgroundColor: colors.card }]}
        >
          <Feather name="user-plus" size={16} color={colors.nflBlue} />
          <Text style={[styles.secondaryText, { color: colors.nflBlue }]}>Create Account</Text>
        </TouchableOpacity>

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
  container:    { flex: 1 },
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
  dividerRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  divider:      { flex: 1, height: 1 },
  dividerText:  { fontSize: 12, fontFamily: "Inter_400Regular" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 20 },
  secondaryText:{ fontSize: 15, fontFamily: "Inter_600SemiBold" },
  offlineBtn:   { alignItems: "center", paddingVertical: 8 },
  offlineText:  { fontSize: 12, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
  // Franchise Created screen
  successBadge: { alignItems: "center", marginBottom: 24 },
  codeBlock:    { borderWidth: 1.5, borderRadius: 16, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  codeLabel:    { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  codeText:     { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  codeSub:      { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  copyBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginBottom: 12 },
  copyText:     { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  codeHint:     { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16, marginTop: 16 },
});
