import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataExport } from "@/hooks/useDataExport";
import { useTranslation } from "react-i18next";

export function DataExportButton() {
  const { exportData, isExporting } = useDataExport();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t("settings.export_title", "Export Your Data")}
        </CardTitle>
        <CardDescription>
          {t("settings.export_body", "Download a copy of all your personal data stored in XIMA. Your data belongs to you — always.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {t("settings.export_includes_label", "This export includes:")}
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
          <li>{t("settings.export_item_1", "Account and profile information")}</li>
          <li>{t("settings.export_item_2", "XIMAtar profile and pillar scores")}</li>
          <li>{t("settings.export_item_3", "All assessment responses and results")}</li>
          <li>{t("settings.export_item_4", "Challenge invitations and submissions")}</li>
          <li>{t("settings.export_item_5", "Chat and AI assistant messages")}</li>
          <li>{t("settings.export_item_6", "Activity logs and preferences")}</li>
        </ul>
        <Button 
          onClick={exportData} 
          disabled={isExporting}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("dataExport.exporting", "Preparing export...")}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t("settings.export_button", "Download My Data")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}