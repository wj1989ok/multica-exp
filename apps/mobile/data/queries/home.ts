import { queryOptions } from "@tanstack/react-query";
import { api } from "@/data/api";

export const dashboardAssignedCountOptions = (
  wsId: string | null,
  userId: string | null,
) =>
  queryOptions({
    queryKey: ["dashboard", wsId, "assigned-count", userId] as const,
    queryFn: async ({ signal }) => {
      const response = await api.listIssues(
        { assignee_id: userId ?? undefined, limit: 1 },
        { signal },
      );
      return response.total;
    },
    enabled: !!wsId && !!userId,
  });
