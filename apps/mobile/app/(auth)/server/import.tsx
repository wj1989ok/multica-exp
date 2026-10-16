import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function ImportServerLink() {
  const params = useLocalSearchParams<{ apiUrl?: string; webUrl?: string }>();
  const apiUrl = params.apiUrl;
  const webUrl = params.webUrl;

  useEffect(() => {
    router.replace({ pathname: "/backend-setup", params: { apiUrl, webUrl } });
  }, [apiUrl, webUrl]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator />
    </View>
  );
}
