import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useBackendConfigStore } from "@/data/backend-config-store";

/**
 * Entry redirect. AuthInitializer (in _layout.tsx) finishes auth + slug
 * hydration before this renders meaningfully — until then, isLoading is true.
 *
 * The backend-config store is loaded once on first run (it pulls from
 * SecureStore in loadFromStorage, awaited by _layout.tsx via
 * `useBackendConfigStore.getState().loadFromStorage()`). Until the load
 * resolves, isLoaded is false and we show the spinner.
 *
 *   no backend        → /backend-setup   (first-run URL config)
 *   no user            → /login
 *   user, no slug      → /select-workspace
 *   user, slug         → /[slug]/inbox
 */
export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const backendLoaded = useBackendConfigStore((s) => s.isLoaded);

  if (isLoading || !backendLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  // No backend override AND no build-time env fallback → user must set one.
  // The build ships with EXPO_PUBLIC_API_URL baked in, so this branch is
  // only reachable in debug builds that cleared the override on a clean
  // install — but it is the correct place to keep the user out of a
  // half-configured app.
  const hasBackend = useBackendConfigStore.getState().servers.length > 0;
  if (!hasBackend) return <Redirect href="/backend-setup" />;

  if (!user) return <Redirect href="/login" />;
  if (!slug) return <Redirect href="/select-workspace" />;
  return <Redirect href={`/${slug}/inbox`} />;
}
