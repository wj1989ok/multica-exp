import { useMemo } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { dashboardUsageDailyOptions } from "@/data/queries/tools";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function UsagePage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const { colorScheme } = useColorScheme();
  const accent = THEME[colorScheme].brand;
  const muted = THEME[colorScheme].mutedForeground;
  const query = useQuery(dashboardUsageDailyOptions(wsId));
  const days = useMemo(() => {
    const grouped = new Map<string, { tokens: number; runs: number }>();
    for (const row of query.data ?? []) {
      const current = grouped.get(row.date) ?? { tokens: 0, runs: 0 };
      current.tokens += row.input_tokens + row.output_tokens + row.cache_read_tokens + row.cache_write_tokens;
      current.runs += row.task_count;
      grouped.set(row.date, current);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  }, [query.data]);
  const total = days.reduce((sum, [, value]) => sum + value.tokens, 0);
  const maxTokens = Math.max(1, ...days.map(([, value]) => value.tokens));
  const number = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <Stack.Screen options={{ title: t("routes.usage") }} />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      ) : query.isError ? (
        <View className="flex-1 items-center justify-center px-6"><Text className="text-center text-sm text-destructive">{t("catalog.error")}</Text></View>
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 py-5">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-foreground">{number.format(total)}</Text>
            <Text className="text-sm text-muted-foreground">{t("usage.tokens_7d")}</Text>
          </View>
          <View className="gap-4 rounded-3xl bg-card p-5">
            {days.length ? days.map(([date, value]) => (
              <View key={date} className="flex-row items-center gap-3">
                <Text className="w-20 text-xs text-muted-foreground">{date.slice(5)}</Text>
                <View className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <View className="h-2 rounded-full" style={{ width: `${Math.max(value.tokens ? 3 : 0, (value.tokens / maxTokens) * 100)}%`, backgroundColor: accent }} />
                </View>
                <Text className="w-12 text-right text-xs font-medium text-foreground">{number.format(value.tokens)}</Text>
              </View>
            )) : (
              <View className="items-center gap-2 py-5">
                <Ionicons name="bar-chart-outline" size={24} color={muted} />
                <Text className="text-sm text-muted-foreground">{t("usage.empty")}</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-4">
            <View className="gap-1">
              <Text className="font-medium text-foreground">{t("usage.runs_7d")}</Text>
              <Text className="text-xs text-muted-foreground">{t("usage.runs_hint")}</Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">{number.format(days.reduce((sum, [, value]) => sum + value.runs, 0))}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
