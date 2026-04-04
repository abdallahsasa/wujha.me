import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDraftForm, clearDraft } from "@/hooks/useDraftForm";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import CloudinaryGallery from "@/components/admin/CloudinaryGallery";
import LocationInput from "@/components/admin/LocationInput";

const schema = z.object({
  name_ar: z.string().min(1, "Required"),
  name_en: z.string().optional(),
  description_ar: z.string().min(1, "Required"),
  description_en: z.string().optional(),
  address_ar: z.string().min(1, "Required"),
  city_id: z.string().min(1, "Required"),
  category_id: z.string().min(1, "Required"),
  venue_id: z.string().optional(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  phone: z.string().optional(),
  website: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  price_range: z.string().optional(),
  cover_image: z.string().optional(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int(),
});

type FormValues = z.infer<typeof schema>;

interface Option { id: string; name_ar: string }

const PlaceForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cities, setCities] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [venues, setVenues] = useState<Option[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const draftKey = `place-${id || "new"}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: "", name_en: "", description_ar: "", description_en: "",
      address_ar: "", city_id: "", category_id: "", venue_id: "",
      latitude: 0, longitude: 0, phone: "", website: "", whatsapp: "",
      instagram: "", price_range: "", cover_image: "",
      is_featured: false, is_active: true, sort_order: 0,
    },
  });

  const { restoreDraft, clearDraft: clearFormDraft } = useDraftForm({ form, draftKey });

  

  useEffect(() => {
    const load = async () => {
      const [citiesRes, catsRes, venuesRes] = await Promise.all([
        supabase.from("cities").select("id, name_ar").order("sort_order"),
        supabase.from("categories").select("id, name_ar").eq("type", "place").order("sort_order"),
        supabase.from("venues").select("id, name_ar").order("name_ar"),
      ]);
      if (citiesRes.data) setCities(citiesRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (venuesRes.data) setVenues(venuesRes.data);

      if (isEdit) {
        const { data, error } = await supabase.from("places").select("*").eq("id", id).single();
        if (error || !data) {
          toast({ title: "Error", description: "Place not found", variant: "destructive" });
          navigate("/admin/places");
          return;
        }
        form.reset({
          name_ar: data.name_ar,
          name_en: data.name_en ?? "",
          description_ar: data.description_ar,
          description_en: data.description_en ?? "",
          address_ar: data.address_ar,
          city_id: data.city_id,
          category_id: data.category_id,
          venue_id: data.venue_id ?? "",
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          phone: data.phone ?? "",
          website: data.website ?? "",
          whatsapp: data.whatsapp ?? "",
          instagram: data.instagram ?? "",
          price_range: data.price_range ?? "",
          cover_image: data.cover_image ?? "",
          is_featured: data.is_featured,
          is_active: data.is_active,
          sort_order: data.sort_order,
        });
        setGalleryImages(Array.isArray(data.images) ? (data.images as string[]) : []);
      }
      setPageLoading(false);
      restoreDraft();
    };
    load();
  }, [id]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      name_en: values.name_en || null,
      description_en: values.description_en || null,
      venue_id: values.venue_id || null,
      phone: values.phone || null,
      website: values.website || null,
      whatsapp: values.whatsapp || null,
      instagram: values.instagram || null,
      price_range: values.price_range || null,
      cover_image: values.cover_image || null,
      images: galleryImages,
    };

    if (isEdit) {
      const { error } = await supabase.from("places").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Place updated" });
    } else {
      const { error } = await supabase.from("places").insert([payload as any]);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Place created" });
    }
    clearFormDraft();
    navigate("/admin/places");
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
          <Link to="/admin/places"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Place" : "New Place"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Place Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name_ar" render={({ field }) => (
                  <FormItem><FormLabel>Name (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name_en" render={({ field }) => (
                  <FormItem><FormLabel>Name (English)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                  <FormItem><FormLabel>Venue (optional)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {venues.map((v) => <SelectItem key={v.id} value={v.id}>{v.name_ar}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address_ar" render={({ field }) => (
                  <FormItem><FormLabel>Address (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <LocationInput
                  latitude={form.watch("latitude")}
                  longitude={form.watch("longitude")}
                  onChangeLatitude={(v) => form.setValue("latitude", v, { shouldDirty: true })}
                  onChangeLongitude={(v) => form.setValue("longitude", v, { shouldDirty: true })}
                />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="price_range" render={({ field }) => (
                  <FormItem><FormLabel>Price Range</FormLabel><FormControl><Input placeholder="e.g. $$ or $$$$" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cover_image" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <CloudinaryUpload value={field.value || null} onChange={(url) => field.onChange(url || "")} label="Upload Cover" mediaSpec="place-cover" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description_ar" render={({ field }) => (
                <FormItem><FormLabel>Description (Arabic) *</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description_en" render={({ field }) => (
                <FormItem><FormLabel>Description (English)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Gallery */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Gallery Images</label>
                <CloudinaryGallery images={galleryImages} onChange={setGalleryImages} mediaSpec="place-gallery" />
              </div>

              <div className="flex gap-8">
                <FormField control={form.control} name="is_featured" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Featured</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="is_active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Active</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Place" : "Create Place"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin/places")}>Cancel</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceForm;
