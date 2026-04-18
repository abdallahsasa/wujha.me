import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TicketRow {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_birthday: string | null;
  guest_count: number;
  status: string;
  ticket_code: string;
  created_at: string;
  ticket_types: { name_ar: string } | null;
  sub_organizer_allocations: { seating_area: string | null } | null;
}

const EventTickets = () => {
  const { eventId } = useParams();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchEventDetails();
    fetchTickets();
  }, [eventId]);

  const fetchEventDetails = async () => {
    const { data } = await supabase.from("events").select("title_ar").eq("id", eventId).single();
    if (data) setEventTitle(data.title_ar);
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, ticket_types(name_ar), sub_organizer_allocations(seating_area)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTickets(data as unknown as TicketRow[]);
    }
    setLoading(false);
  };

  const filteredTickets = tickets.filter(t => 
    t.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    t.guest_phone.includes(search) ||
    t.ticket_code?.toLowerCase().includes(search.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ["Guest Name", "Phone", "Email", "Birthday", "Guests", "Ticket Type", "Seating Area", "Code", "Status"];
    const rows = filteredTickets.map(t => [
      t.guest_name,
      t.guest_phone,
      t.guest_email,
      t.guest_birthday || "—",
      t.guest_count,
      t.ticket_types?.name_ar || "—",
      t.sub_organizer_allocations?.seating_area || "—",
      t.ticket_code,
      t.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Tickets_${eventTitle.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export successful", description: "Your guest list has been downloaded." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/events">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Manage Tickets</h1>
          <p className="text-muted-foreground">{eventTitle}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="border-primary text-primary hover:bg-primary/5">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-4 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search guests..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tickets found for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Seating</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.guest_name}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{t.guest_phone}</div>
                          <div className="text-muted-foreground">{t.guest_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{t.guest_birthday || "—"}</TableCell>
                      <TableCell>{t.guest_count}</TableCell>
                      <TableCell>{t.ticket_types?.name_ar || "—"}</TableCell>
                      <TableCell>{t.sub_organizer_allocations?.seating_area || "—"}</TableCell>
                      <TableCell className="font-mono text-xs uppercase">{t.ticket_code}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "checked_in" ? "default" : "secondary"}>
                          {t.status === "checked_in" ? "Checked In" : "Valid"}
                        </Badge>
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

export default EventTickets;
