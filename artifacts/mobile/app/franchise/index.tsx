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
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { useColors } from "@/hooks/useColors";
import { FranchiseMemberRole, useAuth } from "@/context/AuthContext";

const NFL_TEAMS = [
  { id: "team-0",  city: "Buffalo",       name: "Bills",      abbr: "BUF", color: "#00338D" },
  { id: "team-1",  city: "Miami",         name: "Dolphins",   abbr: "MIA", color: "#008E97" },
  { id: "team-2",  city: "New England",   name: "Patriots",   abbr: "NE",  color: "#002244" },
  { id: "team-3",  city: "New York",      name: "Jets",       abbr: "NYJ", color: "#125740" },
  { id: "team-4",  city: "Baltimore",     name: "Ravens",     abbr: "BAL", color: "#241773" },
  { id: "team-5",  city: "Cincinnati",    name: "Bengals",    abbr: "CIN", color: "#FB4F14" },
  { id: "team-6",  city: "Cleveland",     name: "Browns",     abbr: "CLE", color: "#311D00" },
  { id: "team-7",  city: "Pittsburgh",    name: "Steelers",   abbr: "PIT", color: "#FFB612" },
  { id: "team-8",  city: "Houston",       name: "Texans",     abbr: "HOU", color: "#03202F" },
  { id: "team-9",  city: "Indianapolis",  name: "Colts",      abbr: "IND", color: "#002C5F" },
  { id: "team-10", city: "Jacksonville",  name: "Jaguars",    abbr: "JAX", color: "#006778" },
  { id: "team-11", city: "Tennessee",     name: "Titans",     abbr: "TEN", color: "#0C2340" },
  { id: "team-12", city: "Denver",        name: "Broncos",    abbr: "DEN", color: "#FB4F14" },
  { id: "team-13", city: "Kansas City",   name: "Chiefs",     abbr: "KC",  color: "#E31837" },
  { id: "team-14", city: "Las Vegas",     name: "Raiders",    abbr: "LV",  color: "#000000" },
  { id: "team-15", city: "Los Angeles",   name: "Chargers",   abbr: "LAC", color: "#0080C6" },
  { id: "team-16", city: "Dallas",        name: "Cowboys",    abbr: "DAL", color: "#003594" },
  { id: "team-17", city: "New York",      name: "Giants",     abbr: "NYG", color: "#0B2265" },
  { id: "team-18", city: "Philadelphia",  name: "Eagles",     abbr: "PHI", color: "#004C54" },
  { id: "team-19", city: "Washington",    name: "Commanders", abbr: "WAS", color: "#5A1414" },
  { id: "team-20", city: "Chicago",       name: "Bears",      abbr: "CHI", color: "#0B162A" },
  { id: "team-21", city: "Detroit",       name: "Lions",      abbr: "DET", color: "#0076B6" },
  { id: "team-22", city: "Green Bay",     name: "Packers",    abbr: "GB",  color: "#203731" },
  { id: "team-23", city: "Minnesota",     name: "Vikings",    abbr: "MIN", color: "#4F2683" },
  { id: "team-24", city: "Atlanta",       name: "Falcons",    abbr: "ATL", color: "#A71930" },
  { id: "team-25", city: "Carolina",      name: "Panthers",   abbr: "CAR", color: "#0085CA" },
  { id: "team-26", city: "New Orleans",   name: "Saints",     abbr: "NO",  color: "#D3BC8D" },
  { id: "team-27", city: "Tampa Bay",     name: "Buccaneers", abbr: "TB",  color: "#D50A0A" },
  { id: "team-28", city: "Arizona",       name: "Cardinals",  abbr: "ARI", color: "#97233F" },
  { id: "team-29", city: "Los Angeles",   name: "Rams",       abbr: "LAR", color: "#003594" },
  { id: "team-30", city: "San Francisco", name: "49ers",      abbr: "SF",  color: "#AA0000" },
  { id: "team-31", city: "Seattle",       name: "Seahawks",   abbr: "SEA", color: "#002244" },
];

const ROLES: { value: FranchiseMemberRole; label: string; desc: string; icon: string }[] = [
  { value: "GM",    label: "General Manager", desc: "Roster, contracts, trades, draft. Build the team.",         icon: "briefcase" },
  { value: "Coach", label: "Head Coach",      desc: "Depth chart, game plan, formations. Win on gameday.",       icon: "target"    },
  { value: "Scout", label: "Scout",           desc: "View everything, suggest draft prospects. Read-only.",      icon: "search"    },
];

type Screen = "choose" | "create" | "join";

export default function FranchiseLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, createFranchise, joinFranchise, signOut } = useAuth();

  const [screen, setScreen] = useState<Screen>("choose");

  // Create state
  const [franchiseName, setFranchiseName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("team-13"); // KC
  const [createRole, setCreateRole] = useState<FranchiseMemberRole>("GM");
  const [displayName, setDisplayName] = useState("");

  // Join state
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState<FranchiseMemberRole>("Coach");
  const [joinDisplayName, setJoinDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = NFL_TEAMS.find(t => t.id === selectedTeamId) ?? NFL_TEAMS[13];

  const handleCreate = async () => {
    if (!franchiseName.trim()) { setError("Please enter a franchise name."); return; }
    if (!displayName.trim()) { setError("Please enter your display name."); return; }
    setLoading(true); setError(null);
    const err = await createFranchise(franchiseName.trim(), selectedTeamId, createRole, displayName.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    router.replace("/(tabs)");
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError("Please enter the 6-character join code."); return; }
    if (!joinDisplayName.trim()) { setError("Please enter your display name."); return; }
    setLoading(true); setError(null);
    const err = await joinFranchise(joinCode.trim(), joinRole, joinDisplayName.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    router.replace("/(tabs)");
  };

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
        {/* Header */}
        <View style={styles.headerRow}>
          {screen !== "choose" && (
            <TouchableOpacity onPress={() => { setScreen("choose"); setError(null); }}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              {screen === "choose" ? "Your Franchise" : screen === "create" ? "Create Franchise" : "Join Franchise"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>Signed in as {user?.email}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: colors.border }]}>
            <Feather name="log-out" size={14} color={colors.mutedForeground} />
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── CHOOSE ─────────────────────────────────────────────────────── */}
        {screen === "choose" && (
          <>
            <View style={[styles.banner, { backgroundColor: colors.nflRed + "18", borderColor: colors.nflRed + "50" }]}>
              <Text style={{ fontSize: 36 }}>🏈</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Co-GM Mode</Text>
                <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
                  Create a franchise and invite friends, or join an existing one with a 6-character code.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setScreen("create")}
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.nflBlue + "60" }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.nflBlue + "25" }]}>
                <Feather name="plus-circle" size={22} color={colors.nflBlue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>Create New Franchise</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  Pick your team, set your role, and get a join code to share with friends.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScreen("join")}
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.nflRed + "60" }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.nflRed + "25" }]}>
                <Feather name="link" size={22} color={colors.nflRed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>Join with Code</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  Enter the 6-character code your friend shared to join their franchise.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip — play solo (offline)</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── CREATE ─────────────────────────────────────────────────────── */}
        {screen === "create" && (
          <View style={styles.form}>
            <InputField label="Franchise Name" placeholder="e.g. Dynasty FC" value={franchiseName} onChangeText={setFranchiseName} icon="shield" />
            <InputField label="Your Display Name" placeholder="e.g. ChiefsGM" value={displayName} onChangeText={setDisplayName} icon="user" />

            {/* Team Picker */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose Your Team</Text>
            <View style={[styles.selectedTeamRow, { backgroundColor: selectedTeam.color + "20", borderColor: selectedTeam.color + "60" }]}>
              <NFLTeamBadge abbreviation={selectedTeam.abbr} primaryColor={selectedTeam.color} size="md" />
              <Text style={[styles.selectedTeamName, { color: colors.foreground }]}>{selectedTeam.city} {selectedTeam.name}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamPickerRow}>
              {NFL_TEAMS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedTeamId(t.id)}
                  style={[styles.teamPickerItem, { borderColor: selectedTeamId === t.id ? t.color : "transparent", backgroundColor: selectedTeamId === t.id ? t.color + "25" : colors.card }]}
                >
                  <Text style={[styles.teamPickerAbbr, { color: t.color }]}>{t.abbr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Role Picker */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Your Role</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setCreateRole(r.value)}
                style={[styles.roleOption, { backgroundColor: createRole === r.value ? colors.nflBlue + "20" : colors.card, borderColor: createRole === r.value ? colors.nflBlue : colors.border }]}
              >
                <Feather name={r.icon as any} size={18} color={createRole === r.value ? colors.nflBlue : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: createRole === r.value ? colors.nflBlue : colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </View>
                {createRole === r.value && <Feather name="check-circle" size={16} color={colors.nflBlue} />}
              </TouchableOpacity>
            ))}

            {error && <ErrorBox error={error} />}

            <TouchableOpacity onPress={handleCreate} disabled={loading} style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : colors.nflBlue }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Feather name="plus" size={18} color="#fff" /><Text style={styles.submitText}>Create Franchise</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── JOIN ───────────────────────────────────────────────────────── */}
        {screen === "join" && (
          <View style={styles.form}>
            <View style={[styles.codeInputWrap, { backgroundColor: colors.card, borderColor: colors.nflGold }]}>
              <Feather name="hash" size={20} color={colors.nflGold} />
              <TextInput
                style={[styles.codeInput, { color: colors.foreground }]}
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="XXXXXX"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
            <Text style={[styles.codeHint, { color: colors.mutedForeground }]}>
              Ask your franchise creator for their 6-character code.
            </Text>

            <InputField label="Your Display Name" placeholder="e.g. CoachMike" value={joinDisplayName} onChangeText={setJoinDisplayName} icon="user" />

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose a Role</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setJoinRole(r.value)}
                style={[styles.roleOption, { backgroundColor: joinRole === r.value ? colors.nflRed + "20" : colors.card, borderColor: joinRole === r.value ? colors.nflRed : colors.border }]}
              >
                <Feather name={r.icon as any} size={18} color={joinRole === r.value ? colors.nflRed : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: joinRole === r.value ? colors.nflRed : colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </View>
                {joinRole === r.value && <Feather name="check-circle" size={16} color={colors.nflRed} />}
              </TouchableOpacity>
            ))}

            {error && <ErrorBox error={error} />}

            <TouchableOpacity onPress={handleJoin} disabled={loading} style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : colors.nflRed }]}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Feather name="link" size={18} color="#fff" /><Text style={styles.submitText}>Join Franchise</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, placeholder, value, onChangeText, icon }: { label: string; placeholder: string; value: string; onChangeText: (t: string) => void; icon: any }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
    </View>
  );
}

function ErrorBox({ error }: { error: string }) {
  const colors = useColors();
  return (
    <View style={[styles.errorBox, { backgroundColor: colors.danger + "20", borderColor: colors.danger }]}>
      <Feather name="alert-circle" size={14} color={colors.danger} />
      <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  heading: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  userEmail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  signOutText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  banner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  bannerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  optionCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  optionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  skipBtn: { alignItems: "center", marginTop: 16, paddingVertical: 10 },
  skipText: { fontSize: 12, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
  form: { gap: 14 },
  field: { gap: 6 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  selectedTeamRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 4 },
  selectedTeamName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  teamPickerRow: { gap: 8, paddingVertical: 4 },
  teamPickerItem: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  teamPickerAbbr: { fontSize: 10, fontFamily: "Inter_700Bold" },
  roleOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  roleLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  roleDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  codeInputWrap: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 2, paddingHorizontal: 20, paddingVertical: 16 },
  codeInput: { flex: 1, fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 8 },
  codeHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, marginTop: 4 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
