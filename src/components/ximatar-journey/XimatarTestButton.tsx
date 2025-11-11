import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export const XimatarTestButton = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

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
                Unique XIMAtars Assigned: {results.uniqueXIMatars}/11
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setResults(null)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                      <div className="flex flex-col items-center gap-2 mb-2">
                        {r.image && (
                          <img
                            src={r.image}
                            alt={r.assigned}
                            className="w-16 h-16 object-contain"
                          />
                        )}
                        <div className="text-center">
                          <div className="font-semibold text-sm capitalize">
                            {r.assigned}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Target: {r.pattern}
                          </div>
                        </div>
                      </div>
                      
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
