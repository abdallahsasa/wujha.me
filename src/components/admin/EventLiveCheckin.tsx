import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Percent, Radio } from "lucide-react";

interface CheckinEntry {
  id: string;
  guest_name: string;
  guest_phone: string;
  checked_in_at: string;
  checked_in_by_name: string | null;
}

interface Props {
  eventId: string;
}

const EventLiveCheckin = ({ eventId }: Props) => {
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<CheckinEntry[]>([]);

  const fetchStats = useCallback(async () => {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, status, guest_name, guest_phone, checked_in_at, checked_in_by")
      .eq("event_id", eventId);

    if (!tickets) return;

    setTotalRegistered(tickets.length);
    const checkedIn = tickets.filter((t) => t.status === "checked_in");
    setTotalCheckedIn(checkedIn.length);

    // Get recent check-ins with scanner names
    const recent = checkedIn
      .filter((t) => t.checked_in_at)
      .sort((a, b) => new Date(b.checked_in_at!).getTime() - new Date(a.checked_in_at!).getTime())
      .slice(0, 20);

    // Fetch scanner names
    const scannerIds = [...new Set(recent.map((t) => t.checked_in_by).filter(Boolean))];
    let scannerMap: Record<string, string> = {};
    if (scannerIds.length > 0) {
      const { data: scanners } = await supabase
        .from("admin_users")
        .select("id, name")
        .in("id", scannerIds);
      if (scanners) {
        scannerMap = Object.fromEntries(scanners.map((s) => [s.id, s.name]));
      }
    }

    setRecentCheckins(
      recent.map((t) => ({
        id: t.id,
        guest_name: t.guest_name,
        guest_phone: t.guest_phone,
        checked_in_at: t.checked_in_at!,
        checked_in_by_name: t.checked_in_by ? scannerMap[t.checked_in_by] || "Unknown" : null,
      }))
    );
  }, [eventId]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`checkin-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchStats]);

  const percentage = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Big visible counter */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
            <div className="text-6xl md:text-8xl font-bold text-foreground tracking-tight">
              <span className="text-emerald-400">{totalCheckedIn}</span>
              <span className="text-muted-foreground mx-3">/</span>
              <span>{totalRegistered}</span>
            </div>
            <p className="text-lg text-muted-foreground mt-2">guests arrived</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRegistered}</p>
              <p className="text-xs text-muted-foreground">Registered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <UserCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCheckedIn}</p>
              <p className="text-xs text-muted-foreground">Checked In</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Percent className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{percentage}%</p>
              <p className="text-xs text-muted-foreground">Arrival Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Recent check-ins */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Recent Check-ins
          </h3>
          {recentCheckins.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No check-ins yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Scanned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCheckins.map((entry, idx) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.guest_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{entry.guest_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={idx === 0 ? "default" : "secondary"} className="font-mono text-xs">
                        {formatTime(entry.checked_in_at)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.checked_in_by_name || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventLiveCheckin;
