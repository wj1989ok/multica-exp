import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useAuthStore } from "@/data/auth-store";
import { useBackendConfigStore } from "@/data/backend-config-store";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export default function MoreMenuScreen() {
  const { t } = useT("navigation");
  const { t: ta } = useT("auth");
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const user = useAuthStore((s) => s.user);
  const servers = useBackendConfigStore((s) => s.servers);
  const activeServerId = useBackendConfigStore((s) => s.activeServerId);
  const server = servers.find((item) => item.id === activeServerId);
  const { colorScheme } = useColorScheme();
  const iconColor = THEME[colorScheme].mutedForeground;

  const entries = [
    { label: t("more_menu.pinned"), icon: "pin-outline" as const, path: slug ? `/${slug}/more/pins` : null },
    { label: t("more_menu.issues"), icon: "list-outline" as const, path: slug ? `/${slug}/more/issues` : null },
    { label: t("more_menu.projects"), icon: "albums-outline" as const, path: slug ? `/${slug}/more/projects` : null },
    { label: ta("login.server_list_title"), icon: "globe-outline" as const, path: "/(auth)/servers" },
    { label: t("more_menu.account_settings"), icon: "person-circle-outline" as const, path: slug ? `/${slug}/more/settings` : null },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" onPress={() => router.back()}>
          <Text>{t("common:actions.cancel")}</Text>
        </Button>
        <Text className="text-lg font-semibold">{t("tabs.more")}</Text>
        <View className="w-16" />
      </View>
      <ScrollView contentContainerClassName="gap-3 px-5 py-5">
        <View className="mb-2 rounded-2xl bg-card p-4">
          <Text className="font-semibold text-foreground">{user?.name ?? user?.email ?? "—"}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">{server?.name ?? ta("login.official_server")}</Text>
        </View>
        {entries.map((entry) => (
          <Pressable
            key={entry.label}
            accessibilityRole="button"
            onPress={() => entry.path && router.push(entry.path as never)}
            className="min-h-14 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4"
          >
            <Ionicons name={entry.icon} size={22} color={iconColor} />
            <Text className="flex-1 text-base text-foreground">{entry.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
