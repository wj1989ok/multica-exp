import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { inboxListOptions } from "@/data/queries/inbox";
import { agentListOptions } from "@/data/queries/agents";
import { agentTaskSnapshotOptions } from "@/data/queries/agent-task-snapshot";
import { dashboardAssignedCountOptions } from "@/data/queries/home";
import { dashboardUsageDailyOptions } from "@/data/queries/tools";
import { useMarkInboxRead } from "@/data/mutations/inbox";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { deduplicateInboxItems, getInboxDisplayTitle, getInboxNavigationTarget } from "@/lib/inbox-display";
import { timeAgo } from "@/lib/time-ago";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function HomeTab() {
  const { t } = useT("navigation");
  const { t: tInbox } = useT("inbox");
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const user = useAuthStore((s) => s.user);
  const { colorScheme } = useColorScheme();
  const accent = THEME[colorScheme].brand;
  const muted = THEME[colorScheme].mutedForeground;
  const unreadCount = useInboxUnreadCount(wsId);
  const markRead = useMarkInboxRead();

  const { data: inbox = [] } = useQuery(inboxListOptions(wsId));
  const { data: assignedCount, isLoading: assignedLoading, isError: assignedError } = useQuery(
    dashboardAssignedCountOptions(wsId, user?.id ?? null),
  );
  const { data: usageRows = [], isLoading: usageLoading, isError: usageError } = useQuery(dashboardUsageDailyOptions(wsId));
  const { data: agents = [], isLoading: agentsLoading, isError: agentsError } = useQuery(agentListOptions(wsId));
  const { data: agentTasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery(agentTaskSnapshotOptions(wsId));
  const latest = useMemo(() => deduplicateInboxItems(inbox).slice(0, 4), [inbox]);
  const activeAgentCount = useMemo(() => {
    const activeStatuses = new Set(["queued", "dispatched", "waiting_local_directory", "deferred", "running"]);
    return new Set(agentTasks.filter((task) => activeStatuses.has(task.status)).map((task) => task.agent_id)).size;
  }, [agentTasks]);
  const weeklyTokens = usageRows.reduce(
    (total, row) => total + row.input_tokens + row.output_tokens + row.cache_read_tokens + row.cache_write_tokens,
    0,
  );
  const compactNumber = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
  const name = user?.name?.trim().split(/\s+/)[0] ?? "";

  const open = (path: string) => {
    if (slug) router.push(`/${slug}${path}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-3">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">
            {name ? t("home.greeting", { name }) : t("tabs.home")}
          </Text>
          <Text className="text-sm text-muted-foreground">{t("home.subtitle")}</Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => open("/new-issue")}
            className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-80"
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text className="font-semibold text-primary-foreground">{t("home.new_issue")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => open("/chat")}
            className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card active:bg-secondary"
          >
            <Ionicons name="chatbubbles" size={19} color={accent} />
            <Text className="font-semibold text-foreground">{t("home.new_chat")}</Text>
          </Pressable>
        </View>

        <View className="gap-3">
          <Text className="text-xl font-bold text-foreground">{t("home.today")}</Text>
          <View className="flex-row gap-3">
            <MetricCard icon="file-tray-full" label={t("home.unread_inbox")} value={String(unreadCount)} color={accent} onPress={() => open("/inbox")} />
            <MetricCard icon="checkbox" label={t("home.assigned_tasks")} value={assignedLoading ? "—" : assignedError ? "!" : assignedCount == null ? "—" : String(assignedCount)} color="#62c98a" onPress={() => open("/my-issues")} />
          </View>
          <View className="flex-row gap-3">
            <MetricCard icon="bar-chart" label={t("home.usage")} value={usageLoading ? "—" : usageError ? "!" : compactNumber.format(weeklyTokens)} color="#5798ff" onPress={() => open("/more/usage")} />
            <MetricCard icon="hardware-chip" label={t("home.active_agents")} value={agentsLoading || tasksLoading ? "—" : agentsError || tasksError ? "!" : `${activeAgentCount}/${agents.filter((agent) => !agent.archived_at).length}`} color="#b084f5" onPress={() => open("/more/agents")} />
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground">{t("home.recent_activity")}</Text>
            <Pressable accessibilityRole="button" onPress={() => open("/inbox")}>
              <Text className="text-sm font-medium text-primary">{t("home.view_all")}</Text>
            </Pressable>
          </View>
          <View className="overflow-hidden rounded-2xl bg-card">
            {latest.length ? latest.map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => {
                  if (!item.read) markRead.mutate(item.id);
                  const target = getInboxNavigationTarget(item, slug, String(Date.now()));
                  if (target) router.push(target);
                }}
                className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-secondary ${index ? "border-t border-border" : ""}`}
              >
                <View className="size-9 items-center justify-center rounded-xl bg-secondary">
                  <Ionicons name={item.read ? "notifications-outline" : "notifications"} size={18} color={item.read ? muted : accent} />
                </View>
                <View className="flex-1 gap-1">
                  <Text numberOfLines={1} className={`text-sm ${item.read ? "text-foreground" : "font-semibold text-foreground"}`}>
                    {getInboxDisplayTitle(item)}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-muted-foreground">
                    {item.body ?? tInbox(`type.${item.type}`)}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</Text>
              </Pressable>
            )) : (
              <View className="items-center gap-2 px-5 py-8">
                <Ionicons name="sparkles-outline" size={24} color={muted} />
                <Text className="text-sm text-muted-foreground">{t("home.no_recent_activity")}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View className="size-10 items-center justify-center rounded-xl bg-secondary">
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-2xl font-bold text-foreground">{value}</Text>
      </View>
    </>
  );
  const className = "min-h-24 flex-1 flex-row items-center gap-3 rounded-2xl bg-card px-3 py-4";
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} className={`${className} active:bg-secondary`}>
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}
