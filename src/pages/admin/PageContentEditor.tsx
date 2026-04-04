import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";

const PAGE_KEYS = [
  { key: "homepage_hero", label: "Homepage Hero" },
  { key: "about", label: "About" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "privacy", label: "Privacy Policy" },
] as const;

interface PageData {
  id?: string;
  page_key: string;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  image: string;
}

const emptyPage = (key: string): PageData => ({
  page_key: key, title_ar: "", title_en: "", content_ar: "", content_en: "", image: "",
});

const PageContentEditor = () => {
  const [pages, setPages] = useState<Record<string, PageData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("id, page_key, title_ar, title_en, content_ar, content_en, image");
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const map: Record<string, PageData> = {};
      PAGE_KEYS.forEach((p) => {
        const found = data?.find((d) => d.page_key === p.key);
        map[p.key] = found
          ? { ...found, title_ar: found.title_ar ?? "", title_en: found.title_en ?? "", content_en: found.content_en ?? "", image: found.image ?? "" }
          : emptyPage(p.key);
      });
      setPages(map);
      setLoading(false);
    };
    load();
  }, []);

  const updateField = (key: string, field: keyof PageData, value: string) => {
    setPages((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const savePage = async (key: string) => {
    setSaving(key);
    const page = pages[key];
    const payload = {
      page_key: key,
      title_ar: page.title_ar || null,
      title_en: page.title_en || null,
      content_ar: page.content_ar,
      content_en: page.content_en || null,
      image: page.image || null,
      updated_at: new Date().toISOString(),
    };

    if (page.id) {
      const { error } = await supabase.from("page_content").update(payload).eq("id", page.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(null); return; }
    } else {
      const { data, error } = await supabase.from("page_content").insert([payload]).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(null); return; }
      setPages((prev) => ({ ...prev, [key]: { ...prev[key], id: data.id } }));
    }
    toast({ title: "Saved" });
    setSaving(null);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Page Content</h1>

      <Tabs defaultValue={PAGE_KEYS[0].key}>
        <TabsList>
          {PAGE_KEYS.map((p) => (
            <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
          ))}
        </TabsList>

        {PAGE_KEYS.map((p) => {
          const page = pages[p.key];
          return (
            <TabsContent key={p.key} value={p.key}>
              <Card>
                <CardHeader><CardTitle>{p.label}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title (Arabic)</label>
                      <Input value={page.title_ar} onChange={(e) => updateField(p.key, "title_ar", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title (English)</label>
                      <Input value={page.title_en} onChange={(e) => updateField(p.key, "title_en", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content (Arabic) *</label>
                    <Textarea rows={8} value={page.content_ar} onChange={(e) => updateField(p.key, "content_ar", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content (English)</label>
                    <Textarea rows={8} value={page.content_en} onChange={(e) => updateField(p.key, "content_en", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Image</label>
                    <CloudinaryUpload
                      value={page.image || null}
                      onChange={(url) => updateField(p.key, "image", url || "")}
                      label="Upload Image"
                      mediaSpec="page-image"
                    />
                  </div>
                  <Button onClick={() => savePage(p.key)} disabled={saving === p.key}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving === p.key ? "Saving..." : "Save"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default PageContentEditor;
