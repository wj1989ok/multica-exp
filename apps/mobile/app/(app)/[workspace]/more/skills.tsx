import { useQuery } from "@tanstack/react-query";
import { ToolDirectoryPage } from "@/components/tool-directory-page";
import { skillListOptions } from "@/data/queries/tools";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function SkillsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("navigation");
  const query = useQuery(skillListOptions(wsId));
  return (
    <ToolDirectoryPage
      title={t("routes.skills")}
      emptyLabel={t("catalog.empty")}
      errorLabel={t("catalog.error")}
      retryLabel={t("catalog.retry")}
      loading={query.isLoading}
      error={query.isError}
      onRefresh={() => void query.refetch()}
      items={(query.data ?? []).map((skill) => ({ id: skill.id, title: skill.name, subtitle: skill.description, icon: "book-outline" }))}
    />
  );
}
