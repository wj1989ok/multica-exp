import { useQuery } from "@tanstack/react-query";
import { ToolDirectoryPage } from "@/components/tool-directory-page";
import { autopilotListOptions } from "@/data/queries/tools";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function AutomationsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const query = useQuery(autopilotListOptions(wsId));
  return (
    <ToolDirectoryPage
      title={t("routes.automations")}
      emptyLabel={t("catalog.empty")}
      errorLabel={t("catalog.error")}
      retryLabel={t("catalog.retry")}
      loading={query.isLoading}
      error={query.isError}
      onRefresh={() => void query.refetch()}
      items={(query.data?.autopilots ?? []).map((item) => ({ id: item.id, title: item.title, subtitle: item.description || item.status, icon: "flash-outline" }))}
    />
  );
}
