import { useQuery } from "@tanstack/react-query";
import { ToolDirectoryPage } from "@/components/tool-directory-page";
import { squadListOptions } from "@/data/queries/squads";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function TeamsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const query = useQuery(squadListOptions(wsId));
  return (
    <ToolDirectoryPage
      title={t("routes.teams")}
      emptyLabel={t("catalog.empty")}
      errorLabel={t("catalog.error")}
      retryLabel={t("catalog.retry")}
      loading={query.isLoading}
      error={query.isError}
      onRefresh={() => void query.refetch()}
      items={(query.data ?? []).filter((squad) => !squad.archived_at).map((squad) => ({ id: squad.id, title: squad.name, subtitle: squad.description || t("catalog.team_fallback", { count: squad.member_count ?? 0 }), icon: "people-outline" }))}
    />
  );
}
