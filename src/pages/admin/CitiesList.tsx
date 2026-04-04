import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CityRow {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

const addSchema = z.object({
  name_ar: z.string().min(1, "Required"),
  name_en: z.string().min(1, "Required"),
  slug: z.string().min(1, "Required"),
  sort_order: z.coerce.number().int(),
});

type AddFormValues = z.infer<typeof addSchema>;

const CitiesList = () => {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { name_ar: "", name_en: "", slug: "", sort_order: 0 },
  });

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cities")
      .select("id, name_ar, name_en, slug, sort_order, is_active")
      .order("sort_order");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCities(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCities(); }, []);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("cities").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCities((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: value } : c)));
  };

  const reorder = async (id: string, direction: "up" | "down") => {
    const idx = cities.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cities.length) return;

    const current = cities[idx];
    const swap = cities[swapIdx];

    const { error: e1 } = await supabase.from("cities").update({ sort_order: swap.sort_order }).eq("id", current.id);
    const { error: e2 } = await supabase.from("cities").update({ sort_order: current.sort_order }).eq("id", swap.id);

    if (e1 || e2) {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
      return;
    }

    const updated = [...cities];
    updated[idx] = { ...current, sort_order: swap.sort_order };
    updated[swapIdx] = { ...swap, sort_order: current.sort_order };
    updated.sort((a, b) => a.sort_order - b.sort_order);
    setCities(updated);
  };

  const onAdd = async (values: AddFormValues) => {
    const { error } = await supabase.from("cities").insert([values as any]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "City added" });
    form.reset();
    setDialogOpen(false);
    fetchCities();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cities</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add City</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New City</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAdd)} className="space-y-4">
                <FormField control={form.control} name="name_ar" render={({ field }) => (
                  <FormItem><FormLabel>Name (Arabic) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name_en" render={({ field }) => (
                  <FormItem><FormLabel>Name (English) *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug *</FormLabel><FormControl><Input placeholder="e.g. damascus" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="sort_order" render={({ field }) => (
                  <FormItem><FormLabel>Sort Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-4 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Adding..." : "Add City"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Cities</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : cities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No cities found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Order</TableHead>
                    <TableHead className="min-w-[120px]">Name (AR)</TableHead>
                    <TableHead className="min-w-[120px]">Name (EN)</TableHead>
                    <TableHead className="min-w-[100px]">Slug</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities.map((city, idx) => (
                    <TableRow key={city.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => reorder(city.id, "up")}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === cities.length - 1} onClick={() => reorder(city.id, "down")}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{city.name_ar}</TableCell>
                      <TableCell>{city.name_en}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{city.slug}</TableCell>
                      <TableCell>
                        <Switch checked={city.is_active} onCheckedChange={(v) => toggleActive(city.id, v)} />
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

export default CitiesList;
