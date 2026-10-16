/**
 * Primary mobile navigation: Home, Inbox, Me, Search. Chat and task lists
 * remain routable but live under the Me/tools section rather than taking
 * permanent space in the main tab bar.
 */
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { useT } from "@/lib/i18n";

// Only override backgroundColor — @react-navigation/elements Badge internally
// sets borderRadius = size/2, height = size, minWidth = size, so a single
// character renders as a perfect circle. Overriding minWidth/fontSize here
// breaks that geometry. Text color is auto-derived from backgroundColor
// luminance by Badge itself (white on brand blue).
const BADGE_STYLE = {
  backgroundColor: THEME.light.brand,
};

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];
  const { t } = useT("navigation");

  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const inboxUnread = useInboxUnreadCount(wsId);

  // Truncation aligned with web's sidebar badges: 99+ for both. `undefined`
  // makes React Navigation hide the badge, so zero-count is a free no-op.
  const inboxBadge =
    inboxUnread > 0 ? (inboxUnread > 99 ? "99+" : String(inboxUnread)) : undefined;
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.foreground,
          tabBarInactiveTintColor: theme.mutedForeground,
          tabBarStyle: { backgroundColor: theme.background },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t("tabs.inbox"),
            tabBarBadge: inboxBadge,
            tabBarBadgeStyle: BADGE_STYLE,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "file-tray-full" : "file-tray-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: t("tabs.me"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="my-issues"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="more"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t("tabs.search"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
