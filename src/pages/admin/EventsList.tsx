import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Check, X, Ticket, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  status: string;
  city_id: string;
  organizer_id: string | null;
  cities: { name_ar: string } | null;
  tickets: { count: number }[];
}

type PendingCountMap = Record<string, number>;

interface FilterOption {
  id: string;
  name_ar: string;
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "published": return "default";
    case "pending_approval": return "outline";
    case "rejected": return "destructive";
    default: return "secondary";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "pending_approval": return "Pending";
    case "published": return "Published";
    case "rejected": return "Rejected";
    default: return status;
  }
};

const EventsList = () => {
  const { adminUser } = useAdminAuth();
  const isOrganizerRole = adminUser?.role === "organizer";
  const isAdmin = adminUser?.role === "super_admin" || adminUser?.role === "admin";
  const [events, setEvents] = useState<EventRow[]>([]);
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [pendingCounts, setPendingCounts] = useState<PendingCountMap>({});
  const { toast } = useToast();

  const fetchFilters = async () => {
    const { data } = await supabase.from("cities").select("id, name_ar").order("sort_order");
    if (data) setCities(data);
  };

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id, title_ar, start_date, status, city_id, organizer_id, cities(name_ar), tickets(count)")
      .eq("is_deleted", false)
      .order("start_date", { ascending: false });

    if (isOrganizerRole && adminUser?.organizer_id) {
      query = query.eq("organizer_id", adminUser.organizer_id);
    }

    if (cityFilter !== "all") query = query.eq("city_id", cityFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEvents((data as unknown as EventRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFilters(); fetchPendingCounts(); }, []);
  useEffect(() => { fetchEvents(); }, [cityFilter, statusFilter]);

  const fetchPendingCounts = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("event_id")
      .eq("payment_status", "pending");
    if (data) {
      const map: PendingCountMap = {};
      for (const t of data) {
        map[t.event_id] = (map[t.event_id] || 0) + 1;
      }
      setPendingCounts(map);
    }
  };

  const handleApprove = async (ev: EventRow) => {
    const { error } = await supabase.from("events").update({ status: "published" }).eq("id", ev.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Notify the organizer
    if (ev.organizer_id) {
      const { data: orgAdmins } = await supabase
        .from("admin_users")
        .select("id")
        .eq("organizer_id", ev.organizer_id)
        .eq("role", "organizer")
        .eq("is_active", true);
      if (orgAdmins && orgAdmins.length > 0) {
        const notifications = orgAdmins.map((a) => ({
          recipient_admin_id: a.id,
          type: "event_approved",
          title: "Event approved",
          message: `Your event "${ev.title_ar}" has been approved and published.`,
          reference_id: ev.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    }
    toast({ title: "Event approved and published" });
    fetchEvents();
  };

  const handleReject = async (ev: EventRow) => {
    const { error } = await supabase.from("events").update({ status: "rejected" }).eq("id", ev.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    // Notify the organizer
    if (ev.organizer_id) {
      const { data: orgAdmins } = await supabase
        .from("admin_users")
        .select("id")
        .eq("organizer_id", ev.organizer_id)
        .eq("role", "organizer")
        .eq("is_active", true);
      if (orgAdmins && orgAdmins.length > 0) {
        const notifications = orgAdmins.map((a) => ({
          recipient_admin_id: a.id,
          type: "event_rejected",
          title: "Event rejected",
          message: `Your event "${ev.title_ar}" has been rejected.`,
          reference_id: ev.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    }
    toast({ title: "Event rejected" });
    fetchEvents();
  };

  const handleDelete = async (ev: EventRow) => {
    if (!window.confirm("Are you sure you want to archive this event? It will be hidden from the website but all tickets will be kept.")) return;
    
    const { error } = await supabase
      .from("events")
      .update({ is_deleted: true })
      .eq("id", ev.id);
      
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Event archived successfully" });
      fetchEvents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        <Button asChild>
          <Link to="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No events found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Title</TableHead>
                    <TableHead className="min-w-[140px]">Date</TableHead>
                    <TableHead className="min-w-[100px]">City</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Tickets Issued</TableHead>
                    <TableHead className="min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">
                        <span>{ev.title_ar}</span>
                        {pendingCounts[ev.id] > 0 && (
                          <Badge className="mr-2 bg-amber-500 text-white border-0 text-[10px] px-1.5 py-0">
                            {pendingCounts[ev.id]} بانتظار
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(ev.start_date), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell>{ev.cities?.name_ar ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant(ev.status) as any}
                          className={ev.status === "pending_approval" ? "border-orange-400 text-orange-600 bg-orange-50" : ""}
                        >
                          {statusLabel(ev.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{ev.tickets?.[0]?.count ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild title="Manage Tickets">
                            <Link to={`/admin/events/${ev.id}/tickets`}>
                              <Ticket className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit Event">
                            <Link to={`/admin/events/${ev.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(ev)}
                              title="Archive Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && ev.status === "pending_approval" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(ev)}
                                title="Approve"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(ev)}
                                title="Reject"
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventsList;
