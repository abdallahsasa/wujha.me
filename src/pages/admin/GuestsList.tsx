import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Eye } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  total_events_attended: number;
  is_active: boolean;
  created_at: string;
  cities: { name_ar: string } | null;
}

interface TicketHistory {
  id: string;
  guest_name: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  events: { title_ar: string; start_date: string } | null;
}

const GuestsList = () => {
  const { adminUser } = useAdminAuth();
  const isOrganizerRole = adminUser?.role === "organizer";
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null);
  const [tickets, setTickets] = useState<TicketHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);

    if (isOrganizerRole && adminUser?.organizer_id) {
      // Organizers: fetch only guests who have tickets to their events
      const { data: orgEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", adminUser.organizer_id);
      
      const eventIds = orgEvents?.map(e => e.id) || [];
      
      if (eventIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get unique user_ids from tickets for those events
      const { data: ticketData } = await supabase
        .from("tickets")
        .select("user_id")
        .in("event_id", eventIds)
        .not("user_id", "is", null);

      const userIds = [...new Set(ticketData?.map(t => t.user_id).filter(Boolean) || [])];
      
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone, email, total_events_attended, is_active, created_at, cities(name_ar)")
        .in("id", userIds)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setUsers((data as unknown as UserRow[]) ?? []);
      }
    } else {
      // Admins: fetch all users
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone, email, total_events_attended, is_active, created_at, cities(name_ar)")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setUsers((data as unknown as UserRow[]) ?? []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  const openHistory = async (user: UserRow) => {
    setHistoryUser(user);
    setHistoryOpen(true);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, guest_name, status, created_at, checked_in_at, events(title_ar, start_date)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTickets((data as unknown as TicketHistory[]) ?? []);
    }
    setHistoryLoading(false);
  };

  const exportCsv = () => {
    const headers = ["Name", "Phone", "Email", "City", "Events Attended", "Active", "Registered At"];
    const rows = users.map((u) => [
      u.name,
      u.phone,
      u.email ?? "",
      u.cities?.name_ar ?? "",
      u.total_events_attended,
      u.is_active ? "Yes" : "No",
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Guests</h1>
        <Button variant="outline" onClick={exportCsv} disabled={users.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Guests ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No guests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name</TableHead>
                    <TableHead className="min-w-[130px]">Phone</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">City</TableHead>
                    <TableHead className="min-w-[80px]">Events</TableHead>
                    <TableHead className="min-w-[110px]">Registered</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>{user.cities?.name_ar ?? "—"}</TableCell>
                      <TableCell>{user.total_events_attended}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openHistory(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Event History — {historyUser?.name}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No events attended yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checked In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.events?.title_ar ?? "—"}</TableCell>
                    <TableCell>{t.events ? new Date(t.events.start_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="capitalize">{t.status}</TableCell>
                    <TableCell>{t.checked_in_at ? new Date(t.checked_in_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestsList;
