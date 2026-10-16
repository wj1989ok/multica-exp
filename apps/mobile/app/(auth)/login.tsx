import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { MulticaLogo } from "@/components/brand/multica-logo";
import { useAuthStore } from "@/data/auth-store";
import { i18n, useT } from "@/lib/i18n";
import { mapAuthError } from "@/lib/auth-error";
import { useActiveServer } from "@/data/backend-config-store";

export default function Login() {
  const { t } = useT("auth");
  const sendCode = useAuthStore((s) => s.sendCode);
  const server = useActiveServer();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    void Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    try {
      await sendCode(trimmed);
      router.push({ pathname: "/verify", params: { email: trimmed } });
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, t("login.send_failed"), (key) => i18n.t(`auth:${key}`)));
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
        <View className="flex-1 justify-center px-6 gap-6">
          <View className="items-center gap-3">
            <MulticaLogo size={32} />
            <View className="gap-1 items-center">
              <Text className="text-2xl font-semibold text-foreground">
                {t("login.title")}
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                {t("login.subtitle")}
              </Text>
            </View>
          </View>

          {server ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                {t("login.server_label")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/servers")}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <Text className="text-lg">☁</Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">
                    {server.isDefault ? t("login.official_server") : server.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">{server.apiUrl.replace(/^https?:\/\//, "")}</Text>
                </View>
                <Text className="font-semibold text-primary">{t("login.change_server")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="gap-3">
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              keyboardType="email-address"
              placeholder={t("login.email_placeholder")}
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={onSubmit}
              returnKeyType="send"
              editable={!submitting}
              invalid={!!error}
            />
            {error ? (
              <Text className="text-sm text-destructive">{error}</Text>
            ) : null}
          </View>

          <Button
            size="lg"
            disabled={submitting || !email.trim()}
            onPress={onSubmit}
          >
            <Text>{submitting ? t("login.sending") : t("login.send_code")}</Text>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onPress={() => router.push("/server/scan")}
          >
            <Text>▦</Text>
            <Text>{t("login.scan_qr")}</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
