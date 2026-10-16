import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BILLING_WORKSPACE_SUBSCRIPTIONS_FLAG } from "@multica/core/feature-flags";
import { Text } from "@/components/ui/text";
import { useAuthStore } from "@/data/auth-store";
import { useBackendConfigStore, useWebUrl } from "@/data/backend-config-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { appConfigOptions, workspaceSubscriptionSummaryOptions } from "@/data/queries/billing";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function MeTab() {
  const { t } = useT("navigation");
  const { t: ta } = useT("auth");
  const user = useAuthStore((s) => s.user);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const serverId = useBackendConfigStore((s) => s.activeServerId);
  const servers = useBackendConfigStore((s) => s.servers);
  const server = servers.find((item) => item.id === serverId);
  const { data: appConfig } = useQuery(appConfigOptions());
  const billingEnabled = appConfig?.feature_flags?.[BILLING_WORKSPACE_SUBSCRIPTIONS_FLAG] === true;
  const { data: subscription } = useQuery(
    workspaceSubscriptionSummaryOptions(
      wsId,
      billingEnabled,
    ),
  );
  const webUrl = useWebUrl()?.replace(/\/+$/, "");
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;

  const path = (suffix: string) => (slug ? `/${slug}${suffix}` : null);
  const groups = [
    {
      title: t("me.tools"),
      rows: [
        { title: t("tabs.chat"), icon: "chatbubbles-outline" as const, href: path("/chat") },
        { title: t("tabs.my_issues"), icon: "checkbox-outline" as const, href: path("/my-issues") },
        { title: t("more_menu.pinned"), icon: "bookmark-outline" as const, href: path("/more/pins") },
        { title: t("more_menu.projects"), icon: "folder-outline" as const, href: path("/more/projects") },
        { title: t("routes.labels"), icon: "pricetag-outline" as const, href: path("/more/labels") },
        { title: t("routes.agents"), icon: "hardware-chip-outline" as const, href: path("/more/agents") },
        { title: t("routes.skills"), icon: "book-outline" as const, href: path("/more/skills") },
        { title: t("routes.automations"), icon: "flash-outline" as const, href: path("/more/automations") },
        { title: t("routes.runtimes"), icon: "hardware-chip-outline" as const, href: path("/more/runtimes") },
        { title: t("routes.teams"), icon: "people-outline" as const, href: path("/more/teams") },
        { title: t("routes.usage"), icon: "bar-chart-outline" as const, href: path("/more/usage") },
        { title: t("routes.notifications"), icon: "notifications-outline" as const, href: path("/more/settings/notifications") },
      ],
    },
    {
      title: t("me.account"),
      rows: [
        { title: t("routes.profile"), icon: "person-outline" as const, href: path("/more/settings/profile") },
        { title: t("routes.settings"), icon: "settings-outline" as const, href: path("/more/settings") },
      ],
    },
    {
      title: t("me.server_workspace"),
      rows: [
        { title: server?.name ?? ta("login.official_server"), subtitle: server?.apiUrl, icon: "server-outline" as const, href: "/(auth)/servers" },
        { title: t("me.workspace"), subtitle: slug ?? undefined, icon: "business-outline" as const, href: path("/switch-workspace") },
      ],
    },
  ];

  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-3">
        <Text className="text-3xl font-bold text-foreground">{t("tabs.me")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const href = path("/more/settings/profile");
            if (href) router.push(href);
          }}
          className="flex-row items-center gap-4 rounded-3xl bg-card p-5 active:bg-secondary"
        >
          <View className="size-14 items-center justify-center overflow-hidden rounded-full bg-primary/15">
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} className="size-14" />
            ) : <Text className="text-xl font-bold text-primary">{initial}</Text>}
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-lg font-semibold text-foreground">{user?.name ?? "—"}</Text>
            <Text className="text-sm text-muted-foreground">{user?.email ?? ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={muted} />
        </Pressable>

        {billingEnabled && subscription ? (
          <View className="gap-2">
            <Text className="px-2 text-sm font-semibold text-muted-foreground">{t("me.purchases")}</Text>
            <View className="overflow-hidden rounded-3xl bg-card px-4">
              <Pressable
                accessibilityRole="button"
                disabled={!webUrl || !slug || !(
                  subscription.availableActions.checkout ||
                  subscription.availableActions.portal ||
                  subscription.availableActions.purchaseSeats
                )}
                onPress={() => {
                  if (webUrl && slug) void Linking.openURL(`${webUrl}/${slug}/settings?tab=billing`);
                }}
                className="min-h-[68px] flex-row items-center gap-3 py-3 active:opacity-70"
              >
                <View className="size-10 items-center justify-center rounded-xl bg-secondary">
                  <Ionicons name="sparkles" size={20} color="#b084f5" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-medium text-foreground">Multica Pro</Text>
                  <Text numberOfLines={1} className="text-xs text-muted-foreground">{subscription.entitlement.plan}</Text>
                </View>
                {webUrl && slug && (
                  subscription.availableActions.checkout ||
                  subscription.availableActions.portal ||
                  subscription.availableActions.purchaseSeats
                ) ? <Ionicons name="chevron-forward" size={18} color={muted} /> : null}
              </Pressable>
            </View>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="px-2 text-sm font-semibold text-muted-foreground">{group.title}</Text>
            <View className="overflow-hidden rounded-3xl bg-card px-4">
              {group.rows.map((row, index) => (
                <Pressable
                  key={row.title}
                  accessibilityRole="button"
                  onPress={() => row.href && router.push(row.href as never)}
                  className={`min-h-[68px] flex-row items-center gap-3 py-3 active:opacity-70 ${index ? "border-t border-border" : ""}`}
                >
                  <View className="size-10 items-center justify-center rounded-xl bg-secondary">
                    <Ionicons name={row.icon} size={20} color={muted} />
                  </View>
                  <View className="flex-1 gap-1">
                    <Text numberOfLines={1} className="text-base font-medium text-foreground">{row.title}</Text>
                    {"subtitle" in row && row.subtitle ? <Text numberOfLines={1} className="text-xs text-muted-foreground">{row.subtitle}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
