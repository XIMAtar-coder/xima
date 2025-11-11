import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg text-xs">
          <div className="font-semibold mb-2">
            Test Results: {results.successful}/{results.total} successful
          </div>
          <div className="mb-2">
            Unique XIMAtars: {results.uniqueXIMatars}/11
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {results.results.map((r: any, i: number) => (
              <div
                key={i}
                className={r.success ? "text-green-600" : "text-destructive"}
              >
                {r.pattern}: {r.success ? r.assigned : r.error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
