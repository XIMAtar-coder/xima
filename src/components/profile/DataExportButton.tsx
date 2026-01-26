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
          {t("dataExport.title")}
        </CardTitle>
        <CardDescription>
          {t("dataExport.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {t("dataExport.includes")}
        </p>
        <ul className="text-sm text-muted-foreground list-disc list-inside mb-4 space-y-1">
          <li>{t("dataExport.includesList.profile")}</li>
          <li>{t("dataExport.includesList.ximatar")}</li>
          <li>{t("dataExport.includesList.assessments")}</li>
          <li>{t("dataExport.includesList.challenges")}</li>
          <li>{t("dataExport.includesList.messages")}</li>
          <li>{t("dataExport.includesList.activity")}</li>
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
              {t("dataExport.exporting")}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t("dataExport.downloadButton")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
