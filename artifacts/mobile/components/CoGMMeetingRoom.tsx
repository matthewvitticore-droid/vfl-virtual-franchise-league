import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Clipboard, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import type { CoGMProposal, CoGMMember } from "@/context/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VFL_RED   = "#C8102E";
const VFL_BLUE  = "#003087";
const VFL_GOLD  = "#FFD700";

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function typeIcon(type: CoGMProposal["type"]): React.ComponentProps<typeof Feather>["name"] {
  switch (type) {
    case "free_agent_signing": return "user-plus";
    case "trade_submission":  return "repeat";
    case "draft_pick":        return "clipboard";
    case "phase_advance":     return "skip-forward";
    default: return "file";
  }
}

function typeLabel(type: CoGMProposal["type"]): string {
  switch (type) {
    case "free_agent_signing": return "FA SIGNING";
    case "trade_submission":  return "TRADE";
    case "draft_pick":        return "DRAFT PICK";
    case "phase_advance":     return "ADVANCE";
    default: return "PROPOSAL";
  }
}

function typeBadgeColor(type: CoGMProposal["type"]): string {
  switch (type) {
    case "free_agent_signing": return "#10B981";
    case "trade_submission":  return "#3B82F6";
    case "draft_pick":        return "#F59E0B";
    case "phase_advance":     return "#8B5CF6";
    default: return "#6B7280";
  }
}

// ─── Member Avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 36, accent }: { member: CoGMMember; size?: number; accent: string }) {
  const colors = useColors();
  const initials = member.displayName.slice(0, 2).toUpperCase();
  const roleIcon: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
    GM: "briefcase", Coach: "target", Scout: "search",
  };
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={[av.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: accent + "30", borderColor: accent + "80" }]}>
        <Text style={[av.initials, { color: accent, fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
      <View style={[av.roleBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={roleIcon[member.role] ?? "user"} size={8} color={colors.mutedForeground} />
        <Text style={[av.roleName, { color: colors.mutedForeground }]}>{member.role}</Text>
      </View>
    </View>
  );
}
const av = StyleSheet.create({
  circle:   { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: "Inter_700Bold" },
  roleBadge:{ flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  roleName: { fontFamily: "Inter_700Bold", fontSize: 7, letterSpacing: 0.4 },
});

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({ proposal, currentUserId, onVote }: {
  proposal: CoGMProposal;
  currentUserId: string | undefined;
  onVote: (id: string, vote: "yes" | "no") => Promise<void>;
}) {
  const colors = useColors();
  const [voting, setVoting] = useState(false);
  const tc = typeBadgeColor(proposal.type);

  const myVote    = proposal.votes.find(v => v.userId === currentUserId);
  const yesVotes  = proposal.votes.filter(v => v.vote === "yes");
  const noVotes   = proposal.votes.filter(v => v.vote === "no");
  const canVote   = !myVote && proposal.status === "pending";
  const isPending = proposal.status === "pending";
  const pct       = (proposal.votes.length / proposal.requiredVotes) * 100;

  async function handleVote(vote: "yes" | "no") {
    setVoting(true);
    await onVote(proposal.id, vote);
    setVoting(false);
  }

  return (
    <View style={[pc.card, {
      backgroundColor: colors.card,
      borderColor: isPending ? tc + "55" : proposal.status === "approved" ? "#10B98155" : "#EF444455",
      borderLeftColor: isPending ? tc : proposal.status === "approved" ? "#10B981" : "#EF4444",
    }]}>
      <LinearGradient colors={[tc + "12", "transparent"]} style={StyleSheet.absoluteFill} />

      {/* Header row */}
      <View style={pc.header}>
        <View style={[pc.typeBadge, { backgroundColor: tc + "25" }]}>
          <Feather name={typeIcon(proposal.type)} size={10} color={tc} />
          <Text style={[pc.typeText, { color: tc }]}>{typeLabel(proposal.type)}</Text>
        </View>
        <Text style={[pc.time, { color: colors.mutedForeground }]}>{elapsed(proposal.createdAt)}</Text>
        {proposal.status !== "pending" && (
          <View style={[pc.statusBadge, {
            backgroundColor: proposal.status === "approved" ? "#10B98125" : "#EF444425",
          }]}>
            <Feather
              name={proposal.status === "approved" ? "check-circle" : "x-circle"}
              size={10}
              color={proposal.status === "approved" ? "#10B981" : "#EF4444"}
            />
            <Text style={[pc.statusText, {
              color: proposal.status === "approved" ? "#10B981" : "#EF4444",
            }]}>{proposal.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={[pc.desc, { color: colors.foreground }]}>{proposal.description}</Text>
      <Text style={[pc.proposedBy, { color: colors.mutedForeground }]}>
        Proposed by {proposal.createdByName}
      </Text>

      {/* Vote progress */}
      <View style={pc.progressRow}>
        <View style={[pc.progressTrack, { backgroundColor: colors.secondary }]}>
          <View style={[pc.progressFill, { width: `${pct}%` as any, backgroundColor: tc }]} />
        </View>
        <Text style={[pc.progressText, { color: colors.mutedForeground }]}>
          {proposal.votes.length}/{proposal.requiredVotes} voted
        </Text>
      </View>

      {/* Vote breakdown */}
      <View style={pc.voteRow}>
        {yesVotes.length > 0 && (
          <View style={pc.voteGroup}>
            <Feather name="thumbs-up" size={11} color="#10B981" />
            <Text style={[pc.voteNames, { color: "#10B981" }]}>
              {yesVotes.map(v => v.displayName).join(", ")}
            </Text>
          </View>
        )}
        {noVotes.length > 0 && (
          <View style={pc.voteGroup}>
            <Feather name="thumbs-down" size={11} color="#EF4444" />
            <Text style={[pc.voteNames, { color: "#EF4444" }]}>
              {noVotes.map(v => v.displayName).join(", ")}
            </Text>
          </View>
        )}
      </View>

      {/* Vote buttons */}
      {canVote && (
        <View style={pc.btnRow}>
          {voting ? (
            <ActivityIndicator color={tc} size="small" style={{ flex: 1 }} />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => handleVote("yes")}
                style={[pc.yesBtn, { backgroundColor: "#10B981" }]}
              >
                <Feather name="thumbs-up" size={14} color="#fff" />
                <Text style={pc.btnText}>APPROVE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleVote("no")}
                style={[pc.noBtn, { borderColor: "#EF4444" }]}
              >
                <Feather name="thumbs-down" size={14} color="#EF4444" />
                <Text style={[pc.btnText, { color: "#EF4444" }]}>REJECT</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {myVote && (
        <View style={[pc.myVoteBadge, { backgroundColor: myVote.vote === "yes" ? "#10B98120" : "#EF444420" }]}>
          <Feather name={myVote.vote === "yes" ? "check" : "x"} size={11} color={myVote.vote === "yes" ? "#10B981" : "#EF4444"} />
          <Text style={[pc.myVoteText, { color: myVote.vote === "yes" ? "#10B981" : "#EF4444" }]}>
            You voted {myVote.vote === "yes" ? "APPROVE" : "REJECT"}
          </Text>
        </View>
      )}
    </View>
  );
}
const pc = StyleSheet.create({
  card:       { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, padding: 14,
                overflow: "hidden", marginBottom: 10 },
  header:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  typeBadge:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8,
                paddingVertical: 3, borderRadius: 8 },
  typeText:   { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  time:       { fontFamily: "Inter_400Regular", fontSize: 10, marginLeft: "auto" as any },
  statusBadge:{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8,
                paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.6 },
  desc:       { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 19, marginBottom: 3 },
  proposedBy: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 10 },
  progressRow:{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: 4, borderRadius: 2 },
  progressText:{ fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  voteRow:    { gap: 4, marginBottom: 10 },
  voteGroup:  { flexDirection: "row", alignItems: "center", gap: 6 },
  voteNames:  { fontFamily: "Inter_400Regular", fontSize: 11 },
  btnRow:     { flexDirection: "row", gap: 10, marginTop: 4 },
  yesBtn:     { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 7, paddingVertical: 10, borderRadius: 10 },
  noBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 7, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                backgroundColor: "transparent" },
  btnText:    { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.5, color: "#fff" },
  myVoteBadge:{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10,
                paddingVertical: 7, borderRadius: 8, marginTop: 4 },
  myVoteText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});

// ─── Main Meeting Room ────────────────────────────────────────────────────────

export function CoGMMeetingRoom() {
  const colors  = useColors();
  const theme   = useTeamTheme();
  const router  = useRouter();
  const { user, membership, session, isLoading, refreshMembership } = useAuth();
  const { season, pendingProposals, coGMMembers, voteOnProposal } = useNFL();
  const [filter,     setFilter]     = useState<"pending" | "all">("pending");
  const [retrying,   setRetrying]   = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [onlineIds,  setOnlineIds]  = useState<string[]>([]);
  // Local storage fallbacks — shown when Supabase session isn't active
  const [localGmMode,          setLocalGmMode]          = useState("");
  const [storedCode,           setStoredCode]           = useState("");
  const [storedFranchiseName,  setStoredFranchiseName]  = useState("");
  const [localLoaded,          setLocalLoaded]          = useState(false);
  const channelRef    = useRef<any>(null);
  const autoAttempted = useRef(false);

  // ── Load local fallback data from AsyncStorage ─────────────────────────────
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("vfl_gm_mode"),
      AsyncStorage.getItem("vfl_franchise_code"),
      AsyncStorage.getItem("vfl_franchise_name"),
      // Also try the temp key in case they haven't cleared it yet
      AsyncStorage.getItem("vfl_created_join_code"),
      AsyncStorage.getItem("vfl_created_franchise_name"),
    ]).then(([mode, code, name, tmpCode, tmpName]) => {
      if (mode) setLocalGmMode(mode);
      if (code || tmpCode) setStoredCode(code || tmpCode || "");
      if (name || tmpName) setStoredFranchiseName(name || tmpName || "");
      setLocalLoaded(true);
    });
  }, []);

  // ── Auto-reconnect: fires once when auth finishes loading but no membership ─
  useEffect(() => {
    if (!isLoading && session && !membership && !autoAttempted.current) {
      autoAttempted.current = true;
      setRetrying(true);
      refreshMembership().finally(() => setRetrying(false));
    }
  }, [isLoading, session, membership]);

  // ── Supabase Realtime presence — tracks who's online ───────────────────────
  useEffect(() => {
    if (!membership?.franchiseId || !user?.id || !SUPABASE_ENABLED) return;
    const ch = supabase.channel(`vfl:presence:${membership.franchiseId}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      setOnlineIds(Object.keys(ch.presenceState()));
    });
    ch.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ userId: user.id, displayName: membership.displayName });
        setOnlineIds(prev => prev.includes(user.id) ? prev : [...prev, user.id]);
      }
    });
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [membership?.franchiseId, user?.id]);

  // ── Derived display values — Supabase preferred, local fallback ────────────
  const myTeam = season?.teams?.find((t: any) => t.id === season?.playerTeamId);
  const localTeamName = myTeam ? `${myTeam.city} ${myTeam.name}` : "My Franchise";

  const displayFranchiseName = membership?.franchiseName || storedFranchiseName || localTeamName;
  // Raw 6-char code — Supabase preferred, then permanent local key, then temp local key
  const rawCode     = membership?.joinCode || storedCode;
  // Formatted for display: always VFL-XXXXXX
  const displayCode = rawCode ? (rawCode.startsWith("VFL-") ? rawCode : `VFL-${rawCode}`) : "";
  const displayRole = membership?.role          || "GM";
  const displayName = membership?.displayName   || user?.email?.split("@")[0] || "Co-GM";

  // Code is still loading when session exists but membership hasn't arrived yet
  const codeLoading = !!session && !membership && (isLoading || retrying);

  // Can we show the full room? Yes if Supabase membership, OR if local franchise exists
  const isLocalFranchise = localLoaded && (localGmMode === "cogm" || localGmMode === "join") && !!season;
  const canShowRoom      = !!membership || isLocalFranchise;

  function copyCode() {
    // Copy the raw code without VFL- prefix so it can be pasted directly into the join field
    Clipboard.setString(rawCode ?? displayCode ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  // ── Still initializing ─────────────────────────────────────────────────────
  if ((!localLoaded || isLoading || retrying) && !canShowRoom) {
    return (
      <View style={mr.offlineBox}>
        <ActivityIndicator size="large" color="#003087" style={{ marginBottom: 14 }} />
        <Text style={[mr.offlineTitle, { color: colors.foreground }]}>Loading Franchise…</Text>
        <Text style={[mr.offlineSub, { color: colors.mutedForeground }]}>Connecting to your Co-GM account</Text>
      </View>
    );
  }

  // ── Not in a franchise at all ──────────────────────────────────────────────
  if (!canShowRoom) {
    if (session) {
      return (
        <View style={mr.offlineBox}>
          <LinearGradient colors={["#003087" + "30", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[mr.offlineTitle, { color: colors.foreground }]}>No Franchise Linked</Text>
          <Text style={[mr.offlineSub, { color: colors.mutedForeground }]}>
            Your account doesn't have a franchise yet. Create one from the launch screen or ask your commissioner for an invite code.
          </Text>
          <TouchableOpacity
            onPress={async () => { setRetrying(true); await refreshMembership(); setRetrying(false); }}
            style={[mr.offlineBtn, { backgroundColor: "#003087" }]}
          >
            <Feather name="refresh-cw" size={14} color="#fff" />
            <Text style={mr.offlineBtnTxt}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={mr.offlineBox}>
        <LinearGradient colors={["#C8102E20", "transparent"]} style={StyleSheet.absoluteFill} />
        <Feather name="lock" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
        <Text style={[mr.offlineTitle, { color: colors.foreground }]}>Sign In to Access</Text>
        <Text style={[mr.offlineSub, { color: colors.mutedForeground }]}>
          Sign in with your Co-GM account to open the Meeting Room and sync with your franchise.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          style={[mr.offlineBtn, { backgroundColor: "#C8102E" }]}
        >
          <Feather name="log-in" size={14} color="#fff" />
          <Text style={mr.offlineBtnTxt}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Full Meeting Room ──────────────────────────────────────────────────────
  const tc = theme.primary;
  const tc2 = theme.secondary;
  const allProposals  = season?.proposals ?? [];
  const shownProposals = filter === "pending"
    ? allProposals.filter(p => p.status === "pending")
    : allProposals;

  const phase = season?.phase ?? "regular";
  const isGated = ["draft", "freeAgency"].includes(phase);
  const phaseProposals = pendingProposals.filter(p => p.type === "phase_advance");
  const myPhaseVote = phaseProposals[0]?.votes.find(v => v.userId === user?.id);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40, gap: 0 }}
    >
      {/* ── Franchise Header ─────────────────────────────────────────────── */}
      <View style={[mr.header, { backgroundColor: colors.card, borderBottomColor: tc + "50" }]}>
        <LinearGradient colors={[tc + "40", tc + "15", "transparent"]} style={StyleSheet.absoluteFill} />
        <View style={mr.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[mr.franchiseName, { color: colors.foreground }]}>{displayFranchiseName}</Text>
            <Text style={[mr.headerSub, { color: colors.mutedForeground }]}>
              {displayRole} · {displayName}
            </Text>
          </View>
        </View>

        {/* Members with online status */}
        <View style={mr.membersRow}>
          {coGMMembers.map(m => {
            const isOnline = onlineIds.includes(m.userId);
            return (
              <View key={m.userId} style={{ alignItems: "center" }}>
                <View style={{ position: "relative" }}>
                  <MemberAvatar member={m} accent={tc} />
                  <View style={[mr.onlineDot, {
                    backgroundColor: isOnline ? "#10B981" : "#6B7280",
                    borderColor: colors.card,
                  }]} />
                </View>
                <Text style={[mr.onlineLabel, { color: isOnline ? "#10B981" : colors.mutedForeground }]}>
                  {isOnline ? "online" : "offline"}
                </Text>
              </View>
            );
          })}
          {coGMMembers.length < 3 && (
            <View style={[mr.addSlot, { borderColor: colors.border }]}>
              <Feather name="user-plus" size={16} color={colors.mutedForeground} />
              <Text style={[mr.addSlotText, { color: colors.mutedForeground }]}>Invite</Text>
            </View>
          )}
        </View>

        {/* ── Invite Code ─────────────────────────────────────────────────── */}
        <View style={[mr.inviteBlock, { borderColor: VFL_GOLD + "40", backgroundColor: VFL_GOLD + "10" }]}>
          <View style={mr.inviteTop}>
            <Feather name="share-2" size={13} color={VFL_GOLD} />
            <Text style={[mr.inviteLabel, { color: VFL_GOLD }]}>FRANCHISE INVITE CODE</Text>
            <Text style={[mr.inviteHint, { color: colors.mutedForeground }]}>Share with Co-GMs</Text>
          </View>
          {codeLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 14 }}>
              <ActivityIndicator size="small" color={VFL_GOLD} />
            </View>
          ) : displayCode ? (
            <>
              <View style={mr.inviteCodeRow}>
                {displayCode.split("").map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      mr.inviteLetter,
                      {
                        backgroundColor: colors.background,
                        borderColor: ch === "-" ? "transparent" : VFL_GOLD + "60",
                        minWidth: ch === "-" ? 8 : undefined,
                      },
                    ]}
                  >
                    <Text style={[mr.inviteLetterTxt, { color: ch === "-" ? VFL_GOLD : colors.foreground }]}>{ch}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={copyCode} style={[mr.copyBtn, { backgroundColor: copied ? "#10B981" : VFL_GOLD }]}>
                <Feather name={copied ? "check" : "copy"} size={13} color="#000" />
                <Text style={mr.copyBtnTxt}>{copied ? "COPIED!" : "COPY CODE"}</Text>
              </TouchableOpacity>
            </>
          ) : session ? (
            // Session exists but membership query returned no code — retry fetch
            <TouchableOpacity
              onPress={async () => { setRetrying(true); await refreshMembership(); setRetrying(false); }}
              style={[mr.copyBtn, { backgroundColor: VFL_BLUE, marginTop: 10 }]}
            >
              <Feather name="refresh-cw" size={13} color="#fff" />
              <Text style={[mr.copyBtnTxt, { color: "#fff" }]}>Reload Code</Text>
            </TouchableOpacity>
          ) : (
            // No session at all — must sign in to fetch the code from Supabase
            <>
              <Text style={[mr.inviteHint, { color: colors.mutedForeground, textAlign: "center", marginTop: 6, marginBottom: 4 }]}>
                Sign in to view your franchise invite code
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/auth/login")}
                style={[mr.copyBtn, { backgroundColor: "#C8102E", marginTop: 6 }]}
              >
                <Feather name="log-in" size={13} color="#fff" />
                <Text style={[mr.copyBtnTxt, { color: "#fff" }]}>Sign In to View Code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Phase Gate Banner ────────────────────────────────────────────── */}
      {isGated && (
        <View style={[mr.gateBox, { backgroundColor: "#8B5CF620", borderColor: "#8B5CF680" }]}>
          <LinearGradient colors={["#8B5CF630", "transparent"]} style={StyleSheet.absoluteFill} />
          <View style={mr.gateRow}>
            <Feather name="alert-circle" size={18} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text style={[mr.gateTitle, { color: colors.foreground }]}>
                {phase === "draft" ? "🏈 Draft Room: All GMs Must Approve Picks" : "📋 Free Agency: All GMs Must Approve Signings"}
              </Text>
              <Text style={[mr.gateSub, { color: colors.mutedForeground }]}>
                Every pick or signing in this phase goes to the Meeting Room for a vote first.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── VFL Bowl Gate ────────────────────────────────────────────────── */}
      {season?.phase === "offseason" && season?.vflBowlWinnerId && (
        <View style={[mr.gateBox, { backgroundColor: VFL_GOLD + "15", borderColor: VFL_GOLD + "55" }]}>
          <View style={mr.gateRow}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={[mr.gateTitle, { color: colors.foreground }]}>
                VFL Bowl Complete — Ready for next season?
              </Text>
              <Text style={[mr.gateSub, { color: colors.mutedForeground }]}>
                All Co-GMs must submit proposals to advance to the next year.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Proposals Section ────────────────────────────────────────────── */}
      <View style={mr.section}>
        {/* Filter tabs */}
        <View style={mr.filterRow}>
          <View style={mr.filterLeft}>
            <Feather name="inbox" size={14} color={tc} />
            <Text style={[mr.sectionTitle, { color: colors.foreground }]}>Meeting Room</Text>
            {pendingProposals.length > 0 && (
              <View style={[mr.badge, { backgroundColor: tc }]}>
                <Text style={mr.badgeText}>{pendingProposals.length}</Text>
              </View>
            )}
          </View>
          <View style={mr.filterTabs}>
            {(["pending", "all"] as const).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[mr.filterTab, {
                  backgroundColor: filter === f ? tc : tc + "18",
                  borderColor:     filter === f ? tc : tc + "35",
                }]}
              >
                <Text style={[mr.filterTabText, { color: filter === f ? "#fff" : "rgba(255,255,255,0.55)" }]}>
                  {f === "pending" ? "Pending" : "All"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Proposal list */}
        {shownProposals.length === 0 ? (
          <View style={[mr.emptyBox, { borderColor: tc + "30" }]}>
            <LinearGradient colors={[tc + "10", "transparent"]} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🤝</Text>
            <Text style={[mr.emptyTitle, { color: colors.foreground }]}>
              {filter === "pending" ? "No pending proposals" : "No proposals yet"}
            </Text>
            <Text style={[mr.emptySub, { color: colors.mutedForeground }]}>
              {filter === "pending"
                ? "When a Co-GM proposes a signing, trade, or draft pick — it appears here for your vote."
                : "All franchise transactions will appear here once the season is underway."}
            </Text>
          </View>
        ) : (
          shownProposals
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                currentUserId={user?.id}
                onVote={voteOnProposal}
              />
            ))
        )}
      </View>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      {allProposals.length === 0 && (
        <View style={mr.section}>
          <View style={[mr.howBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[mr.howTitle, { color: colors.foreground }]}>How Co-GM Mode Works</Text>
            {[
              { icon: "user-plus" as const, color: "#10B981", label: "Free Agency", desc: "Any GM can propose a signing. All Co-GMs vote to approve before the deal goes live." },
              { icon: "repeat" as const, color: "#3B82F6", label: "Trades",  desc: "Proposed trades go to the Meeting Room first. Once approved, the offer is sent to the CPU." },
              { icon: "clipboard" as const, color: "#F59E0B", label: "Draft Picks", desc: "On draft day, picks require all Co-GMs to vote YES before the selection is locked in." },
              { icon: "skip-forward" as const, color: "#8B5CF6", label: "Phase Advances", desc: "Draft, Free Agency, and VFL Bowl transitions gate the game until all GMs are ready." },
            ].map(h => (
              <View key={h.label} style={[mr.howRow, { borderTopColor: colors.border }]}>
                <View style={[mr.howIcon, { backgroundColor: h.color + "20" }]}>
                  <Feather name={h.icon} size={14} color={h.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[mr.howLabel, { color: colors.foreground }]}>{h.label}</Text>
                  <Text style={[mr.howDesc,  { color: colors.mutedForeground }]}>{h.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const mr = StyleSheet.create({
  header:      { padding: 20, borderBottomWidth: 1, overflow: "hidden", marginBottom: 0 },
  headerTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  franchiseName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  headerSub:   { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  codeBox:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", gap: 2 },
  codeLabel:   { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  codeVal:     { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 4 },
  membersRow:  { flexDirection: "row", gap: 20 },
  addSlot:     { alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed" as any },
  addSlotText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.5 },
  gateBox:     { margin: 16, borderRadius: 14, borderWidth: 1, padding: 16, overflow: "hidden" },
  gateRow:     { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  gateTitle:   { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 4 },
  gateSub:     { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  section:     { paddingHorizontal: 16, paddingTop: 16 },
  filterRow:   { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  filterLeft:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:{ fontFamily: "Inter_700Bold", fontSize: 16 },
  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText:   { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },
  filterTabs:  { flexDirection: "row", gap: 6 },
  filterTab:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterTabText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  emptyBox:    { borderRadius: 14, borderWidth: 1, overflow: "hidden", alignItems: "center",
                 padding: 28, gap: 6, marginBottom: 4 },
  emptyTitle:  { fontFamily: "Inter_700Bold", fontSize: 15 },
  emptySub:    { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18 },
  howBox:      { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
  howTitle:    { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 14 },
  howRow:      { flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: 0.5, alignItems: "flex-start" },
  howIcon:     { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  howLabel:    { fontFamily: "Inter_700Bold", fontSize: 13, marginBottom: 2 },
  howDesc:     { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  offlineBox:  { margin: 16, borderRadius: 16, padding: 28, alignItems: "center", overflow: "hidden",
                 borderWidth: 1, borderColor: "#003087" + "50", backgroundColor: "#07182E" },
  offlineTitle:{ fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 6, textAlign: "center" },
  offlineSub:  { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 20 },
  offlineBtn:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24,
                 paddingVertical: 12, borderRadius: 12 },
  offlineBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  inviteBlock: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16, alignItems: "center", gap: 10 },
  inviteTop:   { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "stretch" },
  inviteLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, flex: 1 },
  inviteHint:  { fontFamily: "Inter_400Regular", fontSize: 10 },
  inviteCodeRow: { flexDirection: "row", gap: 8 },
  inviteLetter:{ width: 38, height: 46, borderRadius: 8, borderWidth: 1.5,
                 alignItems: "center", justifyContent: "center" },
  inviteLetterTxt: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 0 },
  copyBtn:     { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 24,
                 paddingVertical: 10, borderRadius: 10, alignSelf: "stretch", justifyContent: "center" },
  copyBtnTxt:  { fontFamily: "Inter_700Bold", fontSize: 13, color: "#000", letterSpacing: 0.5 },
  onlineDot:   { position: "absolute", bottom: 2, right: 2, width: 10, height: 10,
                 borderRadius: 5, borderWidth: 2 },
  onlineLabel: { fontFamily: "Inter_400Regular", fontSize: 9, letterSpacing: 0.3, marginTop: 2 },
});
