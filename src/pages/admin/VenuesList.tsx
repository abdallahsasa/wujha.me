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

interface VenueRow {
  id: string;
  name_ar: string;
  name_en: string;
  capacity: number | null;
  is_active: boolean;
  city_id: string;
  cities: { name_ar: string } | null;
}

interface FilterOption {
  id: string;
  name_ar: string;
}

const VenuesList = () => {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("id, name_ar").order("sort_order");
    if (data) setCities(data);
  };

  const fetchVenues = async () => {
    setLoading(true);
    let query = supabase
      .from("venues")
      .select("id, name_ar, name_en, capacity, is_active, city_id, cities(name_ar)")
      .order("name_ar");

    if (cityFilter !== "all") query = query.eq("city_id", cityFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setVenues((data as unknown as VenueRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCities(); }, []);
  useEffect(() => { fetchVenues(); }, [cityFilter]);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("venues").update({ is_active: value }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setVenues((prev) => prev.map((v) => (v.id === id ? { ...v, is_active: value } : v)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Venues</h1>
        <Button asChild>
          <Link to="/admin/venues/new">
            <Plus className="mr-2 h-4 w-4" /> Add Venue
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : venues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No venues found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Name (AR)</TableHead>
                    <TableHead className="min-w-[150px]">Name (EN)</TableHead>
                    <TableHead className="min-w-[100px]">City</TableHead>
                    <TableHead className="min-w-[100px]">Capacity</TableHead>
                    <TableHead className="min-w-[80px]">Active</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name_ar}</TableCell>
                      <TableCell>{venue.name_en || "—"}</TableCell>
                      <TableCell>{venue.cities?.name_ar ?? "—"}</TableCell>
                      <TableCell>{venue.capacity ?? "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={venue.is_active}
                          onCheckedChange={(v) => toggleActive(venue.id, v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/venues/${venue.id}/edit`}>
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

export default VenuesList;
