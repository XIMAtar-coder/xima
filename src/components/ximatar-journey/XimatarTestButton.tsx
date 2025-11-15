import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, X, Download } from "lucide-react";
import jsPDF from "jspdf";
import { useXimatarsCatalog } from "@/hooks/useXimatarsCatalog";
export const XimatarTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { catalogMap, loading } = useXimatarsCatalog();
  const runTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("test-ximatar-patterns", {
        body: {},
      });

      if (error) {
        console.error("Test error:", error);
        toast.error("Test failed: " + error.message);
        return;
      }

      setResults(data);
      
      if (data.successful === data.total) {
        toast.success(`All ${data.total} patterns tested! ${data.uniqueXIMatars} unique XIMAtars assigned.`);
      } else {
        toast.warning(`${data.successful}/${data.total} patterns successful. ${data.uniqueXIMatars} unique XIMAtars.`);
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error("Test failed: " + String(error));
    } finally {
      setTesting(false);
    }
  };

  const exportToPDF = async () => {
    if (!results) return;

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("XIMAtar Test Results Report", pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 15;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Test Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
      
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.text(`Successful Tests: ${results.successful}/${results.total}`, pageWidth / 2, yPosition, { align: "center" });
      pdf.text(`Unique XIMAtars: ${results.uniqueXIMatars}/11`, pageWidth / 2, yPosition + 5, { align: "center" });

      yPosition += 20;

      // Results
      for (const result of results.results) {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        // Draw border for each result
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(15, yPosition - 5, pageWidth - 30, 50);

        if (result.success) {
          // XIMAtar name
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 128, 0);
          pdf.text(result.assigned.toUpperCase(), 20, yPosition);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Target: ${result.pattern}`, 20, yPosition + 5);

          // Pillar scores
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          let pillarY = yPosition + 12;
          
          Object.entries(result.pillars)
            .sort(([, a]: any, [, b]: any) => b - a)
            .forEach(([pillar, score]: [string, any]) => {
              const pillarName = pillar.replace(/_/g, " ");
              pdf.text(`${pillarName}: ${score}`, 25, pillarY);
              
              // Draw bar
              const barWidth = (score / 10) * 60;
              pdf.setFillColor(66, 113, 214);
              pdf.rect(90, pillarY - 3, barWidth, 4, "F");
              
              pillarY += 5;
            });
        } else {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(220, 38, 38);
          pdf.text(`${result.pattern} - FAILED`, 20, yPosition);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Error: ${result.error}`, 20, yPosition + 7);
        }

        yPosition += 55;
      }

      // Footer
      const timestamp = new Date().toISOString();
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generated: ${timestamp}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      pdf.save(`ximatar-test-results-${Date.now()}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF: " + String(error));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      <Button
        onClick={runTest}
        disabled={testing}
        variant="outline"
        size="sm"
        className="shadow-lg"
      >
        {testing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing...
          </>
        ) : (
          "Test All XIMAtars"
        )}
      </Button>

      {results && (
        <Card className="bg-background/95 backdrop-blur-sm shadow-2xl max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">
                XIMAtar Test Results: {results.successful}/{results.total} successful
              </div>
              <div className="text-sm text-muted-foreground">
                Unique XIMAtars Assigned: {results.uniqueXIMatars}/12
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResults(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.results.map((r: any, i: number) => (
                <Card
                  key={i}
                  className={`p-3 transition-all hover:shadow-md ${
                    r.success 
                      ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" 
                      : "border-destructive bg-destructive/5"
                  }`}
                >
                  {r.success ? (
                    <>
                      {(() => {
                        const key = String(r.assigned || r.pattern || '').toLowerCase();
                        const cat = catalogMap.get(key);
                        const imageSrc = cat?.image_url
                          ? String(cat.image_url).replace('public/', '/')
                          : `/ximatars/${key}.png`;
                        const title = cat?.translation?.title || (r.assigned || key);
                        return (
                          <div className="flex flex-col items-center gap-2 mb-2">
                            <img
                              src={imageSrc}
                              alt={title}
                              className="w-16 h-16 object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/ximatars/fox.png';
                              }}
                            />
                            <div className="text-center">
                              <div className="font-semibold text-sm capitalize">{title}</div>
                              <div className="text-xs text-muted-foreground">Target: {r.pattern}</div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      <div className="space-y-1">
                        {Object.entries(r.pillars).map(([pillar, score]: [string, any]) => {
                          const topTwo = Object.entries(r.pillars)
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .slice(0, 2)
                            .map(([p]) => p);
                          const isTop = topTwo.includes(pillar);
                          
                          return (
                            <div key={pillar} className="flex items-center gap-1 text-xs">
                              <Badge
                                variant={isTop ? "default" : "outline"}
                                className="text-[10px] px-1 py-0 h-4 min-w-[60px] justify-center"
                              >
                                {pillar.split('_')[0]}
                              </Badge>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    isTop ? "bg-primary" : "bg-muted-foreground/30"
                                  }`}
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-6 text-right">
                                {score}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="font-semibold text-sm text-destructive mb-1">
                        {r.pattern}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.error}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
