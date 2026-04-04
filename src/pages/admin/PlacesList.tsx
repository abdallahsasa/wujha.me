import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";

interface PlaceRow {
  id: string;
  name_ar: string;
  is_featured: boolean;
  is_active: boolean;
  city_id: string;
  category_id: string;
  cities: { name_ar: string } | null;
  categories: { name_ar: string } | null;
}

interface FilterOption {
  id: string;
  name_ar: string;
}

const PlacesList = () => {
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFilters = async () => {
    const [citiesRes, catsRes] = await Promise.all([
      supabase.from("cities").select("id, name_ar").order("sort_order"),
      supabase.from("categories").select("id, name_ar").eq("type", "place").order("sort_order"),
    ]);
    if (citiesRes.data) setCities(citiesRes.data);
    if (catsRes.data) setCategories(catsRes.data);
  };

  const fetchPlaces = async () => {
    setLoading(true);
    let query = supabase
      .from("places")
      .select("id, name_ar, is_featured, is_active, city_id, category_id, cities(name_ar), categories(name_ar)")
      .order("sort_order");

    if (cityFilter !== "all") query = query.eq("city_id", cityFilter);
    if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlaces((data as unknown as PlaceRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [cityFilter, categoryFilter]);

  const toggleField = async (id: string, field: "is_featured" | "is_active", value: boolean) => {
    const { error } = await supabase.from("places").update({ [field]: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Places</h1>
        <Button asChild>
          <Link to="/admin/places/new">
            <Plus className="mr-2 h-4 w-4" /> Add Place
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Places</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : places.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No places found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name (AR)</TableHead>
                    <TableHead className="min-w-[100px]">City</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[80px]">Featured</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {places.map((place) => (
                    <TableRow key={place.id}>
                      <TableCell className="font-medium">{place.name_ar}</TableCell>
                      <TableCell>{place.cities?.name_ar ?? "—"}</TableCell>
                      <TableCell>{place.categories?.name_ar ?? "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={place.is_featured}
                          onCheckedChange={(v) => toggleField(place.id, "is_featured", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={place.is_active}
                          onCheckedChange={(v) => toggleField(place.id, "is_active", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/places/${place.id}/edit`}>
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

export default PlacesList;
