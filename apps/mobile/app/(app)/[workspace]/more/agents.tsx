import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@multica/core/types";
import type { AgentPresenceDetail } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { agentListOptions } from "@/data/queries/agents";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useAuthStore } from "@/data/auth-store";
import { canAssignAgentToIssue } from "@multica/core/permissions";
import { memberListOptions } from "@/data/queries/members";
import { useWorkspacePresenceMap } from "@/lib/use-agent-presence";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

type AgentFilter = "all" | "working" | "idle" | "errors";

const STATUS_COLORS = {
  working: "#77d6b3",
  queued: "#f4bd64",
  idle: "#8c94aa",
  error: "#f07979",
} as const;

export default function AgentsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { t } = useT("navigation");
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;
  const accent = THEME[colorScheme].brand;
  const { data: agents = [], isLoading, error, refetch } = useQuery(agentListOptions(wsId));
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: taskSnapshot = [] } = useQuery(agentTaskSnapshotOptions(wsId));
  const { byAgent: presenceByAgent } = useWorkspacePresenceMap(wsId);
  const [filter, setFilter] = useState<AgentFilter>("all");
  const memberRole = members.find((member) => member.user_id === userId)?.role ?? null;
  const activeAgents = useMemo(() => agents.filter((agent) => !agent.archived_at), [agents]);
  const recentFailures = useMemo(() => {
    const failed = new Set<string>();
    for (const task of taskSnapshot) {
      if (task.status === "failed") failed.add(task.agent_id);
    }
    return failed;
  }, [taskSnapshot]);
  const counts = useMemo(() => {
    let working = 0;
    let idle = 0;
    for (const agent of activeAgents) {
      const workload = presenceByAgent.get(agent.id)?.workload;
      if (workload === "working") working += 1;
      else if (workload === "idle") idle += 1;
    }
    const errors = activeAgents.reduce((count, agent) => count + Number(recentFailures.has(agent.id)), 0);
    return { working, idle, errors };
  }, [activeAgents, presenceByAgent, recentFailures]);
  const visibleAgents = useMemo(() => {
    const byPriority = [...activeAgents].sort((a, b) => {
      const score = (agent: Agent) => {
        const presence = presenceByAgent.get(agent.id);
        if (presence?.workload === "working") return 0;
        if (presence?.workload === "queued") return 1;
        return 2;
      };
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });
    return byPriority.filter((agent) => {
      const workload = presenceByAgent.get(agent.id)?.workload;
      if (filter === "working") return workload === "working";
      if (filter === "idle") return workload === "idle";
      if (filter === "errors") return recentFailures.has(agent.id);
      return true;
    });
  }, [activeAgents, filter, presenceByAgent, recentFailures]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <Stack.Screen options={{ title: t("agents.office_title") }} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-sm text-destructive">{t("agents.load_failed")}</Text>
          <Pressable accessibilityRole="button" onPress={() => void refetch()} className="rounded-xl bg-secondary px-4 py-2">
            <Text className="font-medium text-foreground">{t("agents.retry")}</Text>
          </Pressable>
        </View>
      ) : activeAgents.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Ionicons name="hardware-chip-outline" size={32} color={muted} />
          <Text className="text-base font-semibold text-foreground">{t("agents.empty_title")}</Text>
          <Text className="text-center text-sm text-muted-foreground">{t("agents.empty_hint")}</Text>
        </View>
      ) : (
        <FlatList
          data={visibleAgents}
          keyExtractor={(agent) => agent.id}
          contentContainerClassName="gap-4 px-4 pb-8 pt-3"
          ListHeaderComponent={(
            <View className="gap-4">
              <View className="flex-row gap-2">
                <SummaryChip label={t("agents.working")} count={counts.working} selected={filter === "working"} color={STATUS_COLORS.working} onPress={() => setFilter(filter === "working" ? "all" : "working")} />
                <SummaryChip label={t("agents.idle")} count={counts.idle} selected={filter === "idle"} color={STATUS_COLORS.idle} onPress={() => setFilter(filter === "idle" ? "all" : "idle")} />
                <SummaryChip label={t("agents.recent_errors")} count={counts.errors} selected={filter === "errors"} color={STATUS_COLORS.error} onPress={() => setFilter(filter === "errors" ? "all" : "errors")} />
              </View>
              <OfficeScene agents={activeAgents} presenceByAgent={presenceByAgent} recentFailures={recentFailures} label={t("agents.workspace_zone")} plusLabel={(values) => t("agents.more_agents", values)} />
              <View className="flex-row items-center justify-between px-1 pt-1">
                <Text className="text-lg font-bold text-foreground">{filter === "all" ? t("agents.team_title") : t(`agents.filter_title.${filter}`)}</Text>
                <Text className="text-xs text-muted-foreground">{t("agents.agent_count", { count: visibleAgents.length })}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View className="items-center gap-2 rounded-2xl bg-card px-6 py-8">
              <Ionicons name={filter === "errors" ? "checkmark-circle-outline" : "sparkles-outline"} size={26} color={muted} />
              <Text className="text-sm text-muted-foreground">{t(filter === "errors" ? "agents.no_recent_errors" : "agents.no_filtered_agents")}</Text>
            </View>
          )}
          refreshing={false}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <AgentRow
              agent={item}
              workload={presenceByAgent.get(item.id)?.workload ?? "idle"}
              availability={presenceByAgent.get(item.id)?.availability ?? item.runtime_availability ?? "offline"}
              runningCount={presenceByAgent.get(item.id)?.runningCount ?? 0}
              hasRecentFailure={recentFailures.has(item.id)}
              canChat={canAssignAgentToIssue(item, { userId, role: memberRole }).allowed}
              onChat={() => {
                if (slug) router.push(`/${slug}/chat?agentId=${encodeURIComponent(item.id)}`);
              }}
              accent={accent}
              muted={muted}
              t={t}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryChip({
  label,
  count,
  selected,
  color,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="min-h-[62px] flex-1 justify-center rounded-2xl border px-3 py-2 active:opacity-75"
      style={{ backgroundColor: selected ? `${color}25` : `${color}12`, borderColor: `${color}50` }}
    >
      <Text className="text-center text-xl font-bold text-foreground">{count}</Text>
      <Text className="text-center text-[11px] font-medium" style={{ color }}>{label}</Text>
    </Pressable>
  );
}

function OfficeScene({
  agents,
  presenceByAgent,
  recentFailures,
  label,
  plusLabel,
}: {
  agents: Agent[];
  presenceByAgent: Map<string, AgentPresenceDetail>;
  recentFailures: Set<string>;
  label: string;
  plusLabel: (values: { count: number }) => string;
}) {
  const statusScore = (agent: Agent) => {
    const presence = presenceByAgent.get(agent.id);
    if (presence?.workload === "working") return 0;
    if (presence?.workload === "queued") return 1;
    if (recentFailures.has(agent.id)) return 2;
    if (presence?.availability === "online") return 3;
    return 4;
  };
  const shownAgents = [...agents]
    .sort((a, b) => statusScore(a) - statusScore(b) || a.name.localeCompare(b.name))
    .slice(0, 4);
  const extraCount = Math.max(0, agents.length - shownAgents.length);
  return (
    <View accessibilityLabel={`${label}. ${extraCount > 0 ? plusLabel({ count: extraCount }) : ""}`} className="overflow-hidden rounded-[28px] border border-[#3d3653]" style={{ backgroundColor: "#211d30" }}>
      <View className="h-[82px] flex-row items-center justify-between border-b-2 border-[#514760] px-5" style={{ backgroundColor: "#29243a" }}>
        <View className="absolute left-0 right-0 top-0 h-2 flex-row">
          <View className="flex-1 bg-[#302a43]" /><View className="mx-1 flex-1 bg-[#27243a]" /><View className="flex-1 bg-[#302a43]" />
        </View>
        <View className="rounded-md border border-[#dfb66c] px-2 py-1"><Text className="text-[10px] font-semibold text-[#f0c575]">■  {label}</Text></View>
        <View className="flex-row gap-3">
          <OfficeWindow /><OfficeWindow second />
        </View>
      </View>
      <View className="px-1 pb-2 pt-1">
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} className="h-[22px] flex-row">
            {Array.from({ length: 9 }, (_, column) => (
              <View
                key={column}
                className="mx-[1px] flex-1 border-b border-[#211d2b]"
                style={{ backgroundColor: (row + column) % 2 === 0 ? "#302a39" : "#2a2533" }}
              />
            ))}
          </View>
        ))}
      </View>
      <View className="h-[116px] justify-end px-4 pb-3">
        <View className="absolute bottom-5 left-6 right-6 h-10 rounded-xl border-2 border-[#6e5b83] bg-[#514266]" />
        <View className="absolute bottom-2 left-8 right-8 h-6 rounded-b-lg border-x-2 border-b-2 border-[#6e5b83] bg-[#3c334c]" />
        <View className="z-10 flex-row items-end justify-center gap-3">
          {shownAgents.map((agent) => (
            <OfficeAgent
              key={agent.id}
              agent={agent}
              workload={presenceByAgent.get(agent.id)?.workload ?? "idle"}
              availability={presenceByAgent.get(agent.id)?.availability ?? "offline"}
              runningCount={presenceByAgent.get(agent.id)?.runningCount ?? 0}
              recentFailure={recentFailures.has(agent.id)}
            />
          ))}
          {extraCount > 0 ? <View className="mb-1 h-10 min-w-12 items-center justify-center rounded-lg border border-[#6f7487] bg-[#302a3c] px-2"><Text className="text-sm font-bold text-white">+{extraCount}</Text></View> : null}
        </View>
        <Ionicons name="leaf" size={22} color="#70c99d" style={{ position: "absolute", bottom: 15, left: 12 }} />
      </View>
    </View>
  );
}

function OfficeWindow({ second = false }: { second?: boolean }) {
  return (
    <View className="h-[48px] w-[76px] border-[3px] border-[#171524] bg-[#15192e] p-1">
      <View className="flex-1 flex-row items-end justify-around border-b border-[#49435b]">
        <View className="mb-2 size-1 bg-[#f4c777]" />
        <View className="mb-1 size-1 bg-[#f4c777]" />
        <View className="mb-2 size-1 bg-[#f4c777]" />
        <View className={`mb-2 size-2 ${second ? "bg-[#fff0bd]" : "bg-[#8ca9da]"}`} />
      </View>
    </View>
  );
}

function OfficeAgent({
  agent,
  workload,
  availability,
  runningCount,
  recentFailure,
}: {
  agent: Agent;
  workload: string;
  availability: string;
  runningCount: number;
  recentFailure: boolean;
}) {
  const working = workload === "working";
  const queued = workload === "queued";
  const color = recentFailure
    ? STATUS_COLORS.error
    : working
      ? STATUS_COLORS.working
      : queued
        ? STATUS_COLORS.queued
        : availability === "online"
          ? STATUS_COLORS.working
          : STATUS_COLORS.idle;
  const initial = agent.name.trim().slice(0, 1).toUpperCase() || "A";
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!working) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, working]);

  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <View className="w-[58px] items-center gap-1">
      {working ? (
        <Animated.View style={{ opacity: pulseOpacity, backgroundColor: color }} className="h-2 w-2 rounded-full" />
      ) : (
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      <Animated.View
        style={working ? { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) } : undefined}
        className="h-9 w-11 items-center justify-center border-2 border-[#c2cad4]"
      >
        <View className="absolute inset-0" style={{ backgroundColor: working ? "#536f79" : "#687180" }} />
        {agent.avatar_url ? <Image source={{ uri: agent.avatar_url }} className="h-7 w-9" /> : <Text className="font-bold text-white">{initial}</Text>}
        <View className="absolute bottom-1 h-1 w-5" style={{ backgroundColor: color }} />
      </Animated.View>
      <View className="max-w-[70px] rounded-sm bg-[#171522] px-1.5 py-0.5"><Text numberOfLines={1} className="text-[9px] font-medium text-white">{agent.name}</Text></View>
      {working ? (
        <View className="flex-row items-center gap-1 rounded-full bg-[#172d2b] px-1.5 py-0.5">
          {[0, 1, 2].map((dot) => (
            <Animated.View key={dot} style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: dot === 1 ? [0.35, 1] : [1, 0.35] }) }} className="size-1 rounded-full bg-[#77d6b3]" />
          ))}
          {runningCount > 1 ? <Text className="text-[8px] font-semibold text-[#a6efcf]">{runningCount}</Text> : null}
        </View>
      ) : queued ? (
        <View className="rounded-full bg-[#33291a] px-1.5 py-0.5"><Text className="text-[8px] font-semibold text-[#f4bd64]">···</Text></View>
      ) : null}
    </View>
  );
}

function AgentRow({
  agent,
  workload,
  availability,
  runningCount,
  hasRecentFailure,
  canChat,
  onChat,
  accent,
  muted,
  t,
}: {
  agent: Agent;
  workload: string;
  availability: string;
  runningCount: number;
  hasRecentFailure: boolean;
  canChat: boolean;
  onChat: () => void;
  accent: string;
  muted: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const color = hasRecentFailure ? STATUS_COLORS.error : workload === "working" ? STATUS_COLORS.working : workload === "queued" ? STATUS_COLORS.queued : availability === "online" ? STATUS_COLORS.idle : muted;
  const status = workload === "working"
    ? t("agents.workload.working", { count: runningCount })
    : workload === "queued"
      ? t("agents.workload.queued")
      : t(`agents.workload.${availability === "online" ? "idle" : availability}`);
  const initial = agent.name.trim().slice(0, 1).toUpperCase() || "A";
  return (
    <View className="min-h-[78px] flex-row items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
      <View className="size-11 items-center justify-center overflow-hidden rounded-xl bg-secondary">
        {agent.avatar_url ? <Image source={{ uri: agent.avatar_url }} className="size-11" /> : <Text className="text-base font-bold text-foreground">{initial}</Text>}
        <View className="absolute bottom-0.5 right-0.5 size-2.5 rounded-full border border-card" style={{ backgroundColor: color }} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-foreground">{agent.name}</Text>
          {hasRecentFailure ? <Ionicons name="alert-circle" size={15} color={STATUS_COLORS.error} /> : null}
        </View>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">{agent.description || status}</Text>
      </View>
      <View className="items-end gap-2">
        <Text className="text-[11px] font-medium" style={{ color }}>{status}</Text>
        {canChat ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("agents.start_chat")} onPress={onChat} className="size-8 items-center justify-center rounded-full bg-primary/15 active:opacity-70">
            <Ionicons name="chatbubble-ellipses" size={16} color={accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
