import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
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
import { supabase } from "@/lib/supabase";

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
  { value: "GM", label: "Co-General Manager", desc: "Team up and make proposals to elevate your roster and bring a shared vision for a team to life across seasons!", icon: "briefcase" },
];

type Screen = "type" | "choose" | "create" | "join" | "success" | "solo-team";

export default function FranchiseLobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { initialScreen } = useLocalSearchParams<{ initialScreen?: string }>();
  const { user, membership, createFranchise, joinFranchise, signOut } = useAuth();

  const [screen, setScreen] = useState<Screen>((initialScreen as Screen) ?? "type");
  const [soloTeamId, setSoloTeamId] = useState("team-13"); // Coastal Sharks default

  // Create state
  const [franchiseName, setFranchiseName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("team-13"); // Reno Royals
  const [createRole, setCreateRole] = useState<FranchiseMemberRole>("GM");
  const [displayName, setDisplayName] = useState("");

  // Join state
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState<FranchiseMemberRole>("GM");
  const [joinDisplayName, setJoinDisplayName] = useState("");

  // Created franchise join code (shown on success screen)
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);

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

    // Step 1: Create the franchise record (franchises + franchise_members rows)
    const { error: err, joinCode: created, franchiseId } = await createFranchise(
      franchiseName.trim(), selectedTeamId, createRole, displayName.trim()
    );
    if (err || !franchiseId) { setLoading(false); setError(err ?? "Failed to create franchise."); return; }

    // Step 2: Guard — check if franchise_seasons already exists for this franchise.
    // This should never happen for a brand-new franchise, but if it does we must
    // NOT overwrite the existing state. Instead load it and continue.
    const { data: existing } = await supabase
      .from("franchise_seasons").select("franchise_id")
      .eq("franchise_id", franchiseId).maybeSingle();

    if (existing) {
      // Row already present (e.g. retry after network error) — do not re-initialize.
      console.log("[VFL] franchise_seasons already seeded for", franchiseId, "— skipping initSeason");
      await AsyncStorage.setItem("vfl_gm_mode", "co-gm");
      setLoading(false);
      setCreatedJoinCode(created);
      setScreen("success");
      return;
    }

    // Step 3: Generate the initial season — ONLY at creation time, ONLY if no row exists yet.
    const season = initSeason(selectedTeamId);
    await bigSet("vfl_season_v1", JSON.stringify(season));
    await AsyncStorage.setItem("vfl_gm_mode", "co-gm");

    // Step 4: Push the season to Supabase as the single source of truth.
    // Use INSERT (not upsert) so we never accidentally overwrite a concurrent state.
    const myTeam = season.teams.find((t: any) => t.id === season.playerTeamId);
    const { error: insertErr } = await supabase.from("franchise_seasons").insert({
      franchise_id: franchiseId,
      year:  season.year  ?? 2026,
      phase: season.phase ?? "regular",
      week:  season.currentWeek ?? 1,
      record: myTeam
        ? { wins: myTeam.wins, losses: myTeam.losses, ties: myTeam.ties }
        : { wins: 0, losses: 0, ties: 0 },
      sim_state:  season,
      updated_by: user?.id,
    });

    if (insertErr && insertErr.code !== "23505") {
      // 23505 = unique violation (row snuck in between guard check and insert) — safe to ignore
      console.warn("[VFL] franchise_seasons insert failed:", insertErr.message, "— trying v1 fallback");
      // v1 schema fallback (legacy)
      await supabase.from("franchise_state").upsert(
        { franchise_id: franchiseId, state_json: season, updated_by: user?.id },
        { onConflict: "franchise_id" }
      );
    }

    setLoading(false);
    setCreatedJoinCode(created);
    setScreen("success");
  };

  const handleResume = async () => {
    if (!membership) return;
    setLoading(true);
    try {
      await AsyncStorage.setItem("vfl_gm_mode", "co-gm");
      // Pull latest state from cloud
      const { data: row } = await supabase
        .from("franchise_seasons").select("sim_state")
        .eq("franchise_id", membership.franchiseId).maybeSingle();
      if (row?.sim_state) {
        await bigSet("vfl_season_v1", JSON.stringify(row.sim_state));
      }
      router.replace("/(tabs)");
    } catch {}
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError("Please enter the 6-character join code."); return; }
    if (!joinDisplayName.trim()) { setError("Please enter your display name."); return; }
    setLoading(true); setError(null);
    const err = await joinFranchise(joinCode.trim(), joinRole, joinDisplayName.trim());
    if (err) { setLoading(false); setError(err); return; }
    // Pull the shared franchise state from Supabase so this co-GM has the same save
    try {
      const { data: memberRow } = await supabase
        .from("franchise_members")
        .select("franchise_id")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (memberRow?.franchise_id) {
        const { data: newRow, error: newErr } = await supabase
          .from("franchise_seasons").select("sim_state")
          .eq("franchise_id", memberRow.franchise_id).maybeSingle();
        if (!newErr && newRow?.sim_state) {
          await bigSet("vfl_season_v1", JSON.stringify(newRow.sim_state));
        } else {
          // v1 fallback
          const { data: oldRow } = await supabase
            .from("franchise_state").select("state_json")
            .eq("franchise_id", memberRow.franchise_id).maybeSingle();
          if (oldRow?.state_json) {
            await bigSet("vfl_season_v1", JSON.stringify(oldRow.state_json));
          }
        }
      }
      await AsyncStorage.setItem("vfl_gm_mode", "co-gm");
    } catch {}
    setLoading(false);
    router.replace("/(tabs)");
  };

  const handleSoloCreate = async () => {
    setLoading(true);
    try {
      const season = initSeason(soloTeamId);
      await bigSet("vfl_season_v1", JSON.stringify(season));
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
              Franchise Created!
            </Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              Share this code with your co-GM so they can join.
            </Text>
            {createdJoinCode && (
              <TouchableOpacity
                onPress={() => Share.share({ message: `Join my VFL franchise! Use code: ${createdJoinCode}` })}
                style={[styles.joinCodeBox, { backgroundColor: colors.card, borderColor: colors.nflGold }]}
              >
                <Text style={[styles.joinCodeText, { color: colors.nflGold }]}>{createdJoinCode}</Text>
                <Feather name="share-2" size={16} color={colors.nflGold} style={{ marginTop: 6 }} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              style={[styles.successBtnPrimary, { backgroundColor: colors.nflBlue }]}
            >
              <Feather name="arrow-right" size={16} color="#fff" />
              <Text style={styles.successBtnText}>Enter Franchise HQ</Text>
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

            {/* Resume if already a member */}
            {membership && (
              <TouchableOpacity
                onPress={handleResume}
                disabled={loading}
                style={[styles.optionCard, { backgroundColor: "#10B98115", borderColor: "#10B98170", borderWidth: 2 }]}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#10B98125" }]}>
                  <Feather name="play-circle" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: "#10B981" }]}>Resume Franchise</Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                    {membership.franchiseName || "Your Co-GM franchise"} · {membership.role}
                  </Text>
                </View>
                {loading
                  ? <ActivityIndicator size="small" color="#10B981" />
                  : <Feather name="chevron-right" size={18} color="#10B981" />}
              </TouchableOpacity>
            )}

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
  codeInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 16 },
  codeInput: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 4 },
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
  joinCodeBox: { alignItems: "center", borderRadius: 16, borderWidth: 2, paddingVertical: 20, paddingHorizontal: 32, width: "100%" as any },
  joinCodeText: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 6 },
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
