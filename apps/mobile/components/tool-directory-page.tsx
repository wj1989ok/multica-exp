import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

export interface ToolDirectoryItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ToolDirectoryPage({
  title,
  emptyLabel,
  errorLabel,
  retryLabel,
  loading,
  error,
  items,
  onRefresh,
}: {
  title: string;
  emptyLabel: string;
  errorLabel: string;
  retryLabel: string;
  loading: boolean;
  error: boolean;
  items: ToolDirectoryItem[];
  onRefresh: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={[]}>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-sm text-destructive">{errorLabel}</Text>
          <Pressable accessibilityRole="button" onPress={onRefresh} className="rounded-xl bg-secondary px-4 py-2">
            <Text className="font-medium text-foreground">{retryLabel}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-muted-foreground">{emptyLabel}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 px-4 py-4"
          onRefresh={onRefresh}
          refreshing={false}
          renderItem={({ item }) => (
            <View className="min-h-[68px] flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3">
              <View className="size-10 items-center justify-center rounded-xl bg-secondary">
                <Ionicons name={item.icon ?? "grid-outline"} size={20} color={muted} />
              </View>
              <View className="flex-1 gap-1">
                <Text numberOfLines={1} className="text-base font-medium text-foreground">{item.title}</Text>
                {item.subtitle ? <Text numberOfLines={2} className="text-xs text-muted-foreground">{item.subtitle}</Text> : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
