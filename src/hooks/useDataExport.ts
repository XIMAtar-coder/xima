import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const exportData = async () => {
    setIsExporting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast({
          title: t("dataExport.error"),
          description: t("dataExport.notAuthenticated"),
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("data-export", {
        method: "GET",
      });

      if (response.error) {
        throw new Error(response.error.message || "Export failed");
      }

      // Create blob and trigger download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `xima-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t("dataExport.success"),
        description: t("dataExport.downloadStarted"),
      });
    } catch (error) {
      console.error("Data export failed:", error);
      toast({
        title: t("dataExport.error"),
        description: error instanceof Error ? error.message : t("dataExport.unknownError"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportData, isExporting };
}
