import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDraftForm, clearDraft } from "@/hooks/useDraftForm";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import EventGuestList from "@/components/admin/EventGuestList";
import EventLiveCheckin from "@/components/admin/EventLiveCheckin";
import EventMediaTab from "@/components/admin/EventMediaTab";
import { uploadToCloudinary } from "@/lib/cloudinary";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";

const schema = z.object({
  title_ar: z.string().min(1, "Required"),
  description_ar: z.string().min(1, "Required"),
  short_description_ar: z.string().min(1, "Required"),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().optional(),
  doors_open: z.string().optional(),
  city_id: z.string().min(1, "Required"),
  category_id: z.string().min(1, "Required"),
  venue_id: z.string().optional(),
  organizer_id: z.string().optional(),
  cover_image: z.string().optional(),
  is_free: z.boolean(),
  is_invitation_only: z.boolean(),
  is_featured: z.boolean(),
  max_capacity: z.coerce.number().int().nullable(),
  status: z.string().min(1, "Required"),
  age_restriction: z.string().optional(),
  dress_code: z.string().optional(),
  terms_ar: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
interface Option { id: string; name_ar: string }

interface TicketType {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  price: number;
  price_usd: number | null;
  price_new_syp: number | null;
  price_old_syp: number | null;
  quantity_total: number;
  quantity_sold: number;
  max_per_order: number;
  sort_order: number;
  is_active: boolean;
  _dirty?: boolean;
  _new?: boolean;
}

const EventForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const { adminUser } = useAdminAuth();
  const isOrganizerRole = adminUser?.role === "organizer";
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cities, setCities] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [venues, setVenues] = useState<Option[]>([]);
  const [organizers, setOrganizers] = useState<Option[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Ticket types state
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [ttSaving, setTtSaving] = useState<string | null>(null);

  // Media state
  const [mediaVideoUrl, setMediaVideoUrl] = useState<string | null>(null);
  const [mediaHeroThumbnail, setMediaHeroThumbnail] = useState<string | null>(null);
  const [mediaImages, setMediaImages] = useState<string[]>([]);

  const draftKey = `event-${id || "new"}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title_ar: "", description_ar: "", short_description_ar: "",
      start_date: "", end_date: "", doors_open: "", city_id: "", category_id: "",
      venue_id: "", organizer_id: "", cover_image: "",
      is_free: false, is_invitation_only: false, is_featured: false, max_capacity: null, status: "draft",
      age_restriction: "", dress_code: "", terms_ar: "",
    },
  });

  const { restoreDraft, clearDraft: clearFormDraft } = useDraftForm({ form, draftKey });


  const fetchTicketTypes = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("ticket_types")
      .select("id, name_ar, name_en, description_ar, price, price_usd, price_new_syp, price_old_syp, quantity_total, quantity_sold, max_per_order, sort_order, is_active")
      .eq("event_id", id)
      .order("sort_order");
    if (data) setTicketTypes(data.map(d => ({ ...d, _dirty: false, _new: false })));
  }, [id]);

  useEffect(() => {
    const load = async () => {
      const [citiesRes, catsRes, venuesRes, orgsRes] = await Promise.all([
        supabase.from("cities").select("id, name_ar").order("sort_order"),
        supabase.from("categories").select("id, name_ar").eq("type", "event").order("sort_order"),
        supabase.from("venues").select("id, name_ar").order("name_ar"),
        supabase.from("organizers").select("id, name_ar").order("name_ar"),
      ]);
      if (citiesRes.data) setCities(citiesRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (venuesRes.data) setVenues(venuesRes.data);
      if (orgsRes.data) setOrganizers(orgsRes.data);

      if (isEdit) {
        const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
        if (error || !data) {
          toast({ title: "Error", description: "Event not found", variant: "destructive" });
          navigate("/admin/events");
          return;
        }
        form.reset({
          title_ar: data.title_ar,
          description_ar: data.description_ar,
          short_description_ar: data.short_description_ar,
          start_date: data.start_date ? format(new Date(data.start_date), "yyyy-MM-dd'T'HH:mm") : "",
          end_date: data.end_date ? format(new Date(data.end_date), "yyyy-MM-dd'T'HH:mm") : "",
          doors_open: (data as any).doors_open ? format(new Date((data as any).doors_open), "yyyy-MM-dd'T'HH:mm") : "",
          city_id: data.city_id,
          category_id: data.category_id,
          venue_id: data.venue_id ?? "",
          organizer_id: data.organizer_id ?? "",
          cover_image: data.cover_image ?? "",
          is_free: data.is_free,
          is_invitation_only: data.is_invitation_only,
          is_featured: data.is_featured,
          max_capacity: data.max_capacity,
          status: data.status,
          age_restriction: (data as any).age_restriction ?? "",
          dress_code: (data as any).dress_code ?? "",
          terms_ar: (data as any).terms_ar ?? "",
        });
        setMediaVideoUrl((data as any).hero_video ?? null);
        setMediaHeroThumbnail((data as any).hero_thumbnail ?? null);
        setMediaImages(Array.isArray(data.images) ? (data.images as string[]) : []);
        await fetchTicketTypes();
      }
      setPageLoading(false);
      // Restore draft after server data is loaded
      restoreDraft();
    };
    load();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      form.setValue("cover_image", url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const onSubmit = async (values: FormValues) => {
    // Force pending_approval for organizers creating new events
    const effectiveStatus = (isOrganizerRole && !isEdit) ? "pending_approval" : values.status;
    // Force organizer_id for organizer role
    const effectiveOrganizerId = isOrganizerRole ? (adminUser?.organizer_id || null) : (values.organizer_id || null);

    const payload = {
      title_ar: values.title_ar,
      description_ar: values.description_ar,
      short_description_ar: values.short_description_ar,
      start_date: new Date(values.start_date).toISOString(),
      end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
      doors_open: values.doors_open ? new Date(values.doors_open).toISOString() : null,
      city_id: values.city_id,
      category_id: values.category_id,
      venue_id: values.venue_id || null,
      organizer_id: effectiveOrganizerId,
      cover_image: values.cover_image || null,
      is_free: values.is_free,
      is_invitation_only: values.is_invitation_only,
      is_featured: isOrganizerRole ? false : values.is_featured,
      max_capacity: values.max_capacity,
      status: effectiveStatus,
      age_restriction: values.age_restriction || null,
      dress_code: values.dress_code || null,
      terms_ar: values.terms_ar || null,
    };

    if (isEdit) {
      const { error } = await supabase.from("events").update(payload).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Event updated" });
    } else {
      const { data: insertedData, error } = await supabase.from("events").insert([payload as any]).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

      // If organizer, notify all admins
      if (isOrganizerRole && insertedData) {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id")
          .in("role", ["super_admin", "admin"])
          .eq("is_active", true);
        if (admins && admins.length > 0) {
          const notifications = admins.map((a) => ({
            recipient_admin_id: a.id,
            type: "event_pending_approval",
            title: "New event pending approval",
            message: `"${values.title_ar}" was submitted by an organizer and needs your review.`,
            reference_id: insertedData.id,
          }));
          await supabase.from("notifications").insert(notifications);
        }
        toast({ title: "Event submitted for approval" });
      } else {
        toast({ title: "Event created" });
      }
    }
    clearFormDraft();
    navigate("/admin/events");
  };

  const updateTicketField = (ttId: string, field: keyof TicketType, value: any) => {
    setTicketTypes(prev => prev.map(tt => {
      if (tt.id !== ttId) return tt;
      const updated = { ...tt, [field]: value, _dirty: true };
      // Auto-calculate old SYP when new SYP changes
      if (field === "price_new_syp") {
        const numVal = value === "" || value == null ? null : Number(value);
        updated.price_new_syp = numVal;
        updated.price_old_syp = numVal != null ? numVal * 100 : null;
      }
      return updated;
    }));
  };

  const handleAddTier = () => {
    const newTier: TicketType = {
      id: crypto.randomUUID(),
      name_ar: "",
      name_en: null,
      description_ar: null,
      price: 0,
      price_usd: null,
      price_new_syp: null,
      price_old_syp: null,
      quantity_total: 100,
      quantity_sold: 0,
      max_per_order: 10,
      sort_order: ticketTypes.length,
      is_active: true,
      _dirty: true,
      _new: true,
    };
    setTicketTypes(prev => [...prev, newTier]);
  };

  const handleSaveTicketType = async (tt: TicketType) => {
    if (!id) return;
    if (!tt.name_ar.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setTtSaving(tt.id);
    const payload = {
      event_id: id,
      name_ar: tt.name_ar,
      name_en: tt.name_en || null,
      description_ar: tt.description_ar || null,
      price: 0,
      price_usd: tt.price_usd,
      price_new_syp: tt.price_new_syp,
      price_old_syp: tt.price_old_syp,
      quantity_total: tt.quantity_total,
      max_per_order: tt.max_per_order,
      sort_order: tt.sort_order,
      is_active: tt.is_active,
    };

    if (tt._new) {
      const { data, error } = await supabase.from("ticket_types").insert([payload]).select("id").single();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setTicketTypes(prev => prev.map(t => t.id === tt.id ? { ...t, id: data.id, _dirty: false, _new: false } : t));
        toast({ title: "Tier created" });
      }
    } else {
      const { error } = await supabase.from("ticket_types").update(payload).eq("id", tt.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setTicketTypes(prev => prev.map(t => t.id === tt.id ? { ...t, _dirty: false } : t));
        toast({ title: "Tier updated" });
      }
    }
    setTtSaving(null);
  };

  const handleDeleteTicketType = async (ttId: string, isNew?: boolean) => {
    if (isNew) {
      setTicketTypes(prev => prev.filter(t => t.id !== ttId));
      return;
    }
    const { error } = await supabase.from("ticket_types").delete().eq("id", ttId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTicketTypes(prev => prev.filter(t => t.id !== ttId));
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/events"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Event" : "New Event"}</h1>
      </div>

      {isEdit ? (
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="tickets">Ticket Types</TabsTrigger>
            <TabsTrigger value="guests">Guest List</TabsTrigger>
            <TabsTrigger value="checkin">Live Check-in</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="title_ar" render={({ field }) => (
                        <FormItem><FormLabel>Title (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="short_description_ar" render={({ field }) => (
                        <FormItem><FormLabel>Short Description (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="start_date" render={({ field }) => (
                        <FormItem><FormLabel>Start Date & Time *</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="end_date" render={({ field }) => (
                        <FormItem><FormLabel>End Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="city_id" render={({ field }) => (
                        <FormItem><FormLabel>City *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                            <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="category_id" render={({ field }) => (
                        <FormItem><FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="venue_id" render={({ field }) => (
                        <FormItem><FormLabel>Venue</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                            <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name_ar}</SelectItem>)}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      {!isOrganizerRole && (
                      <FormField control={form.control} name="organizer_id" render={({ field }) => (
                        <FormItem><FormLabel>Organizer</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                            <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {organizers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name_ar}</SelectItem>)}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      )}
                      <FormField control={form.control} name="max_capacity" render={({ field }) => (
                        <FormItem><FormLabel>Max Capacity</FormLabel><FormControl>
                          <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                        </FormControl><FormMessage /></FormItem>
                      )} />
                      {!isOrganizerRole && (
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      )}
                    </div>
                    <FormField control={form.control} name="cover_image" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image</FormLabel>
                        <FormControl>
                          <CloudinaryUpload value={field.value || null} onChange={(url) => field.onChange(url || "")} label="Upload Cover" mediaSpec="event-cover" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description_ar" render={({ field }) => (
                      <FormItem><FormLabel>Description (Arabic) *</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="doors_open" render={({ field }) => (
                        <FormItem><FormLabel>Doors Open</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="age_restriction" render={({ field }) => (
                        <FormItem><FormLabel>Age Restriction</FormLabel><FormControl><Input {...field} placeholder="e.g. +18" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="dress_code" render={({ field }) => (
                        <FormItem><FormLabel>Dress Code</FormLabel><FormControl><Input {...field} placeholder="e.g. رسمي" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="terms_ar" render={({ field }) => (
                      <FormItem><FormLabel>Terms & Conditions (Arabic)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex gap-8">
                      <FormField control={form.control} name="is_free" render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel>Free Event</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="is_invitation_only" render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel>Invitation Only</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      {!isOrganizerRole && (
                      <FormField control={form.control} name="is_featured" render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormLabel>Featured (Hero)</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      )}
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Saving..." : "Update Event"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => navigate("/admin/events")}>Cancel</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <EventMediaTab
              eventId={id!}
              coverImage={form.watch("cover_image") || null}
              heroVideo={mediaVideoUrl}
              heroThumbnail={mediaHeroThumbnail}
              images={mediaImages}
              onUpdate={async () => {
                const { data } = await supabase.from("events").select("cover_image, hero_video, hero_thumbnail, images").eq("id", id).single();
                if (data) {
                  form.setValue("cover_image", (data as any).cover_image ?? "");
                  setMediaVideoUrl((data as any).hero_video ?? null);
                  setMediaHeroThumbnail((data as any).hero_thumbnail ?? null);
                  setMediaImages(Array.isArray((data as any).images) ? ((data as any).images as string[]) : []);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ticket Types</CardTitle>
                  <Button size="sm" onClick={handleAddTier}><Plus className="mr-2 h-4 w-4" /> Add Tier</Button>
                </div>
              </CardHeader>
              <CardContent>
                {ticketTypes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No ticket tiers yet. Click "Add Tier" to create one.</p>
                ) : (
                  <div className="space-y-4">
                    {ticketTypes.map((tt, idx) => (
                      <div key={tt.id} className={`rounded-lg border p-4 space-y-3 ${tt._dirty ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Tier {idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Active</Label>
                              <Switch checked={tt.is_active} onCheckedChange={v => updateTicketField(tt.id, "is_active", v)} />
                            </div>
                            {tt._dirty && (
                              <Button size="sm" variant="default" disabled={ttSaving === tt.id} onClick={() => handleSaveTicketType(tt)}>
                                {ttSaving === tt.id ? "Saving..." : "Save"}
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteTicketType(tt.id, tt._new)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name (Arabic) *</Label>
                            <Input value={tt.name_ar} onChange={e => updateTicketField(tt.id, "name_ar", e.target.value)} placeholder="e.g. VIP" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Name (English)</Label>
                            <Input value={tt.name_en || ""} onChange={e => updateTicketField(tt.id, "name_en", e.target.value || null)} placeholder="Optional" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description (Arabic)</Label>
                            <Input value={tt.description_ar || ""} onChange={e => updateTicketField(tt.id, "description_ar", e.target.value || null)} placeholder="Optional" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Price (ل.س جديدة)</Label>
                            <Input type="number" min={0} value={tt.price_new_syp ?? ""} onChange={e => updateTicketField(tt.id, "price_new_syp", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Price (USD)</Label>
                            <Input type="number" min={0} value={tt.price_usd ?? ""} onChange={e => updateTicketField(tt.id, "price_usd", e.target.value === "" ? null : Number(e.target.value))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Price (ل.س قديمة)</Label>
                            <Input type="number" value={tt.price_old_syp ?? ""} readOnly className="bg-muted cursor-not-allowed" tabIndex={-1} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qty Total</Label>
                            <Input type="number" min={1} value={tt.quantity_total} onChange={e => updateTicketField(tt.id, "quantity_total", Number(e.target.value) || 1)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max/Order</Label>
                            <Input type="number" min={1} value={tt.max_per_order} onChange={e => updateTicketField(tt.id, "max_per_order", Number(e.target.value) || 1)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sort Order</Label>
                            <Input type="number" min={0} value={tt.sort_order} onChange={e => updateTicketField(tt.id, "sort_order", Number(e.target.value) || 0)} />
                          </div>
                          {!tt._new && (
                            <div className="space-y-1">
                              <Label className="text-xs">Sold</Label>
                              <Input value={tt.quantity_sold} readOnly className="bg-muted cursor-not-allowed" tabIndex={-1} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card>
              <CardHeader><CardTitle>Guest List</CardTitle></CardHeader>
              <CardContent>
                <EventGuestList eventId={id!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin">
            <EventLiveCheckin eventId={id!} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader><CardTitle>Event Details</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="title_ar" render={({ field }) => (
                    <FormItem><FormLabel>Title (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="short_description_ar" render={({ field }) => (
                    <FormItem><FormLabel>Short Description (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem><FormLabel>Start Date & Time *</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem><FormLabel>End Date & Time</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city_id" render={({ field }) => (
                    <FormItem><FormLabel>City *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                        <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category_id" render={({ field }) => (
                    <FormItem><FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="venue_id" render={({ field }) => (
                    <FormItem><FormLabel>Venue</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name_ar}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  {!isOrganizerRole && (
                  <FormField control={form.control} name="organizer_id" render={({ field }) => (
                    <FormItem><FormLabel>Organizer</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {organizers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name_ar}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  )}
                  <FormField control={form.control} name="max_capacity" render={({ field }) => (
                    <FormItem><FormLabel>Max Capacity</FormLabel><FormControl>
                      <Input type="number" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  {!isOrganizerRole && (
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  )}
                </div>
                <FormField control={form.control} name="cover_image" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                        {uploading ? "Uploading..." : "Choose File"}
                      </Button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      {field.value && <img src={field.value} alt="Cover" className="h-16 w-24 rounded object-cover border" />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description_ar" render={({ field }) => (
                  <FormItem><FormLabel>Description (Arabic) *</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="doors_open" render={({ field }) => (
                    <FormItem><FormLabel>Doors Open</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="age_restriction" render={({ field }) => (
                    <FormItem><FormLabel>Age Restriction</FormLabel><FormControl><Input {...field} placeholder="e.g. +18" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dress_code" render={({ field }) => (
                    <FormItem><FormLabel>Dress Code</FormLabel><FormControl><Input {...field} placeholder="e.g. رسمي" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="terms_ar" render={({ field }) => (
                  <FormItem><FormLabel>Terms & Conditions (Arabic)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-8">
                  <FormField control={form.control} name="is_free" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Free Event</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_invitation_only" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Invitation Only</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  {!isOrganizerRole && (
                  <FormField control={form.control} name="is_featured" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Featured (Hero)</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                  )}
                </div>
                <div className="flex gap-4">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Create Event"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/admin/events")}>Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventForm;
