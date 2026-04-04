import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Eye } from "lucide-react";

interface OrganizerRow {
  id: string;
  name_ar: string;
  name_en: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
}

interface EventRow {
  id: string;
  title_ar: string;
  start_date: string;
  status: string;
}

const OrganizersList = () => {
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizerRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrganizers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organizers")
      .select("id, name_ar, name_en, email, phone, is_active, is_verified")
      .order("name_ar");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOrganizers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrganizers(); }, []);

  const toggleField = async (id: string, field: "is_verified" | "is_active", value: boolean) => {
    const { error } = await supabase.from("organizers").update({ [field]: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setOrganizers((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const openEvents = async (org: OrganizerRow) => {
    setSelectedOrg(org);
    setEventsOpen(true);
    setEventsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title_ar, start_date, status")
      .eq("organizer_id", org.id)
      .order("start_date", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEvents(data ?? []);
    }
    setEventsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organizers</h1>
        <Button asChild>
          <Link to="/admin/organizers/new">
            <Plus className="mr-2 h-4 w-4" /> Add Organizer
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Organizers</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : organizers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No organizers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name (AR)</TableHead>
                    <TableHead className="min-w-[120px]">Name (EN)</TableHead>
                    <TableHead className="min-w-[160px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Phone</TableHead>
                    <TableHead className="min-w-[80px]">Verified</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizers.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name_ar}</TableCell>
                      <TableCell>{org.name_en || "—"}</TableCell>
                      <TableCell>{org.email || "—"}</TableCell>
                      <TableCell>{org.phone || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={org.is_verified}
                          onCheckedChange={(v) => toggleField(org.id, "is_verified", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={org.is_active}
                          onCheckedChange={(v) => toggleField(org.id, "is_active", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEvents(org)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/organizers/${org.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
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

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Events — {selectedOrg?.name_ar}</DialogTitle>
          </DialogHeader>
          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title_ar}</TableCell>
                    <TableCell>{new Date(e.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "published" ? "default" : "secondary"} className="capitalize">
                        {e.status}
                      </Badge>
                    </TableCell>
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

export default OrganizersList;
