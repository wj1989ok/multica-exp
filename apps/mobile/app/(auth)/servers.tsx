import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/data/auth-store";
import { useBackendConfigStore } from "@/data/backend-config-store";
import { useT } from "@/lib/i18n";

export default function ServersScreen() {
  const { t } = useT("auth");
  const queryClient = useQueryClient();
  const servers = useBackendConfigStore((state) => state.servers);
  const activeServerId = useBackendConfigStore((state) => state.activeServerId);
  const removeServer = useBackendConfigStore((state) => state.removeServer);
  const switchServer = useAuthStore((state) => state.switchServer);
  const [busy, setBusy] = useState(false);

  const selectServer = async (id: string) => {
    if (busy || id === activeServerId) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      queryClient.clear();
      await switchServer(id);
      router.replace("/");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert(
      t("login.server_remove"),
      t("login.server_remove_confirm", { name }),
      [
        { text: t("common:actions.cancel"), style: "cancel" },
        {
          text: t("login.server_remove"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (id === activeServerId) {
                const fallback = servers.find((server) => server.isDefault && server.id !== id)
                  ?? servers.find((server) => server.id !== id);
                if (fallback) {
                  queryClient.clear();
                  await switchServer(fallback.id);
                }
              }
              await removeServer(id);
            })();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" onPress={() => router.back()}>
          <Text>{t("common:actions.cancel")}</Text>
        </Button>
        <Text className="text-lg font-semibold">{t("login.server_list_title")}</Text>
        <View className="w-16" />
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 py-6">
        <View className="gap-2">
          {servers.map((server) => {
            const selected = server.id === activeServerId;
            return (
              <View
                key={server.id}
                className={`rounded-2xl border p-4 ${selected ? "border-primary bg-secondary" : "border-border bg-card"}`}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void selectServer(server.id)}
                  className="flex-row items-center gap-3"
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-full ${selected ? "bg-primary/15" : "bg-secondary"}`}>
                    <Text className="text-lg">{server.isDefault ? "☁" : "◉"}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">
                      {server.isDefault
                        ? t("login.official_server")
                        : server.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">{server.apiUrl}</Text>
                  </View>
                  {selected ? <Text className="font-semibold text-primary">✓</Text> : null}
                </Pressable>
                <View className="mt-3 flex-row justify-end gap-2">
                  {!server.isDefault ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => router.push({ pathname: "/backend-setup", params: { serverId: server.id } })}
                    >
                      <Text>{t("common:actions.edit")}</Text>
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push({ pathname: "/server/share", params: { serverId: server.id } })}
                  >
                    <Text>{t("login.server_share")}</Text>
                  </Button>
                  {!server.isDefault && servers.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => confirmRemove(server.id, server.name)}
                    >
                      <Text className="text-destructive">{t("common:actions.remove")}</Text>
                    </Button>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <Button variant="outline" size="lg" onPress={() => router.push("/backend-setup")}>
          <Text>{t("login.add_server")}</Text>
        </Button>
        <Button variant="secondary" size="lg" onPress={() => router.push("/server/scan")}>
          <Text>{t("login.scan_qr")}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
