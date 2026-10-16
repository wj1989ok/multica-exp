/**
 * Mobile workspace store — Zustand. Holds the active workspace (id + slug)
 * and persists the slug separately for each local server profile.
 *
 * The route is the source of truth for which workspace is active
 * (`/[workspace]/...` URL segment, set by the layout that reads
 * useLocalSearchParams). This store is a fast cache that ApiClient.fetch
 * reads synchronously to inject the X-Workspace-Slug header — touching
 * the router or React context on every fetch would be ugly. Routes
 * sync into the store on mount via setCurrentWorkspace.
 *
 * Logic mirrors packages/core/platform/workspace-storage.ts:
 *   - One active slug + id at a time; the saved slug is per server
 *   - Cleared on logout for the active server
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { getActiveServerId } from "./backend-config-store";

const LEGACY_SLUG_KEY = "multica_current_workspace_slug";
const slugKey = (serverId = getActiveServerId()) =>
  `multica_workspace_slug_v1_${serverId || "default"}`;

interface WorkspaceState {
  currentWorkspaceId: string | null;
  currentWorkspaceSlug: string | null;
  /** Set the active workspace and persist the slug (id is in-memory only —
   *  it's resolved from the workspaces list query, not stored). */
  setCurrentWorkspace: (id: string, slug: string) => Promise<void>;
  /** Restore the slug from SecureStore on cold start. id stays null until
   *  the workspaces list query resolves. */
  restoreSlug: () => Promise<string | null>;
  resetForServerSwitch: () => void;
  clearForServer: (serverId: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  currentWorkspaceSlug: null,

  setCurrentWorkspace: async (id, slug) => {
    set({ currentWorkspaceId: id, currentWorkspaceSlug: slug });
    await SecureStore.setItemAsync(slugKey(), slug);
  },

  restoreSlug: async () => {
    const key = slugKey();
    let slug = await SecureStore.getItemAsync(key);
    if (!slug) {
      slug = await SecureStore.getItemAsync(LEGACY_SLUG_KEY);
      if (slug) {
        await SecureStore.setItemAsync(key, slug);
        await SecureStore.deleteItemAsync(LEGACY_SLUG_KEY);
      }
    }
    if (slug) set({ currentWorkspaceSlug: slug });
    return slug;
  },

  resetForServerSwitch: () => {
    set({ currentWorkspaceId: null, currentWorkspaceSlug: null });
  },

  clearForServer: async (serverId) => {
    await SecureStore.deleteItemAsync(`multica_workspace_slug_v1_${serverId}`);
    if (serverId === getActiveServerId()) {
      set({ currentWorkspaceId: null, currentWorkspaceSlug: null });
    }
  },

  clear: async () => {
    set({ currentWorkspaceId: null, currentWorkspaceSlug: null });
    await SecureStore.deleteItemAsync(slugKey());
    await SecureStore.deleteItemAsync(LEGACY_SLUG_KEY);
  },
}));

/** Sync helper for ApiClient.fetch — reads the current slug without React. */
export function getCurrentSlug(): string | null {
  return useWorkspaceStore.getState().currentWorkspaceSlug;
}
