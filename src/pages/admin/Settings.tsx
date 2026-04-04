import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface SiteSettings {
  site_name: string;
  logo_url: string;
  default_currency: string;
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  shamcash_enabled: boolean;
  shamcash_number: string;
  syriatel_cash_enabled: boolean;
  syriatel_cash_number: string;
  mtn_cash_enabled: boolean;
  mtn_cash_number: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_tiktok: string;
}

const defaultSettings: SiteSettings = {
  site_name: "Wujha وجهة",
  logo_url: "",
  default_currency: "SYP",
  contact_email: "",
  contact_phone: "",
  contact_whatsapp: "",
  shamcash_enabled: false,
  shamcash_number: "",
  syriatel_cash_enabled: false,
  syriatel_cash_number: "",
  mtn_cash_enabled: false,
  mtn_cash_number: "",
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_tiktok: "",
};

const Settings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("id, metadata")
        .eq("page_key", "site_settings")
        .maybeSingle();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else if (data?.metadata) {
        setRowId(data.id);
        setSettings({ ...defaultSettings, ...(data.metadata as unknown as Partial<SiteSettings>) });
      }
      setLoading(false);
    };
    load();
  }, []);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      page_key: "site_settings",
      content_ar: "settings",
      metadata: settings as any,
      updated_at: new Date().toISOString(),
    };

    if (rowId) {
      const { error } = await supabase.from("page_content").update(payload).eq("id", rowId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("page_content").insert([payload]).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      setRowId(data.id);
    }
    toast({ title: "Settings saved" });
    setSaving(false);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Name</label>
              <Input value={settings.site_name} onChange={(e) => update("site_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <Input value={settings.logo_url} onChange={(e) => update("logo_url", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Currency</label>
              <Input value={settings.default_currency} onChange={(e) => update("default_currency", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={settings.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={settings.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp</label>
              <Input value={settings.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ShamCash</p>
              <p className="text-sm text-muted-foreground">Enable ShamCash payment method</p>
            </div>
            <Switch checked={settings.shamcash_enabled} onCheckedChange={(v) => update("shamcash_enabled", v)} />
          </div>
          {settings.shamcash_enabled && (
            <div className="space-y-2 pr-4">
              <label className="text-sm font-medium">ShamCash Number</label>
              <Input placeholder="e.g. 09XXXXXXXX" value={settings.shamcash_number} onChange={(e) => update("shamcash_number", e.target.value)} />
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SyriaTel Cash</p>
              <p className="text-sm text-muted-foreground">Enable SyriaTel Cash payment method</p>
            </div>
            <Switch checked={settings.syriatel_cash_enabled} onCheckedChange={(v) => update("syriatel_cash_enabled", v)} />
          </div>
          {settings.syriatel_cash_enabled && (
            <div className="space-y-2 pr-4">
              <label className="text-sm font-medium">SyriaTel Cash Number</label>
              <Input placeholder="e.g. 09XXXXXXXX" value={settings.syriatel_cash_number} onChange={(e) => update("syriatel_cash_number", e.target.value)} />
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">MTN Cash</p>
              <p className="text-sm text-muted-foreground">Enable MTN Cash payment method</p>
            </div>
            <Switch checked={settings.mtn_cash_enabled} onCheckedChange={(v) => update("mtn_cash_enabled", v)} />
          </div>
          {settings.mtn_cash_enabled && (
            <div className="space-y-2 pr-4">
              <label className="text-sm font-medium">MTN Cash Number</label>
              <Input placeholder="e.g. 09XXXXXXXX" value={settings.mtn_cash_number} onChange={(e) => update("mtn_cash_number", e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Facebook</label>
              <Input placeholder="https://facebook.com/..." value={settings.social_facebook} onChange={(e) => update("social_facebook", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instagram</label>
              <Input placeholder="https://instagram.com/..." value={settings.social_instagram} onChange={(e) => update("social_instagram", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Twitter / X</label>
              <Input placeholder="https://x.com/..." value={settings.social_twitter} onChange={(e) => update("social_twitter", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">TikTok</label>
              <Input placeholder="https://tiktok.com/@..." value={settings.social_tiktok} onChange={(e) => update("social_tiktok", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
