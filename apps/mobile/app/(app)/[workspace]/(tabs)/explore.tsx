import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { IssueRow } from "@/components/issue/issue-row";
import { issueDetailOptions } from "@/data/queries/issues";
import { selectViewedIssueIds, useViewedIssuesStore } from "@/data/viewed-issues-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const QUICK_LINKS = [
  { key: "chat", icon: "chatbubbles-outline" as const, color: "#62c98a", href: "/chat" },
  { key: "tasks", icon: "checkbox-outline" as const, color: "#f2ad42", href: "/my-issues" },
  { key: "profile", icon: "person-circle-outline" as const, color: "#5798ff", href: "/more/settings/profile" },
  { key: "skills", icon: "book-outline" as const, color: "#b084f5", href: "/more/skills" },
];

export default function ExploreTab() {
  const { t } = useT("navigation");
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;
  const viewedIds = useViewedIssuesStore(selectViewedIssueIds(wsId));
  const recentIds = useMemo(() => viewedIds.slice(0, 5), [viewedIds]);
  const recentQueries = useQueries({
    queries: recentIds.map((id) => issueDetailOptions(wsId, id)),
  });
  const recentIssues = useMemo<Issue[]>(
    () => recentQueries.map((query) => query.data).filter((issue): issue is Issue => !!issue),
    [recentQueries],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-3">
        <Text className="text-3xl font-bold text-foreground">{t("tabs.search")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => slug && router.push(`/${slug}/search`)}
          className="h-12 flex-row items-center gap-3 rounded-2xl bg-card px-4 active:bg-secondary"
        >
          <Ionicons name="search" size={20} color={muted} />
          <Text className="flex-1 text-sm text-muted-foreground">{t("explore.search_placeholder")}</Text>
          <Ionicons name="search-outline" size={18} color={muted} />
        </Pressable>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-muted-foreground">{t("explore.go_to")}</Text>
          <View className="overflow-hidden rounded-3xl bg-card px-4">
            {QUICK_LINKS.map((link, index) => (
              <Pressable
                key={link.key}
                accessibilityRole="button"
                onPress={() => slug && router.push(`/${slug}${link.href}`)}
                className={`min-h-[72px] flex-row items-center gap-3 py-3 active:opacity-70 ${index ? "border-t border-border" : ""}`}
              >
                <View className="size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${link.color}25` }}>
                  <Ionicons name={link.icon} size={22} color={link.color} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-medium text-foreground">{t(`explore.links.${link.key}.title`)}</Text>
                  <Text className="text-xs text-muted-foreground">{t(`explore.links.${link.key}.subtitle`)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Text className="px-1 text-sm font-semibold text-muted-foreground">{t("explore.recent")}</Text>
          {recentIssues.length ? recentIssues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onPress={() => slug && router.push(`/${slug}/issue/${issue.id}`)}
            />
          )) : (
            <View className="items-center gap-2 py-10">
              <Ionicons name="search-outline" size={28} color={muted} />
              <Text className="text-sm font-semibold text-foreground">{t("explore.no_recent")}</Text>
              <Text className="text-center text-xs text-muted-foreground">{t("explore.no_recent_hint")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
