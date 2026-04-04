import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import CloudinaryGallery from "@/components/admin/CloudinaryGallery";
import LocationInput from "@/components/admin/LocationInput";

const schema = z.object({
  name_ar: z.string().min(1, "Required"),
  name_en: z.string().min(1, "Required"),
  description_ar: z.string().min(1, "Required"),
  description_en: z.string().optional(),
  address_ar: z.string().min(1, "Required"),
  city_id: z.string().min(1, "Required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  capacity: z.coerce.number().int().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  cover_image: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Option { id: string; name_ar: string }

const VenueForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cities, setCities] = useState<Option[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const draftKey = `venue-${id || "new"}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: "", name_en: "", description_ar: "", description_en: "",
      address_ar: "", city_id: "", latitude: 0, longitude: 0,
      capacity: undefined, phone: "", website: "", whatsapp: "",
      instagram: "", cover_image: "", is_active: true,
    },
  });

  const { restoreDraft, clearDraft: clearFormDraft } = useDraftForm({ form, draftKey });


  useEffect(() => {
    const load = async () => {
      const { data: citiesData } = await supabase.from("cities").select("id, name_ar").order("sort_order");
      if (citiesData) setCities(citiesData);

      if (isEdit) {
        const { data, error } = await supabase.from("venues").select("*").eq("id", id).single();
        if (error || !data) {
          toast({ title: "Error", description: "Venue not found", variant: "destructive" });
          navigate("/admin/venues");
          return;
        }
        form.reset({
          name_ar: data.name_ar,
          name_en: data.name_en,
          description_ar: data.description_ar,
          description_en: data.description_en ?? "",
          address_ar: data.address_ar,
          city_id: data.city_id,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          capacity: data.capacity ?? undefined,
          phone: data.phone ?? "",
          website: data.website ?? "",
          whatsapp: data.whatsapp ?? "",
          instagram: data.instagram ?? "",
          cover_image: data.cover_image ?? "",
          is_active: data.is_active,
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
      description_en: values.description_en || null,
      capacity: values.capacity ?? null,
      phone: values.phone || null,
      website: values.website || null,
      whatsapp: values.whatsapp || null,
      instagram: values.instagram || null,
      cover_image: values.cover_image || null,
      images: galleryImages,
    };

    if (isEdit) {
      const { error } = await supabase.from("venues").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Venue updated" });
    } else {
      const { error } = await supabase.from("venues").insert([payload as any]);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Venue created" });
    }
    clearFormDraft();
    navigate("/admin/venues");
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
          <Link to="/admin/venues"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Venue" : "New Venue"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Venue Details</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name_ar" render={({ field }) => (
                  <FormItem><FormLabel>Name (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name_en" render={({ field }) => (
                  <FormItem><FormLabel>Name (English) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="city_id" render={({ field }) => (
                  <FormItem><FormLabel>City *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                      <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
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
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />

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
                <FormField control={form.control} name="cover_image" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <CloudinaryUpload value={field.value || null} onChange={(url) => field.onChange(url || "")} label="Upload Cover" mediaSpec="venue-cover" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
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
                <CloudinaryGallery images={galleryImages} onChange={setGalleryImages} mediaSpec="venue-gallery" />
              </div>

              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Active</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Venue" : "Create Venue"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin/venues")}>Cancel</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueForm;
