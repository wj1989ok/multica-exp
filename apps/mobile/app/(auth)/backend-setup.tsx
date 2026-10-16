import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/data/auth-store";
import { useBackendConfigStore } from "@/data/backend-config-store";
import { clearTokenForServer } from "@/data/secure-storage";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export default function BackendSetup() {
  const { t } = useT("auth");
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ serverId?: string; apiUrl?: string; webUrl?: string }>();
  const apiUrlParam = params.apiUrl;
  const webUrlParam = params.webUrl;
  const servers = useBackendConfigStore((state) => state.servers);
  const activeServerId = useBackendConfigStore((state) => state.activeServerId);
  const addServer = useBackendConfigStore((state) => state.addServer);
  const updateServer = useBackendConfigStore((state) => state.updateServer);
  const switchServer = useAuthStore((state) => state.switchServer);
  const [apiUrl, setApiUrl] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editingServer = servers.find((server) => server.id === params.serverId);

  useEffect(() => {
    if (typeof apiUrlParam === "string" && apiUrlParam) {
      setApiUrl(apiUrlParam);
      setWebUrl(typeof webUrlParam === "string" ? webUrlParam : apiUrlParam);
    } else if (editingServer) {
      setApiUrl(editingServer.apiUrl);
      setWebUrl(editingServer.webUrl);
    } else {
      setApiUrl("");
      setWebUrl("");
    }
  }, [editingServer, apiUrlParam, webUrlParam]);

  const onSubmit = async () => {
    setError(null);
    const normalizedApi = normalizeUrl(apiUrl);
    const normalizedWeb = normalizeUrl(webUrl || apiUrl);
    if (!normalizedApi || !normalizedWeb) {
      setError(t("login.server_config_error"));
      return;
    }
    setSubmitting(true);
    try {
      let serverId: string;
      if (editingServer) {
        if (editingServer.apiUrl !== normalizedApi) {
          if (editingServer.id === activeServerId) {
            // A credential for the old host must never be sent to a new host.
            await useAuthStore.getState().logout();
            await useWorkspaceStore.getState().clear();
          } else {
            await clearTokenForServer(editingServer.id);
            await useWorkspaceStore.getState().clearForServer(editingServer.id);
          }
        }
        await updateServer(editingServer.id, {
          name: editingServer.isDefault ? editingServer.name : new URL(normalizedApi).host,
          apiUrl: normalizedApi,
          webUrl: normalizedWeb,
        });
        serverId = editingServer.id;
      } else {
        serverId = await addServer({
          name: new URL(normalizedApi).host,
          apiUrl: normalizedApi,
          webUrl: normalizedWeb,
        });
      }
      queryClient.clear();
      await switchServer(serverId);
      router.replace("/");
    } catch {
      setError(t("login.server_config_error"));
    } finally {
      setSubmitting(false);
    }
  };

  const onUseDefault = async () => {
    const server = servers.find((item) => item.isDefault);
    if (!server) return;
    setSubmitting(true);
    try {
      await switchServer(server.id);
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Button variant="ghost" onPress={() => router.back()}>
            <Text>{t("common:actions.cancel")}</Text>
          </Button>
          <Text className="text-lg font-semibold">{t("login.server_config_title")}</Text>
          <Button variant="ghost" onPress={() => void onSubmit()} disabled={submitting}>
            <Text>{t("common:actions.save")}</Text>
          </Button>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 py-6">
          {editingServer?.isDefault ? (
            <View className="rounded-2xl bg-secondary p-4">
              <Text className="font-semibold text-foreground">{t("login.default_server")}</Text>
              <Text className="mt-1 text-sm text-muted-foreground">{editingServer.apiUrl}</Text>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">{t("login.server_api_url")}</Text>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardType="url"
              placeholder="https://api.example.com"
              value={apiUrl}
              onChangeText={setApiUrl}
              editable={!submitting}
            />
            <Text className="text-xs text-muted-foreground">{t("login.server_scan_hint")}</Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">{t("login.server_web_url")}</Text>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://app.example.com"
              value={webUrl}
              onChangeText={setWebUrl}
              editable={!submitting}
            />
            <Text className="text-xs text-muted-foreground">{t("login.server_web_hint")}</Text>
          </View>

          <Button variant="outline" onPress={() => router.push("/server/scan")}>
            <Text>{t("login.scan_qr")}</Text>
          </Button>

          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <Button size="lg" disabled={submitting || !apiUrl.trim()} onPress={onSubmit}>
            <Text>{submitting ? t("login.server_saving") : t("login.server_save")}</Text>
          </Button>

          {!editingServer?.isDefault && servers.some((server) => server.isDefault) ? (
          <Button variant="secondary" disabled={submitting} onPress={() => void onUseDefault()}>
              <Text>{t("login.use_default_server", { url: servers.find((server) => server.isDefault)?.apiUrl })}</Text>
            </Button>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
