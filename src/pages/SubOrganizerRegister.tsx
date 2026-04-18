import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Calendar, MapPin, User, Phone, Mail, AlertTriangle, CheckCircle2, Layout,
  Clock, Share2, Shield, Zap, Headphones,
  Play, X as XIcon, ChevronLeft, ChevronRight, Plus, Maximize,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { optimizeUrl, galleryUrl } from "@/lib/cloudinary";
import { getEventShareUrl } from "@/lib/share-urls";

const registerSchema = z.object({
  name: z.string()
    .min(2, "الاسم قصير جداً")
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, "الاسم يجب أن يحتوي على حروف فقط (عربي أو إنجليزي)"),
  phone: z.string().min(8, "رقم الهاتف غير صحيح"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  birthday: z.string().min(1, "تاريخ الميلاد مطلوب"),
});

const fmtTime = (d: string) => { try { return format(new Date(d), "HH:mm", { locale: ar }); } catch { return ""; } };
const fmtDateShort = (d: string) => { try { return format(new Date(d), "EEEE d MMMM", { locale: ar }); } catch { return d; } };

const SubOrganizerRegister = () => {
  const { subSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allocation, setAllocation] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [videoLightbox, setVideoLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = useMemo(() => event?.images || [], [event?.images]);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", birthday: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: allocData, error: allocError } = await (supabase as any)
        .from("sub_organizer_allocations")
        .select(`*, sub_organizers:admin_users(name), events (*, venues (*), cities(name_ar), categories(id, name_ar), organizers(name_ar, logo, description_ar)), ticket_types (*)`)
        .eq("unique_slug", subSlug).single();

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
    if (allocation.used_count >= allocation.quota) {
      toast({ title: "اكتمل العدد", description: "نعتذر، لقد وصل هذا المنظم للحد الأقصى من التذاكر.", variant: "destructive" });
      return;
    }
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]+$/;
    const trimmedName = values.name.trim();
    if (trimmedName && !nameRegex.test(trimmedName)) {
      toast({ 
        title: "خطأ في الاسم", 
        description: "الاسم يجب أن يحتوي على حروف فقط", 
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
        guest_count: 1,
        status: "valid",
        payment_status: "free",
        qr_code: null
      };
      const { data, error } = await supabase.rpc("book_tickets", { _tickets: [ticketData] });
      if (error) throw error;
      
      // Trigger confirmation email
      if (values.email) {
        const baseUrl = window.location.origin;
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "ticket-confirmation",
            recipientEmail: values.email.toLowerCase().trim(),
            idempotencyKey: `ticket-confirm-sub-${data[0]?.id}`,
            templateData: {
              guestName: values.name,
              eventTitle: event.title_ar,
              ticketCount: 1,
              confirmationUrl: `${baseUrl}/invite/${allocation.event_id}/confirmation/${data[0]?.id}`,
              eventTerms: event.terms_ar,
            },
          },
        }).catch(console.error);
      }

      toast({ title: "تم التسجيل بنجاح!", description: "تم إصدار تذكرتك بنجاح." });
      navigate(`/invite/${allocation.event_id}/confirmation/${data[0]?.id}`);
    } catch (err: any) {
      toast({ title: "فشل التسجيل", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") handleNextImage();
      if (e.key === "ArrowRight") handlePrevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, images.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Helmet>
          <title>جاري التحميل... | وجهة Wujha</title>
          <meta property="og:title" content="جاري التحميل... | وجهة Wujha" />
        </Helmet>
        <Loader2 className="h-8 w-8 text-wujha-accent animate-spin" />
      </div>
    );
  }

  if (!allocation || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4 text-center">
        <Helmet>
          <title>الرابط غير صالح | وجهة Wujha</title>
          <meta property="og:title" content="الرابط غير صالح | وجهة Wujha" />
        </Helmet>
        <div className="max-w-md space-y-6">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">الرابط غير صالح أو انتهت صلاحيته</h1>
          <Button asChild className="w-full bg-wujha-accent">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSoldOut = allocation.used_count >= allocation.quota;
  const hasEventInfo = event.age_restriction || event.dress_code || event.terms_ar || event.organizers?.description_ar;

  const RegistrationForm = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-6">
        <Badge className="bg-wujha-accent/10 text-wujha-accent mb-2">تسجيل حصري عبر منظم فرعي</Badge>
        <h3 className="text-lg font-bold">احجز مقعدك الآن</h3>
        <p className="text-xs text-muted-foreground">{allocation.ticket_types?.name_ar} — {allocation.seating_area || "منطقة الجلوس العامة"}</p>
      </div>

      {isSoldOut ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <h4 className="font-bold text-red-600">اكتمل العدد</h4>
          <p className="text-xs text-red-500/80">نعتذر، لم يعد هناك مقاعد متوفرة مع هذا المنظم.</p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-bold mr-1">الاسم الكامل</FormLabel><FormControl><Input placeholder="الاسم كما في الهوية" {...field} className="rounded-xl border-wujha-border bg-wujha-bg" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold mr-1">رقم الجوال</FormLabel><FormControl><Input placeholder="09xxxxxxxx" {...field} className="rounded-xl border-wujha-border bg-wujha-bg" dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold mr-1">البريد الإلكتروني (اختياري)</FormLabel><FormControl><Input type="email" placeholder="example@mail.com" {...field} className="rounded-xl border-wujha-border bg-wujha-bg" dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="birthday" render={({ field }) => (
                <FormItem><FormLabel className="text-xs font-bold mr-1">تاريخ الميلاد</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl border-wujha-border bg-wujha-bg" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-wujha-accent hover:opacity-90 text-white font-bold text-base mt-2 shadow-lg shadow-wujha-accent/20">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "تأكيد الحجز والتسجيل"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white rtl" dir="rtl">
      <Helmet>
        <title>{`وجهة | wujha - فعالية ${event.title_ar} | ${allocation.sub_organizers?.name || ""}`}</title>
        <meta property="og:title" content={`وجهة | wujha - فعالية ${event.title_ar} | ${allocation.sub_organizers?.name}`} />
        <meta property="og:description" content={event.short_description_ar || event.description_ar?.substring(0, 150)} />
        <meta property="og:image" content={optimizeUrl(event.hero_thumbnail || event.cover_image || "")} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>
      
      <section className="relative w-full h-[250px] md:h-[400px] overflow-hidden">
        <img src={optimizeUrl(event.hero_thumbnail || event.cover_image || "")} alt={event.title_ar} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {event.video_url && (
          <button onClick={() => setVideoLightbox(true)} className="absolute inset-0 flex items-center justify-center group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition group-hover:scale-110">
              <Play className="h-7 w-7 md:h-8 md:w-8 text-[hsl(var(--wujha-text))] mr-[-2px]" fill="currentColor" />
            </div>
          </button>
        )}
      </section>

      {videoLightbox && event.video_url && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setVideoLightbox(false)}>
          <button className="absolute top-4 left-4 text-white/80 hover:text-white z-10"><XIcon className="h-8 w-8" /></button>
          <div className="w-full max-w-4xl aspect-video"><video src={event.video_url} controls autoPlay className="w-full h-full rounded-lg" /></div>
        </div>
      )}

      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="order-2 lg:order-1 lg:w-[35%] shrink-0">
            <div className="sticky top-24">
              <div className="rounded-2xl border border-wujha-border p-6 bg-white shadow-sm ring-1 ring-black/5">
                <RegistrationForm />
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wujha-accent/10 flex items-center justify-center shrink-0"><Share2 className="h-5 w-5 text-wujha-accent" /></div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ستصلك التذكرة فوراً بعد إتمام عملية التسجيل، يرجى تقديم رمز QR عند الدخول.
                  <br />
                  تنظيم شركة <a href="https://Thedate71.com" target="_blank" rel="noopener noreferrer" className="text-wujha-accent hover:underline">The Date 71</a>
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight">{event.title_ar}</h1>
            <p className="text-gray-500 text-lg mb-6 leading-relaxed">{event.short_description_ar}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <Calendar className="h-5 w-5 text-wujha-accent" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">التاريخ</p>
                  <p className="font-bold text-sm">{fmtDateShort(event.start_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <Clock className="h-5 w-5 text-wujha-accent" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">التوقيت</p>
                  <p className="font-bold text-sm">يبدأ: {fmtTime(event.start_date)} {event.doors_open && `(الأبواب تفتح: ${fmtTime(event.doors_open)})`}</p>
                </div>
              </div>
            </div>

            {event.venues && (
              <div className="flex items-center gap-2 mb-8 text-wujha-accent font-bold hover:underline cursor-pointer">
                <MapPin className="h-5 w-5" />
                <span>{event.venues.name_ar} — {event.cities?.name_ar}</span>
              </div>
            )}

            <div className="prose prose-zinc prose-sm max-w-none text-gray-600 leading-[1.8] mb-12 whitespace-pre-wrap">{event.description_ar}</div>

            {/* ── Gallery ── */}
            {images.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <Layout className="h-5 w-5 text-wujha-accent" />
                  المعرض
                </h2>
                <div className={`grid gap-3 transition-all duration-500 ${
                  images.length === 1 ? "grid-cols-1" :
                  images.length === 2 ? "grid-cols-2" :
                  "grid-cols-2 md:grid-cols-3"
                }`}>
                  {images.map((img: string, i: number) => {
                    const isFeatured = images.length >= 3 && i === 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className={`group relative overflow-hidden rounded-2xl bg-gray-100 transition-all hover:shadow-lg ${
                          isFeatured ? "col-span-2 md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto" : "aspect-square md:aspect-video"
                        }`}
                      >
                        <img
                          src={galleryUrl(img)}
                          alt={`${event.title_ar} ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 flex items-center justify-center">
                          <Plus className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Accordion type="multiple" className="mb-12" defaultValue={["info", "loc"]}>
              {hasEventInfo && (
                <AccordionItem value="info" className="border border-wujha-border rounded-2xl mb-4 px-6 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold">معلومات إضافية</AccordionTrigger>
                  <AccordionContent className="pb-6 space-y-3 pt-2 text-sm text-gray-600">
                    {event.age_restriction && <p>• الفئة العمرية: {event.age_restriction}</p>}
                    {event.dress_code && <p>• تفاصيل اللباس: {event.dress_code}</p>}
                    {event.terms_ar && <div className="p-4 bg-amber-50 rounded-xl border border-amber-100"><p className="font-bold text-amber-800 mb-1">الشروط والأحكام</p><p>{event.terms_ar}</p></div>}
                  </AccordionContent>
                </AccordionItem>
              )}
              {event.venues && (
                <AccordionItem value="loc" className="border border-wujha-border rounded-2xl mb-4 px-6 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline font-bold">الموقع والاتجاهات</AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2">
                    <div className="space-y-4">
                      <p className="text-sm font-bold">{event.venues.address_ar}</p>
                      <div className="h-[250px] rounded-2xl overflow-hidden border border-wujha-border"><iframe title="map" src={`https://www.google.com/maps?q=${event.venues.latitude},${event.venues.longitude}&z=15&output=embed`} className="w-full h-full" loading="lazy" /></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
              {[
                { icon: Shield, title: "حجز آمن", desc: "بياناتك محمية" },
                { icon: Zap, title: "تأكيد فوري", desc: "تذكرتك جاهزة" },
                { icon: CheckCircle2, title: "فعاليات موثقة", desc: "منظمون معتمدون" },
                { icon: Headphones, title: "دعم فني", desc: "نحن هنا لمساعدتك" }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gray-50 flex flex-col items-center text-center">
                  <item.icon className="h-6 w-6 text-wujha-accent mb-2" />
                  <p className="text-xs font-bold mb-1">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* ═══ IMAGE LIGHTBOX ═══ */}
      {lightboxIndex !== null && images.length > 0 && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center animate-in fade-in duration-300" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors" onClick={() => setLightboxIndex(null)}>
            <XIcon className="h-8 w-8" />
          </button>
          
          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center p-4 md:p-12" onClick={e => e.stopPropagation()}>
            <img
              src={galleryUrl(images[lightboxIndex])}
              alt=""
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            />
            
            {images.length > 1 && (
              <>
                <button 
                  onClick={handleNextImage} 
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={handlePrevImage} 
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubOrganizerRegister;
