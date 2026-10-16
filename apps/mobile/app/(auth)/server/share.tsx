import { useMemo } from "react";
import { Pressable, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useBackendConfigStore } from "@/data/backend-config-store";
import { useT } from "@/lib/i18n";

export default function ShareServerScreen() {
  const { t } = useT("auth");
  const { serverId } = useLocalSearchParams<{ serverId?: string }>();
  const server = useBackendConfigStore((state) =>
    state.servers.find((item) => item.id === serverId) ?? null,
  );

  const shareLink = useMemo(() => {
    if (!server) return "";
    const params = new URLSearchParams({
      apiUrl: server.apiUrl,
      webUrl: server.webUrl,
      name: server.name,
    });
    return `multica://server/import?${params.toString()}`;
  }, [server]);

  if (!server) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <Text>{t("login.server_config_error")}</Text>
        <Button className="mt-4" onPress={() => router.back()}>
          <Text>{t("common:actions.back")}</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="font-semibold text-primary">{t("common:actions.back")}</Text>
        </Pressable>
        <Text className="text-lg font-semibold">{t("login.server_share_title")}</Text>
        <View className="w-12" />
      </View>

      <View className="flex-1 items-center justify-center gap-5 px-6">
        <Text className="text-center text-lg font-semibold">{server.name}</Text>
        <View className="rounded-3xl bg-white p-4">
          <QRCode value={shareLink} size={240} />
        </View>
        <Text className="max-w-sm text-center text-sm text-muted-foreground">
          {t("login.server_share_hint")}
        </Text>
        <Text selectable className="text-center text-xs text-muted-foreground">
          {server.apiUrl}
        </Text>
        <Button size="lg" onPress={() => void Share.share({ message: shareLink })}>
          <Text>{t("login.server_share_link")}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
