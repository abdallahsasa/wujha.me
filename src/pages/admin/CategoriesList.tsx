import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, ArrowUp, ArrowDown } from "lucide-react";

interface CategoryRow {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  type: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

const CategoriesList = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setLoading(true);
    let query = supabase
      .from("categories")
      .select("id, name_ar, name_en, slug, type, icon, sort_order, is_active")
      .order("type")
      .order("sort_order");

    if (typeFilter !== "all") query = query.eq("type", typeFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCategories(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [typeFilter]);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: value } : c)));
  };

  const reorder = async (id: string, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const current = categories[idx];
    const swap = categories[swapIdx];

    if (current.type !== swap.type) return;

    const { error: e1 } = await supabase.from("categories").update({ sort_order: swap.sort_order }).eq("id", current.id);
    const { error: e2 } = await supabase.from("categories").update({ sort_order: current.sort_order }).eq("id", swap.id);

    if (e1 || e2) {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
      return;
    }

    const updated = [...categories];
    updated[idx] = { ...current, sort_order: swap.sort_order };
    updated[swapIdx] = { ...swap, sort_order: current.sort_order };
    updated.sort((a, b) => a.type.localeCompare(b.type) || a.sort_order - b.sort_order);
    setCategories(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <Button asChild>
          <Link to="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="place">Place</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>All Categories</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No categories found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Order</TableHead>
                    <TableHead className="min-w-[120px]">Name (AR)</TableHead>
                    <TableHead className="min-w-[120px]">Name (EN)</TableHead>
                    <TableHead className="min-w-[100px]">Slug</TableHead>
                    <TableHead className="min-w-[80px]">Type</TableHead>
                    <TableHead className="min-w-[60px]">Icon</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat, idx) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === 0 || categories[idx - 1]?.type !== cat.type}
                            onClick={() => reorder(cat.id, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === categories.length - 1 || categories[idx + 1]?.type !== cat.type}
                            onClick={() => reorder(cat.id, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cat.name_ar}</TableCell>
                      <TableCell>{cat.name_en}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{cat.slug}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{cat.type}</Badge>
                      </TableCell>
                      <TableCell>{cat.icon || "—"}</TableCell>
                      <TableCell>
                        <Switch checked={cat.is_active} onCheckedChange={(v) => toggleActive(cat.id, v)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/categories/${cat.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
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

export default CategoriesList;
