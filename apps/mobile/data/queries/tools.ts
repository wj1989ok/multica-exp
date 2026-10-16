import { queryOptions } from "@tanstack/react-query";
import { api } from "@/data/api";

export const toolKeys = {
  skills: (wsId: string | null) => ["skills", wsId] as const,
  autopilots: (wsId: string | null) => ["autopilots", wsId] as const,
};

export const skillListOptions = (wsId: string | null) =>
  queryOptions({
    queryKey: toolKeys.skills(wsId),
    queryFn: ({ signal }) => api.listSkills({ signal }),
    enabled: !!wsId,
  });

export const autopilotListOptions = (wsId: string | null) =>
  queryOptions({
    queryKey: toolKeys.autopilots(wsId),
    queryFn: ({ signal }) => api.listAutopilots({ signal }),
    enabled: !!wsId,
  });

export const dashboardUsageDailyOptions = (wsId: string | null) =>
  queryOptions({
    queryKey: ["dashboard-usage", wsId, "daily", 7] as const,
    queryFn: ({ signal }) => api.getDashboardUsageDaily(
      { days: 7, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { signal },
    ),
    enabled: !!wsId,
    staleTime: 60_000,
  });
