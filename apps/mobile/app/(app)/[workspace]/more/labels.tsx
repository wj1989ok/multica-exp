import { useQuery } from "@tanstack/react-query";
import { ToolDirectoryPage } from "@/components/tool-directory-page";
import { labelListOptions } from "@/data/queries/labels";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function LabelsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const query = useQuery(labelListOptions(wsId));
  return (
    <ToolDirectoryPage
      title={t("routes.labels")}
      emptyLabel={t("catalog.empty")}
      errorLabel={t("catalog.error")}
      retryLabel={t("catalog.retry")}
      loading={query.isLoading}
      error={query.isError}
      onRefresh={() => void query.refetch()}
      items={(query.data ?? []).map((label) => ({ id: label.id, title: label.name, subtitle: label.description ?? undefined, icon: "pricetag-outline" }))}
    />
  );
}
