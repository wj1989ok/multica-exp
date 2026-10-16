import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { parseServerConfigQr } from "@/lib/server-config";

export default function ScanServerScreen() {
  const { t } = useT("auth");
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    const config = parseServerConfigQr(result.data);
    if (!config) {
      setError(t("login.server_scan_invalid"));
      return;
    }
    scannedRef.current = true;
    router.replace({
      pathname: "/backend-setup",
      params: { apiUrl: config.apiUrl, webUrl: config.webUrl },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text className="font-semibold text-primary">{t("common:actions.cancel")}</Text>
        </Pressable>
        <Text className="text-lg font-semibold">{t("login.server_scan_title")}</Text>
        <View className="w-12" />
      </View>

      <View className="flex-1 gap-5 px-5 pb-8">
        <Text className="text-center text-sm text-muted-foreground">
          {t("login.server_scan_hint")}
        </Text>

        {!permission ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : permission.granted ? (
          <View className="flex-1 overflow-hidden rounded-3xl bg-black">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onBarcodeScanned}
            >
              <View className="flex-1 items-center justify-center">
                <View className="h-64 w-64 rounded-3xl border-2 border-white/90" />
              </View>
            </CameraView>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-4">
            <Text className="text-center text-muted-foreground">
              {t("login.server_scan_permission")}
            </Text>
            <Button onPress={() => void requestPermission()}>
              <Text>{t("common:actions.continue")}</Text>
            </Button>
          </View>
        )}

        {error ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setError(null)}
            className="rounded-xl bg-destructive/10 p-3"
          >
            <Text className="text-center text-sm text-destructive">{error}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
