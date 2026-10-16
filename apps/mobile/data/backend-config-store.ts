/**
 * Local server profiles for the mobile app. Server URLs and display names are
 * stored on device; each profile's token and workspace selection are stored
 * separately under the profile id.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const SERVERS_KEY = "multica_servers_v1";
const LEGACY_BACKEND_KEY = "multica_backend_config_v1";

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const ENV_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "";
const DEFAULT_SERVER_ID = "multica-default";

export interface BackendConfig {
  id: string;
  name: string;
  apiUrl: string;
  webUrl: string;
  isDefault?: boolean;
}

interface BackendConfigState {
  servers: BackendConfig[];
  activeServerId: string;
  isLoaded: boolean;
  loadFromStorage: () => Promise<void>;
  addServer: (config: Omit<BackendConfig, "id" | "isDefault">) => Promise<string>;
  updateServer: (id: string, config: Pick<BackendConfig, "name" | "apiUrl" | "webUrl">) => Promise<void>;
  setActiveServer: (id: string) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  useDefaultServer: () => Promise<void>;
}

function normalizeConfig(config: BackendConfig): BackendConfig {
  return {
    ...config,
    name: config.name.trim() || new URL(config.apiUrl).host,
    apiUrl: config.apiUrl.trim().replace(/\/+$/, ""),
    webUrl: config.webUrl.trim().replace(/\/+$/, ""),
  };
}

function createDefaultServer(): BackendConfig | null {
  if (!ENV_API_URL) return null;
  let name = "Default server";
  try {
    if (new URL(ENV_API_URL).hostname === "api.multica.ai") {
      name = "Multica Official Server";
    }
  } catch {
    // Let the editor collect a valid URL if a build-time value is malformed.
  }
  return {
    id: DEFAULT_SERVER_ID,
    name,
    apiUrl: ENV_API_URL.replace(/\/+$/, ""),
    webUrl: (ENV_WEB_URL || ENV_API_URL).replace(/\/+$/, ""),
    isDefault: true,
  };
}

function persist(servers: BackendConfig[], activeServerId: string): Promise<void> {
  return SecureStore.setItemAsync(SERVERS_KEY, JSON.stringify({ servers, activeServerId }));
}

export const useBackendConfigStore = create<BackendConfigState>((set, get) => ({
  servers: [],
  activeServerId: DEFAULT_SERVER_ID,
  isLoaded: false,

  loadFromStorage: async () => {
    const defaultServer = createDefaultServer();
    let servers = defaultServer ? [defaultServer] : [];
    let activeServerId = defaultServer?.id ?? "";
    try {
      const raw = await SecureStore.getItemAsync(SERVERS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const value = parsed as { servers?: unknown; activeServerId?: unknown };
          if (Array.isArray(value.servers)) {
            const localServers = value.servers.filter((item): item is BackendConfig =>
              !!item && typeof item === "object" &&
              typeof item.id === "string" && typeof item.name === "string" &&
              typeof item.apiUrl === "string" && typeof item.webUrl === "string",
            ).map(normalizeConfig);
            servers = [
              ...(defaultServer ? [defaultServer] : []),
              ...localServers.filter((server) => server.id !== DEFAULT_SERVER_ID),
            ];
            if (typeof value.activeServerId === "string" && servers.some((server) => server.id === value.activeServerId)) {
              activeServerId = value.activeServerId;
            }
          }
        }
      } else {
        // Preserve the single custom backend configured by older app builds.
        const legacyRaw = await SecureStore.getItemAsync(LEGACY_BACKEND_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw) as { apiUrl?: unknown; webUrl?: unknown };
          if (typeof legacy.apiUrl === "string" && typeof legacy.webUrl === "string") {
            const id = `server-${encodeURIComponent(legacy.apiUrl).slice(0, 72)}`;
            const custom = normalizeConfig({
              id,
              name: new URL(legacy.apiUrl).host,
              apiUrl: legacy.apiUrl,
              webUrl: legacy.webUrl,
            });
            servers = [...servers.filter((server) => server.apiUrl !== custom.apiUrl), custom];
            activeServerId = custom.id;
            await SecureStore.deleteItemAsync(LEGACY_BACKEND_KEY);
          }
        }
      }
    } catch {
      // Keep the build default if local profile data is unavailable or invalid.
    }
    set({ servers, activeServerId, isLoaded: true });
    if (servers.length) {
      try {
        await persist(servers, activeServerId);
      } catch {
        // Keep the in-memory list usable if secure storage is temporarily unavailable.
      }
    }
  },

  addServer: async (input) => {
    const id = `server-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const server = normalizeConfig({ ...input, id });
    const servers = [...get().servers, server];
    const activeServerId = get().activeServerId || id;
    await persist(servers, activeServerId);
    set({ servers, activeServerId });
    return id;
  },

  updateServer: async (id, input) => {
    const servers = get().servers.map((server) => server.id === id
      ? normalizeConfig({ ...server, ...input })
      : server);
    await persist(servers, get().activeServerId);
    set({ servers });
  },

  setActiveServer: async (id) => {
    if (!get().servers.some((server) => server.id === id)) return;
    await persist(get().servers, id);
    set({ activeServerId: id });
  },

  removeServer: async (id) => {
    const server = get().servers.find((item) => item.id === id);
    if (!server || server.isDefault || get().servers.length <= 1) return;
    const servers = get().servers.filter((item) => item.id !== id);
    const activeServerId = get().activeServerId === id
      ? (servers.find((item) => item.isDefault)?.id ?? servers[0]?.id ?? "")
      : get().activeServerId;
    await SecureStore.deleteItemAsync(`multica_token_v1_${id}`);
    await SecureStore.deleteItemAsync(`multica_workspace_slug_v1_${id}`);
    await persist(servers, activeServerId);
    set({ servers, activeServerId });
  },

  useDefaultServer: async () => {
    const server = get().servers.find((item) => item.isDefault);
    if (server) await get().setActiveServer(server.id);
  },
}));

export function useActiveServer(): BackendConfig | null {
  return useBackendConfigStore((state) => state.servers.find((server) => server.id === state.activeServerId) ?? null);
}

export function getActiveServerId(): string {
  return useBackendConfigStore.getState().activeServerId;
}

export function getActiveServer(): BackendConfig | null {
  const state = useBackendConfigStore.getState();
  return state.servers.find((server) => server.id === state.activeServerId) ?? null;
}

export function useApiUrl(): string {
  return useActiveServer()?.apiUrl ?? "";
}

export function useWebUrl(): string {
  return useActiveServer()?.webUrl ?? "";
}

export function getApiUrl(): string {
  return getActiveServer()?.apiUrl ?? "";
}

export function getWebUrl(): string {
  return getActiveServer()?.webUrl ?? "";
}
