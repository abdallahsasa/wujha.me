import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, User, Phone, Mail, AlertTriangle, CheckCircle2, Layout } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Helmet } from "react-helmet-async";

const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  phone: z.string().min(8, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  birthday: z.string().min(1, "Birthday is required"),
});

const SubOrganizerRegister = () => {
  const { subSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allocation, setAllocation] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", birthday: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch allocation by slug
      const { data: allocData, error: allocError } = await (supabase as any)
        .from("sub_organizer_allocations")
        .select(`
          *,
          events (*, venues (*)),
          ticket_types (*)
        `)
        .eq("unique_slug", subSlug)
        .single();

      if (allocError || !allocData) {
        setAllocation(null);
      } else {
        setAllocation(allocData);
        setEvent(allocData.events);
      }
      setLoading(false);
    };

    if (subSlug) fetchData();
  }, [subSlug]);

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    if (!allocation) return;

    // Direct check for quota before proceeding
    if (allocation.used_count >= allocation.quota) {
      toast({ 
        title: "Allocation Full", 
        description: "Sorry, this sub-organizer has reached their ticket limit.", 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);
    try {
      const ticketData = {
        event_id: allocation.event_id,
        ticket_type_id: allocation.ticket_type_id,
        allocation_id: allocation.id,
        guest_name: values.name,
        guest_phone: values.phone,
        guest_email: values.email,
        guest_birthday: values.birthday,
        status: "valid",
        payment_status: "free", // Defaulting to free for this flow, can be adjusted
        qr_code: `SUB-${allocation.id.substring(0,4)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      };

      const { data, error } = await supabase.rpc("book_tickets", { _tickets: [ticketData] });

      if (error) throw error;
      
      const ticketId = data[0]?.id;
      toast({ title: "Registration Successful!", description: "Your ticket has been generated." });
      navigate(`/invite/${allocation.event_id}/confirmation/${ticketId}`);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <Loader2 className="h-8 w-8 text-wujha-accent animate-spin" />
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] p-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invalid Link</h1>
          <p className="text-muted-foreground">This registration link is invalid or has expired.</p>
          <Button asChild className="w-full h-12 rounded-xl bg-wujha-accent hover:bg-wujha-accent/90 text-white font-bold">
            <Link to="/">Back to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSoldOut = allocation.used_count >= allocation.quota;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-wujha-accent/30 rtl">
      <Helmet>
        <title>التسجيل للأفراد | {event?.title_ar}</title>
      </Helmet>

      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-wujha-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 md:py-24">
        {/* Event Header */}
        <div className="mb-8 text-center space-y-4">
          <Badge className="bg-wujha-accent/10 text-wujha-accent border-wujha-accent/20 px-4 py-1">
             تسجيل خاص عبر منظم فرعي
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {event?.title_ar}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-wujha-accent" />
              <span>{new Date(event?.start_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-wujha-accent" />
              <span>{event?.venues?.name_ar}</span>
            </div>
          </div>
        </div>

        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="text-right">
                <CardTitle className="text-lg">تأكيد الحجز</CardTitle>
                <p className="text-sm text-muted-foreground">قم بتعبئة بياناتك للحصول على تذكرتك فوراً</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-8 space-y-8">
            {/* Allocation Info Bar */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">نوع التذكرة</span>
                <p className="text-sm font-bold">{allocation.ticket_types?.name_ar}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">منطقة الجلوس</span>
                <p className="text-sm font-bold flex items-center gap-2">
                   <Layout className="h-3 w-3 text-wujha-accent" />
                   {allocation.seating_area || "عام"}
                </p>
              </div>
            </div>

            {isSoldOut ? (
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center space-y-3">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <h3 className="font-bold text-lg text-amber-500 underline decoration-2">نأسف، اكتمل العدد</h3>
                <p className="text-sm text-amber-500/80 leading-relaxed">
                  هذا المنظم الفرعي قد استنفد كامل المقاعد المخصصة له. يرجى التواصل مع المنظم الرئيسي لمزيد من المعلومات.
                </p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> الاسم الكامل
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ادخل اسمك كما في الهوية..." {...field} className="h-12 bg-white/[0.03] border-white/10 rounded-xl focus:ring-wujha-accent/50 focus:border-wujha-accent text-right" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                          <Phone className="h-3 w-3" /> رقم الجوال
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="09xxxxxxxx" {...field} className="h-12 bg-white/[0.03] border-white/10 rounded-xl focus:ring-wujha-accent/50 focus:border-wujha-accent text-right" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                          <Mail className="h-3 w-3" /> البريد الإلكتروني
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} className="h-12 bg-white/[0.03] border-white/10 rounded-xl focus:ring-wujha-accent/50 focus:border-wujha-accent text-right" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="birthday" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> تاريخ الميلاد
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-12 bg-white/[0.03] border-white/10 rounded-xl focus:ring-wujha-accent/50 focus:border-wujha-accent text-right invert brightness-100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full h-14 rounded-xl bg-wujha-accent hover:bg-wujha-accent/90 text-black font-black text-lg transition-all duration-300 shadow-lg shadow-wujha-accent/20"
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> جاري الحجز...</>
                    ) : (
                      "تأكيد الحجز والحصول على التذكرة"
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="bg-white/[0.02] border-t border-white/5 py-4 text-center">
            <p className="text-[10px] text-muted-foreground w-full">
              بضغطك على تأكيد الحجز، أنت توافق على شروط وأحكام الفعالية وسياسة الخصوصية.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SubOrganizerRegister;
