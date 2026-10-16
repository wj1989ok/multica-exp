export interface ImportedServerConfig {
  apiUrl: string;
  webUrl: string;
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function fromRecord(value: unknown): ImportedServerConfig | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const nestedValue = record.server ?? record.config ?? record.payload;
  const nested = nestedValue && typeof nestedValue === "object"
    ? (nestedValue as Record<string, unknown>)
    : record;
  const apiUrl = normalizeHttpUrl(
    nested.apiUrl ?? nested.apiURL ?? nested.api_url ?? nested.apiBaseUrl ??
      nested.apiBaseURL ?? nested.api_base_url ?? nested.api ?? nested.serverUrl ??
      nested.server_url ?? nested.url,
  );
  if (!apiUrl) return null;
  const webUrl = normalizeHttpUrl(
    nested.webUrl ?? nested.webURL ?? nested.web_url ?? nested.webBaseUrl ??
      nested.webBaseURL ?? nested.web_base_url ?? nested.appUrl ?? nested.app_url ??
      nested.frontendUrl ?? nested.frontend_url ?? nested.web,
  );
  return { apiUrl, webUrl: webUrl ?? apiUrl };
}

/** Parse a Multica server share QR payload without applying it. */
export function parseServerConfigQr(rawValue: string): ImportedServerConfig | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const fromJson = fromRecord(JSON.parse(value));
    if (fromJson) return fromJson;
  } catch {
    // Continue with URL formats below.
  }

  try {
    const url = new URL(value);
    const params = url.searchParams;
    for (const nestedKey of ["config", "payload", "serverConfig", "server_config"]) {
      const nestedPayload = params.get(nestedKey);
      if (nestedPayload) {
        try {
          const parsed = fromRecord(JSON.parse(nestedPayload));
          if (parsed) return parsed;
        } catch {
          // It may be another supported URL format.
        }
      }
    }
    const fromParams = fromRecord({
      apiUrl: params.get("apiUrl") ?? params.get("apiURL") ?? params.get("api_url") ??
        params.get("apiBaseUrl") ?? params.get("apiBaseURL") ?? params.get("api_base_url") ??
        params.get("api") ?? params.get("serverUrl") ?? params.get("server_url") ?? params.get("server"),
      webUrl: params.get("webUrl") ?? params.get("webURL") ?? params.get("web_url") ??
        params.get("webBaseUrl") ?? params.get("webBaseURL") ?? params.get("web_base_url") ??
        params.get("appUrl") ?? params.get("app_url") ?? params.get("frontendUrl") ??
        params.get("frontend_url") ?? params.get("web"),
    });
    if (fromParams) return fromParams;

    if (url.protocol === "http:" || url.protocol === "https:") {
      return { apiUrl: url.origin, webUrl: url.origin };
    }
  } catch {
    // Not a URL payload.
  }

  return null;
}
