import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, PlusCircle, CheckCircle2, Ticket } from "lucide-react";

interface QrPoolStats {
  total: number;
  used: number;
  remaining: number;
}

export default function EventQrPool({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<QrPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(100);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [{ count: total, error: totalErr }, { count: used, error: usedErr }] = await Promise.all([
        supabase
          .from("qr_code_pool")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId),
        supabase
          .from("qr_code_pool")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("is_used", true)
      ]);

      if (totalErr) throw totalErr;
      if (usedErr) throw usedErr;

      const tCount = total || 0;
      const uCount = used || 0;
      setStats({ 
        total: tCount, 
        used: uCount, 
        remaining: tCount - uCount 
      });
    } catch (err: any) {
      console.error("Error fetching pool stats:", err);
      toast({ title: "Error", description: "Failed to load pool statistics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchStats();
  }, [eventId]);

  const handleGenerate = async () => {
    if (generateCount <= 0) return;
    setGenerating(true);
    try {
      const { error } = await supabase.rpc("generate_qr_code_pool", {
        _event_id: eventId,
        _count: generateCount
      });

      if (error) throw error;

      toast({ title: "Success", description: `Generated ${generateCount} QR codes.` });
      fetchStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const { data, error } = await supabase
        .from("qr_code_pool")
        .select("code, is_used, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No codes found", description: "Generate some codes first." });
        return;
      }

      const headers = ["QR Code", "Is Used", "Created At"];
      const rows = data.map(d => [d.code, d.is_used ? "Yes" : "No", d.created_at]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `QR_Pool_${eventId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Export successful" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Total Capacity</CardDescription>
            <CardTitle className="text-2xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used Tickets</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{stats?.used || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Pool</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats?.remaining || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage QR Pool</CardTitle>
          <CardDescription>Generate unique QR code values for this event. These strings follow the event-slug-random format.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-end gap-4 bg-muted/30 p-4 rounded-xl border">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Quantity to generate</label>
              <Input 
                type="number" 
                value={generateCount} 
                onChange={(e) => setGenerateCount(Number(e.target.value))}
                min={1}
                max={10000}
              />
            </div>
            <Button 
              onClick={handleGenerate} 
              disabled={generating || generateCount <= 0}
              className="w-full md:w-auto"
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Generate Codes
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <Button variant="outline" onClick={handleExportCsv} className="flex-1">
              <Download className="mr-2 h-4 w-4" /> Export All Codes (CSV)
            </Button>
            <Button variant="ghost" onClick={fetchStats} className="flex-1">
              Refresh Stats
            </Button>
          </div>

          {stats && stats.total > 0 && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-100 text-green-700 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Pool is active. New bookings will automatically pull codes from this list.</span>
            </div>
          )}
          
          {stats && stats.total === 0 && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              <Ticket className="h-5 w-5" />
              <span>No QR codes generated yet. Bookings for this event will FAIL until you generate a pool.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
