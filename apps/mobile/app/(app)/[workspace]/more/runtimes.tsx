import { useQuery } from "@tanstack/react-query";
import { runtimeDisplayLabel } from "@multica/core/runtimes";
import { ToolDirectoryPage } from "@/components/tool-directory-page";
import { runtimeListOptions } from "@/data/queries/runtimes";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function RuntimesPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const query = useQuery(runtimeListOptions(wsId));
  return (
    <ToolDirectoryPage
      title={t("routes.runtimes")}
      emptyLabel={t("catalog.empty")}
      errorLabel={t("catalog.error")}
      retryLabel={t("catalog.retry")}
      loading={query.isLoading}
      error={query.isError}
      onRefresh={() => void query.refetch()}
      items={(query.data ?? []).map((runtime) => ({ id: runtime.id, title: runtimeDisplayLabel(runtime), subtitle: `${runtime.provider} · ${t(`catalog.runtime_status.${runtime.status}`)}`, icon: "hardware-chip-outline" }))}
    />
  );
}
