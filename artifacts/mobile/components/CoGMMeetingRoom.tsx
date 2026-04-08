import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";
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
  const { user, membership } = useAuth();
  const { season, pendingProposals, coGMMembers, voteOnProposal, isCoGMMode } = useNFL();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  if (!isCoGMMode || !membership) return null;

  const tc = theme.primary;
  const tc2 = theme.secondary;
  const allProposals  = season?.proposals ?? [];
  const shownProposals = filter === "pending"
    ? allProposals.filter(p => p.status === "pending")
    : allProposals;

  // Phase gate info
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
          <View>
            <Text style={[mr.franchiseName, { color: colors.foreground }]}>{membership.franchiseName}</Text>
            <Text style={[mr.headerSub, { color: colors.mutedForeground }]}>
              {membership.role} · {membership.displayName}
            </Text>
          </View>
          {/* Join Code */}
          <View style={[mr.codeBox, { backgroundColor: VFL_GOLD + "20", borderColor: VFL_GOLD + "60" }]}>
            <Feather name="link" size={11} color={VFL_GOLD} />
            <Text style={[mr.codeLabel, { color: VFL_GOLD }]}>Join Code</Text>
            <Text style={[mr.codeVal, { color: colors.foreground }]}>{membership.joinCode}</Text>
          </View>
        </View>

        {/* Members */}
        <View style={mr.membersRow}>
          {coGMMembers.map(m => (
            <MemberAvatar key={m.userId} member={m} accent={tc} />
          ))}
          {coGMMembers.length < 3 && (
            <View style={[mr.addSlot, { borderColor: colors.border }]}>
              <Feather name="user-plus" size={16} color={colors.mutedForeground} />
              <Text style={[mr.addSlotText, { color: colors.mutedForeground }]}>Invite</Text>
            </View>
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
});
