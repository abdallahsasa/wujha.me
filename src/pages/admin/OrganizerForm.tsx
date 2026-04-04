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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Copy, Check } from "lucide-react";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";

const schema = z.object({
  name_ar: z.string().min(1, "Required"),
  name_en: z.string().optional(),
  description_ar: z.string().optional(),
  logo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  is_verified: z.boolean(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const OrganizerForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "invited" | "already">("idle");
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const draftKey = `organizer-${id || "new"}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name_ar: "", name_en: "", description_ar: "", logo: "",
      phone: "", email: "", website: "", instagram: "", whatsapp: "",
      is_verified: false, is_active: true,
    },
  });

  const { restoreDraft, clearDraft: clearFormDraft } = useDraftForm({ form, draftKey });


  useEffect(() => {
    const load = async () => {
      if (isEdit) {
        const { data, error } = await supabase.from("organizers").select("*").eq("id", id).single();
        if (error || !data) {
          toast({ title: "Error", description: "Organizer not found", variant: "destructive" });
          navigate("/admin/organizers");
          return;
        }
        form.reset({
          name_ar: data.name_ar,
          name_en: data.name_en ?? "",
          description_ar: data.description_ar ?? "",
          logo: data.logo ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          website: data.website ?? "",
          instagram: data.instagram ?? "",
          whatsapp: data.whatsapp ?? "",
          is_verified: data.is_verified,
          is_active: data.is_active,
        });

        // Check if already invited
        const { data: existingAdmin } = await supabase
          .from("admin_users")
          .select("id")
          .eq("organizer_id", id)
          .maybeSingle();

        if (existingAdmin) {
          setInviteStatus("already");
        }
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
      description_ar: values.description_ar || null,
      logo: values.logo || null,
      phone: values.phone || null,
      email: values.email || null,
      website: values.website || null,
      instagram: values.instagram || null,
      whatsapp: values.whatsapp || null,
    };

    if (isEdit) {
      const { error } = await supabase.from("organizers").update(payload).eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Organizer updated" });
    } else {
      const { error } = await supabase.from("organizers").insert([payload as any]);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Organizer created" });
    }
    clearFormDraft();
    navigate("/admin/organizers");
  };

  const handleInvite = async () => {
    const email = form.getValues("email");
    const name = form.getValues("name_ar");
    if (!email) {
      toast({ title: "Email required", description: "Add an email address before inviting", variant: "destructive" });
      return;
    }

    setInviteStatus("loading");
    const { data, error } = await supabase.functions.invoke("invite-organizer", {
      body: { email, name, organizer_id: id },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setInviteStatus("idle");
      return;
    }

    if (data?.error === "already_invited") {
      setInviteStatus("already");
      toast({ title: "Already invited", description: data.message });
      return;
    }

    if (data?.error) {
      toast({ title: "Error", description: data.error, variant: "destructive" });
      setInviteStatus("idle");
      return;
    }

    setInviteStatus("invited");
    setRecoveryLink(data?.recovery_link || null);
    const emailSent = data?.email_sent;
    toast({ 
      title: "Organizer invited!", 
      description: emailSent 
        ? "An invitation email has been sent with the password setup link." 
        : "Account created. Share the password reset link with them." 
    });
  };

  const handleCopyLink = async () => {
    if (!recoveryLink) return;
    await navigator.clipboard.writeText(recoveryLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <Link to="/admin/organizers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEdit ? "Edit Organizer" : "New Organizer"}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Organizer Details</CardTitle></CardHeader>
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
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="instagram" render={({ field }) => (
                  <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                  <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="logo" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <CloudinaryUpload value={field.value || null} onChange={(url) => field.onChange(url || "")} label="Upload Logo" mediaSpec="organizer-logo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description_ar" render={({ field }) => (
                <FormItem><FormLabel>Description (Arabic)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex gap-8">
                <FormField control={form.control} name="is_verified" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Verified</FormLabel>
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
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Organizer" : "Create Organizer"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin/organizers")}>Cancel</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Invite to CMS Section — only for existing organizers */}
      {isEdit && (
        <Card>
          <CardHeader><CardTitle>CMS Access</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {inviteStatus === "already" && (
              <p className="text-sm text-muted-foreground">✅ This organizer already has CMS access.</p>
            )}

            {inviteStatus === "idle" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Invite this organizer to sign in to the CMS so they can manage their own events.
                </p>
                <Button type="button" onClick={handleInvite} disabled={!form.getValues("email")}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite to CMS
                </Button>
                {!form.getValues("email") && (
                  <p className="text-xs text-muted-foreground">Save an email address first to enable invitations.</p>
                )}
              </>
            )}

            {inviteStatus === "loading" && (
              <p className="text-sm text-muted-foreground">Creating account...</p>
            )}

            {inviteStatus === "invited" && (
              <div className="space-y-3">
                <p className="text-sm text-green-600 font-medium">✅ Organizer invited successfully! An invitation email has been sent.</p>
                {recoveryLink && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fallback: you can also share this link manually:</p>
                    <div className="flex gap-2">
                      <Input value={recoveryLink} readOnly className="text-xs font-mono" />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizerForm;
