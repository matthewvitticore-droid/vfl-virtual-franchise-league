import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { FranchiseMemberRole, useAuth } from "@/context/AuthContext";
import { initSeason } from "@/context/NFLContext";
import { bigSet } from "@/utils/bigStorage";

const VFL_TEAMS = [
  // Ironclad Conference — East
  { id: "team-0",  city: "Hartford",      name: "Sentinels",    abbr: "HRT", color: "#1B3462" },
  { id: "team-1",  city: "Providence",    name: "Storm",        abbr: "PVS", color: "#7F1D1D" },
  { id: "team-2",  city: "Burlington",    name: "Frost",        abbr: "BLF", color: "#1E3A8A" },
  { id: "team-3",  city: "Albany",        name: "Forge",        abbr: "ALF", color: "#1C2833" },
  // Ironclad Conference — North
  { id: "team-4",  city: "Syracuse",      name: "Stallions",    abbr: "SYS", color: "#4527A0" },
  { id: "team-5",  city: "Pittsburgh",    name: "Ironmen",      abbr: "PMN", color: "#374151" },
  { id: "team-6",  city: "Columbus",      name: "Knights",      abbr: "CKN", color: "#7F1D1D" },
  { id: "team-7",  city: "Cleveland",     name: "Foundry",      abbr: "CLD", color: "#92400E" },
  // Ironclad Conference — South
  { id: "team-8",  city: "Nashville",     name: "Desperados",   abbr: "NVD", color: "#111827" },
  { id: "team-9",  city: "Memphis",       name: "Blaze",        abbr: "MBZ", color: "#C2410C" },
  { id: "team-10", city: "Birmingham",    name: "Bolt",         abbr: "BBT", color: "#6B21A8" },
  { id: "team-11", city: "Chattanooga",   name: "Thunder",      abbr: "CTR", color: "#065F46" },
  // Ironclad Conference — West
  { id: "team-12", city: "Denver",        name: "Peaks",        abbr: "DVP", color: "#3730A3" },
  { id: "team-13", city: "Reno",          name: "Royals",       abbr: "RNR", color: "#1E40AF" },
  { id: "team-14", city: "Salt Lake",     name: "Blizzard",     abbr: "SLB", color: "#1E3A8A" },
  { id: "team-15", city: "Sacramento",    name: "Miners",       abbr: "SMN", color: "#D97706" },
  // Gridiron Conference — East
  { id: "team-16", city: "Raleigh",       name: "Thunderhawks", abbr: "RTH", color: "#6B1B3C" },
  { id: "team-17", city: "Richmond",      name: "Cavalry",      abbr: "RCV", color: "#1E3A8A" },
  { id: "team-18", city: "Annapolis",     name: "Corsairs",     abbr: "ACS", color: "#0C2340" },
  { id: "team-19", city: "Charlotte",     name: "Vipers",       abbr: "CHV", color: "#4B1994" },
  // Gridiron Conference — North
  { id: "team-20", city: "Rockford",      name: "Blaze",        abbr: "RBZ", color: "#C2410C" },
  { id: "team-21", city: "Milwaukee",     name: "Wolves",       abbr: "MWW", color: "#14532D" },
  { id: "team-22", city: "Madison",       name: "Ice",          abbr: "MDI", color: "#1E40AF" },
  { id: "team-23", city: "Grand Rapids",  name: "Fury",         abbr: "GRF", color: "#4E0B2A" },
  // Gridiron Conference — South
  { id: "team-24", city: "Savannah",      name: "Marshmen",     abbr: "SVT", color: "#0F4C35" },
  { id: "team-25", city: "Baton Rouge",   name: "Bayou",        abbr: "BRB", color: "#4B1994" },
  { id: "team-26", city: "Tampa",         name: "Surge",        abbr: "TSG", color: "#991B1B" },
  { id: "team-27", city: "Orlando",       name: "Storm",        abbr: "ORS", color: "#0C2340" },
  // Gridiron Conference — West
  { id: "team-28", city: "Portland",      name: "Lumberjacks",  abbr: "PLJ", color: "#14532D" },
  { id: "team-29", city: "Seattle",       name: "Cascade",      abbr: "SCS", color: "#1E3A8A" },
  { id: "team-30", city: "San Francisco", name: "Fog",          abbr: "SFF", color: "#B45309" },
  { id: "team-31", city: "Los Angeles",   name: "Surf",         abbr: "LAS", color: "#0E7490" },
];

const ROLES: { value: FranchiseMemberRole; label: string; desc: string; icon: string }[] = [
  { value: "GM",    label: "General Manager", desc: "Roster, contracts, trades, draft. Build the team.",         icon: "briefcase" },
  { value: "Coach", label: "Head Coach",      desc: "Depth chart, game plan, formations. Win on gameday.",       icon: "target"    },
  { value: "Scout", label: "Scout",           desc: "View everything, suggest draft prospects. Read-only.",      icon: "search"    },
];

type Screen = "type" | "choose" | "create" | "join" | "success" | "solo-team";

export default function FranchiseLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, createFranchise, joinFranchise, signOut } = useAuth();

  const [screen, setScreen] = useState<Screen>("type");
  const [soloTeamId, setSoloTeamId] = useState("team-13"); // Coastal Sharks default

  // Create state
  const [franchiseName, setFranchiseName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("team-13"); // Reno Royals
  const [createRole, setCreateRole] = useState<FranchiseMemberRole>("GM");
  const [displayName, setDisplayName] = useState("");

  // Join state
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState<FranchiseMemberRole>("Coach");
  const [joinDisplayName, setJoinDisplayName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill join code if coming from the launch screen "Join Franchise" flow
  useEffect(() => {
    AsyncStorage.getItem("vfl_pending_join_code").then(code => {
      if (code) {
        setJoinCode(code);
        setScreen("join");
        AsyncStorage.removeItem("vfl_pending_join_code");
      }
    });
  }, []);

  const selectedTeam     = VFL_TEAMS.find(t => t.id === selectedTeamId) ?? VFL_TEAMS[13];
  const selectedSoloTeam = VFL_TEAMS.find(t => t.id === soloTeamId) ?? VFL_TEAMS[13];

  const handleCreate = async () => {
    if (!franchiseName.trim()) { setError("Please enter a franchise name."); return; }
    if (!displayName.trim()) { setError("Please enter your display name."); return; }
    setLoading(true); setError(null);
    const err = await createFranchise(franchiseName.trim(), selectedTeamId, createRole, displayName.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    setScreen("success");
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

  const handleSoloCreate = async () => {
    setLoading(true);
    try {
      const season = initSeason(soloTeamId);
      await bigSet("vfl_season_v1", season);
      await AsyncStorage.setItem("vfl_gm_mode", "solo");
      router.replace("/(tabs)");
    } catch (e) {
      setError("Failed to create franchise. Please try again.");
    } finally {
      setLoading(false);
    }
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
          {screen !== "type" && (
            <TouchableOpacity onPress={() => {
              if (screen === "choose" || screen === "solo-team") setScreen("type");
              else if (screen === "create" || screen === "join") setScreen("choose");
              setError(null);
            }}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
          )}
          {screen === "type" && <VFLLogo size="sm" />}
          <View style={{ flex: 1 }}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              {screen === "type" ? "Choose League Type"
                : screen === "solo-team" ? "Pick Your Team"
                : screen === "choose" ? "Co-GM Mode"
                : screen === "create" ? "Create Franchise"
                : screen === "join" ? "Join Franchise"
                : "Franchise Created!"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>Signed in as {user?.email}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={[styles.signOutBtn, { borderColor: colors.border }]}>
            <Feather name="log-out" size={14} color={colors.mutedForeground} />
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── TYPE SELECTOR ──────────────────────────────────────────────── */}
        {screen === "type" && (
          <>
            <Text style={[styles.typeSubtitle, { color: colors.mutedForeground }]}>
              How do you want to run your franchise?
            </Text>

            {/* Solo GM */}
            <TouchableOpacity
              onPress={() => setScreen("solo-team")}
              style={[styles.typeCard, { backgroundColor: colors.card, borderColor: "#003087" + "70" }]}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: "#003087" + "25" }]}>
                <Feather name="user" size={26} color="#003087" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, { color: colors.foreground }]}>Solo GM</Text>
                <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                  Just you. Run every aspect of your franchise — roster, trades, draft, and sim.
                </Text>
                <View style={[styles.typePill, { backgroundColor: "#003087" + "20", borderColor: "#003087" + "50" }]}>
                  <Text style={[styles.typePillTxt, { color: "#003087" }]}>OFFLINE · INSTANT START</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#003087" />
            </TouchableOpacity>

            {/* Co-GM */}
            <TouchableOpacity
              onPress={() => setScreen("choose")}
              style={[styles.typeCard, { backgroundColor: colors.card, borderColor: "#C8102E" + "70" }]}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: "#C8102E" + "25" }]}>
                <Feather name="users" size={26} color="#C8102E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, { color: colors.foreground }]}>Co-GM</Text>
                <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                  One team, up to 3 GMs. Share decisions — trades and signings need group approval.
                </Text>
                <View style={[styles.typePill, { backgroundColor: "#C8102E" + "20", borderColor: "#C8102E" + "50" }]}>
                  <Text style={[styles.typePillTxt, { color: "#C8102E" }]}>CLOUD · UP TO 3 USERS · 1 TEAM</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#C8102E" />
            </TouchableOpacity>

            {/* Multiplayer - Coming Soon */}
            <View style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.45 }]}>
              <View style={[styles.typeIconWrap, { backgroundColor: "#D97706" + "25" }]}>
                <Feather name="globe" size={26} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, { color: colors.foreground }]}>Multiplayer League</Text>
                <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>
                  Each user controls their own team. Up to 32 GMs in one live league.
                </Text>
                <View style={[styles.typePill, { backgroundColor: "#D97706" + "20", borderColor: "#D97706" + "50" }]}>
                  <Text style={[styles.typePillTxt, { color: "#D97706" }]}>COMING SOON · UP TO 32 USERS</Text>
                </View>
              </View>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
            </View>
          </>
        )}

        {/* ── SOLO TEAM PICKER ────────────────────────────────────────────── */}
        {screen === "solo-team" && (
          <View style={{ gap: 16 }}>
            <View style={[styles.banner, { backgroundColor: "#003087" + "18", borderColor: "#003087" + "50" }]}>
              <Text style={{ fontSize: 36 }}>🏈</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: colors.foreground }]}>Your Team</Text>
                <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
                  Pick the franchise you want to build into a dynasty.
                </Text>
              </View>
            </View>

            <View style={[styles.selectedTeamRow, { backgroundColor: selectedSoloTeam.color + "20", borderColor: selectedSoloTeam.color + "60" }]}>
              <NFLTeamBadge abbreviation={selectedSoloTeam.abbr} primaryColor={selectedSoloTeam.color} size="md" />
              <Text style={[styles.selectedTeamName, { color: colors.foreground }]}>
                {selectedSoloTeam.city} {selectedSoloTeam.name}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamPickerRow}>
              {VFL_TEAMS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSoloTeamId(t.id)}
                  style={[styles.teamPickerItem, {
                    borderColor: soloTeamId === t.id ? t.color : "transparent",
                    backgroundColor: soloTeamId === t.id ? t.color + "25" : colors.card,
                  }]}
                >
                  <Text style={[styles.teamPickerAbbr, { color: t.color }]}>{t.abbr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {error && <ErrorBox error={error} />}

            <TouchableOpacity
              onPress={handleSoloCreate}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: loading ? colors.secondary : "#003087" }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="play" size={18} color="#fff" /><Text style={styles.submitText}>Start My Franchise →</Text></>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── SUCCESS ────────────────────────────────────────────────────── */}
        {screen === "success" && (
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: colors.nflBlue + "20", borderColor: colors.nflBlue }]}>
              <Text style={{ fontSize: 54 }}>🏆</Text>
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              You're a GM!
            </Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Your franchise is ready. Customize your team's identity, logo, and uniforms — or jump right in.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/customize")}
              style={[styles.successBtnPrimary, { backgroundColor: colors.nflBlue }]}
            >
              <Feather name="edit-2" size={16} color="#fff" />
              <Text style={styles.successBtnText}>Customize Team →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              style={[styles.successBtnSecondary, { borderColor: colors.border }]}
            >
              <Text style={[styles.successBtnSecondaryText, { color: colors.mutedForeground }]}>
                Skip for Now
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
            <InputField label="Your Display Name" placeholder="e.g. RoyalsGM" value={displayName} onChangeText={setDisplayName} icon="user" />

            {/* Team Picker */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose Your Team</Text>
            <View style={[styles.selectedTeamRow, { backgroundColor: selectedTeam.color + "20", borderColor: selectedTeam.color + "60" }]}>
              <NFLTeamBadge abbreviation={selectedTeam.abbr} primaryColor={selectedTeam.color} size="md" />
              <Text style={[styles.selectedTeamName, { color: colors.foreground }]}>{selectedTeam.city} {selectedTeam.name}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamPickerRow}>
              {VFL_TEAMS.map(t => (
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
  successContainer: { alignItems: "center", gap: 16, paddingTop: 24 },
  successIcon: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 8 },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 300 },
  successBtnPrimary: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14, width: "100%" as any, justifyContent: "center", marginTop: 8 },
  successBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  successBtnSecondary: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%" as any, alignItems: "center" },
  successBtnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, lineHeight: 20 },
  typeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 14,
  },
  typeIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  typeTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  typeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 8 },
  typePill: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  typePillTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
