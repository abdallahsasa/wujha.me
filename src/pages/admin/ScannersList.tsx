import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Link2, UserPlus, CheckCircle2, HelpCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ScannerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  auth_id?: string | null;
  event_scanners?: {
    id: string;
    entry_point: string | null;
    events: { id: string; title_ar: string } | null;
  }[];
  scanned_count?: number;
}

interface EventOption {
  id: string;
  title_ar: string;
}

interface AssignmentRow {
  id: string;
  entry_point: string | null;
  events: { id: string; title_ar: string; start_date: string } | null;
}

interface ActivityRow {
  id: string;
  guest_name: string;
  checked_in_at: string | null;
  events: { title_ar: string } | null;
}

const createSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

const assignSchema = z.object({
  event_id: z.string().min(1, "Required"),
  entry_point: z.string().optional(),
});

const ScannersList = () => {
  const [scanners, setScanners] = useState<ScannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<ScannerRow | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const { toast } = useToast();

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const assignForm = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: { event_id: "", entry_point: "" },
  });

  const fetchScanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_users")
      .select(`
        id, 
        name, 
        email, 
        phone, 
        is_active,
        auth_id,
        event_scanners (
          id,
          entry_point,
          events (id, title_ar)
        )
      `)
      .eq("role", "scanner")
      .order("name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // For each scanner, fetch their total scan count
      const staffWithScans = await Promise.all((data as any[]).map(async (s) => {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("checked_in_by", s.id);
        return { ...s, scanned_count: count || 0 };
      }));
      setScanners(staffWithScans as unknown as ScannerRow[] ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchScanners(); }, []);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("admin_users").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setScanners((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: value } : s)));
  };

  const onCreate = async (values: z.infer<typeof createSchema>) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      role: "scanner",
    };
    const { error } = await supabase.from("admin_users").insert([payload as any]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Scanner created" });
    createForm.reset();
    setCreateOpen(false);
    fetchScanners();
  };

  const openAssign = async (scanner: ScannerRow) => {
    setSelectedScanner(scanner);
    setAssignOpen(true);
    setDialogLoading(true);
    assignForm.reset({ event_id: "", entry_point: "" });

    const [eventsRes, assignRes] = await Promise.all([
      supabase.from("events").select("id, title_ar").order("start_date", { ascending: false }),
      supabase
        .from("event_scanners")
        .select("id, entry_point, events(title_ar, start_date)")
        .eq("admin_user_id", scanner.id)
        .order("created_at", { ascending: false }),
    ]);

    setEvents(eventsRes.data ?? []);
    setAssignments((assignRes.data as unknown as AssignmentRow[]) ?? []);
    setDialogLoading(false);
  };

  const onAssign = async (values: z.infer<typeof assignSchema>) => {
    if (!selectedScanner) return;
    const { error } = await supabase.from("event_scanners").insert([{
      admin_user_id: selectedScanner.id,
      event_id: values.event_id,
      entry_point: values.entry_point || null,
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Scanner assigned to event" });
    openAssign(selectedScanner);
    fetchScanners();
  };

  const removeAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from("event_scanners").delete().eq("id", assignmentId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchScanners();
  };

  const openActivity = async (scanner: ScannerRow) => {
    setSelectedScanner(scanner);
    setActivityOpen(true);
    setDialogLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, guest_name, checked_in_at, events(title_ar)")
      .eq("checked_in_by", scanner.id)
      .not("checked_in_at", "is", null)
      .order("checked_in_at", { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setActivity((data as unknown as ActivityRow[]) ?? []);
    }
    setDialogLoading(false);
  };

  const onSendInvite = () => {
    window.open("https://supabase.com/dashboard/project/pvukxnglbickupnjwphf/auth/users", "_blank");
    toast({ 
      title: "Opening Dashboard", 
      description: "Click 'Add User' in the dashboard to invite this staff member officially." 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Scanners</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Scanner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Scanner</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
                <FormField control={createForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-4 justify-end">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createForm.formState.isSubmitting}>
                    {createForm.formState.isSubmitting ? "Creating..." : "Create Scanner"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Scanners</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : scanners.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No scanners found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[150px]">Email & Phone</TableHead>
                    <TableHead className="min-w-[100px]">Total Scanned</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[200px]">Assigned Events / Gates</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                    <TableHead className="min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanners.map((scanner) => (
                    <TableRow key={scanner.id}>
                      <TableCell className="font-medium">{scanner.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{scanner.email}</div>
                        <div className="text-xs text-muted-foreground">{scanner.phone || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {scanner.scanned_count || 0} Scans
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scanner.auth_id ? (
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
                        <div className="flex flex-wrap gap-1">
                          {scanner.event_scanners?.map((a) => (
                            <div key={a.id} className="flex flex-col gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold truncate max-w-[120px]">{a.events?.title_ar}</span>
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}/scan/${a.events?.id}`;
                                    navigator.clipboard.writeText(link);
                                    toast({ title: "Link copied", description: "Scan link copied to clipboard" });
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Copy scan link"
                                >
                                  <Link2 className="h-3 w-3" />
                                </button>
                              </div>
                              <Badge variant="outline" className="text-[9px] h-4 self-start">
                                {a.entry_point || "Any Gate"}
                              </Badge>
                            </div>
                          ))}
                          {(!scanner.event_scanners || scanner.event_scanners.length === 0) && (
                            <span className="text-xs text-white/30 italic">Not assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={scanner.is_active} onCheckedChange={(v) => toggleActive(scanner.id, v)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedScanner(scanner);
                              setInviteOpen(true);
                            }} 
                            title={scanner.auth_id ? "Account Details" : "Setup Staff Access"}
                            className={scanner.auth_id ? "text-emerald-500" : "text-amber-500"}
                          >
                            {scanner.auth_id ? <CheckCircle2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openActivity(scanner)} title="View check-in activity">
                            <Eye className="h-4 w-4 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openAssign(scanner)} title="Assign to scanning gates">
                            <Link2 className="h-4 w-4" />
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

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign — {selectedScanner?.name}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <Form {...assignForm}>
              <form onSubmit={assignForm.handleSubmit(onAssign)} className="flex gap-2 items-end">
                <FormField control={assignForm.control} name="event_id" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title_ar}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={assignForm.control} name="entry_point" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Point</FormLabel>
                    <FormControl><Input placeholder="e.g. Gate A" {...field} /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" size="sm">Assign</Button>
              </form>
            </Form>

            {assignments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Current Assignments</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Entry Point</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.events?.title_ar ?? "—"}</TableCell>
                        <TableCell>{a.entry_point || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeAssignment(a.id)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Activity — {selectedScanner?.name}</DialogTitle></DialogHeader>
          {dialogLoading ? <Skeleton className="h-40 w-full" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Event</TableHead><TableHead>Checked In</TableHead></TableRow></TableHeader>
              <TableBody>
                {activity.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.guest_name}</TableCell>
                    <TableCell>{a.events?.title_ar ?? "—"}</TableCell>
                    <TableCell>{a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Staff Access Setup</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            {selectedScanner?.auth_id ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold">Account Ready</h3>
                <p className="text-sm text-muted-foreground">This staff member is correctly linked.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">Invite this staff member via your project dashboard using this email:</p>
                <code className="block p-3 bg-muted rounded font-mono text-emerald-400 text-center">{selectedScanner?.email}</code>
                <Button onClick={onSendInvite} className="w-full">Open Dashboard <Link2 className="ml-2 h-4 w-4" /></Button>
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setInviteOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannersList;
