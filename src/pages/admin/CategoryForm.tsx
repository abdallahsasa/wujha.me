import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDraftForm, clearDraft } from "@/hooks/useDraftForm";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  name_ar: z.string().min(1, "Required"),
  name_en: z.string().min(1, "Required"),
  slug: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  icon: z.string().optional(),
  sort_order: z.coerce.number().int(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const CategoryForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);

  const draftKey = `category-${id || "new"}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: "", name_en: "", slug: "", type: "event",
      icon: "", sort_order: 0, is_active: true,
    },
  });

  const { restoreDraft, clearDraft: clearFormDraft } = useDraftForm({ form, draftKey });


  useEffect(() => {
    const load = async () => {
      if (isEdit) {
        const { data, error } = await supabase.from("categories").select("*").eq("id", id).single();
        if (error || !data) {
          toast({ title: "Error", description: "Category not found", variant: "destructive" });
          navigate("/admin/categories");
          return;
        }
        form.reset({
          name_ar: data.name_ar,
          name_en: data.name_en,
          slug: data.slug,
          type: data.type,
          icon: data.icon ?? "",
          sort_order: data.sort_order,
          is_active: data.is_active,
        });
      }
      setPageLoading(false);
      restoreDraft();
    };
    load();
  }, [id]);

  const onSubmit = async (values: FormValues) => {
    const payload = { ...values, icon: values.icon || null };

    if (isEdit) {
      const { error } = await supabase.from("categories").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("categories").insert([payload as any]);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Category created" });
    }
    clearFormDraft();
    navigate("/admin/categories");
  };

  if (pageLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/categories"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Category" : "New Category"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
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
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug *</FormLabel><FormControl><Input placeholder="e.g. concerts" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="place">Place</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="icon" render={({ field }) => (
                  <FormItem><FormLabel>Icon</FormLabel><FormControl><Input placeholder="e.g. 🎵 or icon name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Active</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin/categories")}>Cancel</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryForm;
