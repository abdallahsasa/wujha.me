import { useEffect, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ScanLine, Ticket, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface RecentTicket {
  id: string;
  guest_name: string;
  guest_phone: string;
  created_at: string;
  events: { title_ar: string } | null;
}

const Dashboard = () => {
  const { adminUser } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ events: 0, places: 0, users: 0, tickets: 0, checkinsToday: 0, pendingApprovals: 0 });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [myAllocations, setMyAllocations] = useState<any[]>([]);

  useEffect(() => {
    if (!adminUser) return;
    const isOrganizer = adminUser.role === "organizer";
    const isScanner = adminUser.role === "scanner";
    const orgId = adminUser.organizer_id;

    const fetchData = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (isScanner) {
        setLoading(true);
        // Scanner-specific data: Events they are assigned to
        const { data: assignments } = await (supabase as any)
          .from("event_scanners")
          .select("event_id, events(*)")
          .eq("admin_user_id", adminUser.id);
        
        const events = assignments?.map(a => a.events).filter(Boolean) || [];
        setAssignedEvents(events);

        // Recent check-ins performed by THIS scanner
        const { data: scans } = await supabase
          .from("tickets")
          .select("id, guest_name, guest_phone, created_at, events(title_ar)")
          .eq("checked_in_by", adminUser.id)
          .order("checked_in_at", { ascending: false })
          .limit(10);
        
        setRecentTickets(scans as unknown as RecentTicket[]);

        // Fetch their allocations
        const { data: allocs } = await (supabase as any)
          .from("sub_organizer_allocations")
          .select("*, events(title_ar)")
          .eq("sub_organizer_id", adminUser.id);
        
        setMyAllocations(allocs ?? []);

        // Also fetch registrations via their links
        if (allocs && allocs.length > 0) {
          const allocIds = allocs.map((a: any) => a.id);
          const { data: linkTickets } = await supabase
            .from("tickets")
            .select("id, guest_name, guest_phone, created_at, events(title_ar)")
            .in("allocation_id", allocIds)
            .order("created_at", { ascending: false })
            .limit(10);
          
          if (linkTickets && linkTickets.length > 0) {
            // Merge or separate? Let's keep them separate or prioritize linkTickets for the recent view
            setRecentTickets(prev => [...(linkTickets as any), ...prev].slice(0, 10));
          }
        }
        
        setLoading(false);
        return;
      }

      if (isOrganizer && orgId) {
        const [eventsRes, ticketsRes, checkinsRes] = await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }).eq("organizer_id", orgId),
          supabase.from("tickets").select("id, event_id", { count: "exact", head: true }),
          supabase.from("tickets")
            .select("id, event_id", { count: "exact", head: true })
            .eq("status", "checked_in")
            .gte("checked_in_at", todayStart.toISOString()),
        ]);

        const { data: orgEvents } = await supabase.from("events").select("id").eq("organizer_id", orgId);
        const orgEventIds = new Set(orgEvents?.map(e => e.id) || []);

        const { data: rawTickets } = await supabase
          .from("tickets")
          .select("id, guest_name, guest_phone, created_at, event_id, events(title_ar, organizer_id)")
          .order("created_at", { ascending: false })
          .limit(50);

        const orgTickets = (rawTickets as any[])?.filter(t => orgEventIds.has(t.event_id)) || [];

        // Count unique guests for this organizer
        const { data: allOrgTickets } = await supabase
          .from("tickets")
          .select("guest_phone, guest_email")
          .in("event_id", Array.from(orgEventIds));
        
        const uniqueGuestKeys = new Set();
        allOrgTickets?.forEach(t => {
          const key = t.guest_phone || t.guest_email;
          if (key) uniqueGuestKeys.add(key);
        });

        setCounts({
          events: eventsRes.count ?? 0,
          places: 0,
          users: uniqueGuestKeys.size,
          tickets: orgTickets.length,
          checkinsToday: (rawTickets as any[])?.filter(t => orgEventIds.has(t.event_id) && t.checked_in_at && new Date(t.checked_in_at) >= todayStart).length ?? 0,
          pendingApprovals: 0,
        });
        setRecentTickets(orgTickets.slice(0, 10) as unknown as RecentTicket[]);
      } else {
        const [eventsRes, placesRes, usersRes, totalTicketsRes, checkinsRes, ticketsRes, pendingRes] = await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("places").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("tickets").select("id", { count: "exact", head: true }),
          supabase.from("tickets")
            .select("id", { count: "exact", head: true })
            .eq("status", "checked_in")
            .gte("checked_in_at", todayStart.toISOString()),
          supabase.from("tickets")
            .select("id, guest_name, guest_phone, created_at, events(title_ar)")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
        ]);

        setCounts({
          events: eventsRes.count ?? 0,
          places: placesRes.count ?? 0,
          users: usersRes.count ?? 0,
          tickets: totalTicketsRes.count ?? 0,
          checkinsToday: checkinsRes.count ?? 0,
          pendingApprovals: pendingRes.count ?? 0,
        });
        setRecentTickets((ticketsRes.data as unknown as RecentTicket[]) ?? []);
      }
      setLoading(false);
    };

    fetchData();
  }, [adminUser]);

  const isOrganizer = adminUser?.role === "organizer";
  const isScanner = adminUser?.role === "scanner";

  if (isScanner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">وجهة | Staff Dashboard</h1>
          <p className="text-muted-foreground">Logged in as: {adminUser?.name}</p>
        </div>

        {myAllocations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myAllocations.map(alloc => (
              <Card key={alloc.id} className="border-wujha-accent/20 bg-wujha-accent/[0.02]">
                <CardHeader className="pb-2">
                  <span className="text-[10px] text-wujha-accent font-bold uppercase tracking-wider">Ticket Allocation</span>
                  <CardTitle className="text-sm font-bold truncate">{alloc.events?.title_ar}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black">{alloc.used_count}/{alloc.quota}</p>
                      <p className="text-[10px] text-muted-foreground">Tickets distributed</p>
                    </div>
                    {alloc.seating_area && (
                      <Badge variant="outline" className="text-[10px] h-5 border-wujha-accent/30 text-wujha-accent">
                        {alloc.seating_area}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-8 text-[10px] gap-2 text-wujha-accent hover:bg-wujha-accent/10"
                      onClick={() => {
                        const link = `${window.location.origin}/event/register/${alloc.unique_slug}`;
                        navigator.clipboard.writeText(link);
                        alert("Your registration link has been copied to clipboard!");
                      }}
                    >
                      <Plus className="h-3 w-3" /> Copy My Registration Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-emerald-500/20 shadow-lg">
            <CardHeader className="bg-emerald-500/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                Your Assigned Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : assignedEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No events assigned to you yet.</p>
              ) : (
                <div className="space-y-4">
                  {assignedEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-emerald-500/50 transition-all shadow-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-lg">{event.title_ar}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.start_date), "PPP")}
                        </p>
                      </div>
                      <Button asChild className="bg-emerald-600 hover:bg-emerald-700 ml-4 shadow-md px-6">
                        <Link to={`/scan/${event.id}`}>
                          <ScanLine className="h-4 w-4 mr-2" /> Launch Scanner
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Recent History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : recentTickets.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">You haven't scanned any tickets yet.</p>
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableBody>
                      {recentTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="py-3">
                            <p className="font-bold text-sm">{ticket.guest_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {ticket.events?.title_ar}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-bold">
                              SUCCESS
                            </span>
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
      </div>
    );
  }

  const stats = [
    { title: "Total Events", icon: Calendar, value: counts.events },
    ...(!isOrganizer ? [{ title: "Total Places", icon: MapPin, value: counts.places }] : []),
    ...(!isOrganizer ? [{ title: "Registered Guests", icon: Users, value: counts.users }] : []),
    { title: "Total Tickets", icon: Ticket, value: counts.tickets },
    { title: "Check-ins Today", icon: ScanLine, value: counts.checkinsToday },
    ...(!isOrganizer && counts.pendingApprovals > 0 ? [{ title: "Pending Approvals", icon: Clock, value: counts.pendingApprovals }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {adminUser?.name}</p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${isOrganizer ? 3 : 5} gap-4`}>
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link to="/admin/events/new">
            <Plus className="h-4 w-4" /> Create Event
          </Link>
        </Button>
        {!isOrganizer && (
          <Button variant="outline" asChild>
            <Link to="/admin/places/new">
              <Plus className="h-4 w-4" /> Add Place
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Guest Name</TableHead>
                    <TableHead className="min-w-[120px]">Phone</TableHead>
                    <TableHead className="min-w-[140px]">Event</TableHead>
                    <TableHead className="min-w-[140px]">Registered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.guest_name}</TableCell>
                      <TableCell dir="ltr">{ticket.guest_phone}</TableCell>
                      <TableCell>{ticket.events?.title_ar ?? "—"}</TableCell>
                      <TableCell>{format(new Date(ticket.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
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

export default Dashboard;
