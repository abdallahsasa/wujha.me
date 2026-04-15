import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, HelpCircle, Ticket, Copy, Layout, UserPlus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface SubOrganizerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  auth_id?: string | null;
  sub_organizer_allocations?: {
    id: string;
    event_id: string;
    quota: number;
    used_count: number;
    seating_area: string | null;
    unique_slug: string;
    events: { title_ar: string } | null;
    ticket_types: { name_ar: string } | null;
  }[];
}

const allocateSchema = z.object({
  event_id: z.string().min(1, "Required"),
  ticket_type_id: z.string().min(1, "Required"),
  quota: z.number().min(1, "Must be at least 1"),
  seating_area: z.string().optional(),
});

const createFormSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

const SubOrganizersList = () => {
  const [staff, setStaff] = useState<SubOrganizerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<SubOrganizerRow | null>(null);
  const [events, setEvents] = useState<{ id: string; title_ar: string }[]>([]);
  const [ticketTypes, setTicketTypes] = useState<{ id: string; name_ar: string }[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const { toast } = useToast();

  const allocateForm = useForm<z.infer<typeof allocateSchema>>({
    resolver: zodResolver(allocateSchema),
    defaultValues: { event_id: "", ticket_type_id: "", quota: 1, seating_area: "" },
  });

  const createForm = useForm<z.infer<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const fetchData = async () => {
    setLoading(true);
    // Fetch all staff (admin_users with role scanner/admin for sub-organizer duties)
    const { data, error } = await supabase
      .from("admin_users")
      .select(`
        id, name, email, phone, is_active, auth_id,
        sub_organizer_allocations (
          id, event_id, quota, used_count, seating_area, unique_slug,
          events (title_ar),
          ticket_types (name_ar)
        )
      `)
      .eq("role", "sub_organizer")
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setStaff(data as unknown as SubOrganizerRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAllocate = async (person: SubOrganizerRow) => {
    setSelectedStaff(person);
    setAllocateOpen(true);
    setDialogLoading(true);
    allocateForm.reset({ event_id: "", ticket_type_id: "", quota: 1, seating_area: "" });
    setTicketTypes([]);

    const { data } = await supabase.from("events").select("id, title_ar").order("start_date", { ascending: false });
    setEvents(data ?? []);
    setDialogLoading(false);
  };

  const onEventChange = async (eventId: string) => {
    const { data } = await supabase.from("ticket_types").select("id, name_ar").eq("event_id", eventId).eq("is_active", true);
    setTicketTypes(data ?? []);
  };

    const sanitize = (str: string) => str.trim().toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, "") // Remove special chars (like &)
      .replace(/[\s-]+/g, "-") // Collapse spaces/hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

    const nameSlug = sanitize(selectedStaff.name);
    const areaSlug = values.seating_area ? sanitize(values.seating_area) : "";
    const eventPrefix = values.event_id.slice(0, 4);
    const slug = `${eventPrefix}-${nameSlug}${areaSlug ? `-${areaSlug}` : ""}-${Math.random().toString(36).substring(2, 5)}`;
    
    const { error } = await (supabase as any).from("sub_organizer_allocations").insert([{
      event_id: values.event_id,
      sub_organizer_id: selectedStaff.id,
      ticket_type_id: values.ticket_type_id,
      quota: values.quota,
      seating_area: values.seating_area || null,
      unique_slug: slug
    }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Allocation created successfully" });
    fetchData();
    setAllocateOpen(false);
  };

  const removeAllocation = async (id: string) => {
    const { error } = await (supabase as any).from("sub_organizer_allocations").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Allocation removed" });
      fetchData();
    }
  };

  const onCreateStaff = async (values: z.infer<typeof createFormSchema>) => {
    const { error } = await supabase.from("admin_users").insert([{
      name: values.name,
      email: values.email,
      phone: values.phone,
      role: "sub_organizer", // Dedicated role for distributors
      is_active: true
    }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profile created" });
    fetchData();
    setCreateOpen(false);
  };

  const deleteSubOrganizer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely delete ${name}? This will remove their profile and all their allocations.`)) return;
    
    const { error } = await supabase.from("admin_users").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sub-Organizer deleted" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sub-Organizers</h1>
          <p className="text-muted-foreground">Manage ticket distributors and their limits.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-wujha-accent hover:bg-wujha-accent/90">
              <Plus className="h-4 w-4 mr-2" /> Add Distributor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Distributor / Sub-Organizer</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateStaff)} className="space-y-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full">Create Profile</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="min-w-[250px]">Ticket Allocations (Used / Quota)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">
                        {person.name}
                        <div className="text-[10px] text-muted-foreground">{person.email}</div>
                      </TableCell>
                      <TableCell>
                        {person.auth_id ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                            <HelpCircle className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {person.sub_organizer_allocations?.map((alloc) => (
                            <div key={alloc.id} className="p-2 rounded-lg bg-secondary/30 border group relative">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="text-xs font-bold">{alloc.events?.title_ar}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">{alloc.ticket_types?.name_ar}</p>
                                </div>
                                <Badge variant="secondary" className="h-5 text-[10px] font-black">
                                  {alloc.used_count} / {alloc.quota}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                                <button 
                                  onClick={() => {
                                    const link = `${window.location.origin}/event/register/${alloc.unique_slug}`;
                                    navigator.clipboard.writeText(link);
                                    toast({ title: "Registration link copied" });
                                  }}
                                  className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                                >
                                  <Copy className="h-2.5 w-2.5" /> Copy Link
                                </button>
                                {alloc.seating_area && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                                    <Layout className="h-2.5 w-2.5" /> {alloc.seating_area}
                                  </span>
                                )}
                                <button 
                                  onClick={() => removeAllocation(alloc.id)}
                                  className="text-[10px] text-destructive/50 hover:text-destructive ml-auto"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                          {(!person.sub_organizer_allocations || person.sub_organizer_allocations.length === 0) && (
                            <span className="text-xs text-muted-foreground italic">No active quotas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAllocate(person)} className="hover:bg-primary hover:text-primary-foreground">
                            <Ticket className="h-3 w-3 mr-2" /> Allocate
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteSubOrganizer(person.id, person.name)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Ticket Limit for {selectedStaff?.name}</DialogTitle></DialogHeader>
          {dialogLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Form {...allocateForm}>
              <form onSubmit={allocateForm.handleSubmit(onAllocate)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={allocateForm.control} name="event_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Event</FormLabel>
                      <Select 
                        onValueChange={(v) => { field.onChange(v); onEventChange(v); }} 
                        value={field.value}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Pick an event" /></SelectTrigger></FormControl>
                        <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title_ar}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={allocateForm.control} name="ticket_type_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose type" /></SelectTrigger></FormControl>
                        <SelectContent>{ticketTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name_ar}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={allocateForm.control} name="quota" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Quota (Total Tickets)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={allocateForm.control} name="seating_area" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Seating (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. VIP B, Row 4" {...field} /></FormControl><FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full bg-wujha-accent text-white font-bold h-12 rounded-xl">
                  Save & Generate Unique Registration Link
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubOrganizersList;
