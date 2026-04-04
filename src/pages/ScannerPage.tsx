import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, AlertTriangle, ScanLine, UserPlus, X, Shield, Clock, Loader2 } from "lucide-react";
import { validatePhone, normalizeSyrianPhone } from "@/lib/phone-validation";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

interface TicketResult {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_birthday: string | null;
  status: string;
  checked_in_at: string | null;
  guest_count: number;
  ticket_type_id: string;
}

interface ScanFeedback {
  type: "success" | "already" | "error";
  guestName: string;
  guestPhone: string;
  ticketType: string;
  message: string;
}

interface TicketTypeOption {
  id: string;
  name_ar: string;
  quantity_total: number;
  quantity_sold: number;
}

const ScannerPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventTitle, setEventTitle] = useState("");
  const [checkedIn, setCheckedIn] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);
  const lastCodeRef = useRef("");
  const { adminUser, signOut, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Add Guest state
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeOption[]>([]);
  const [addForm, setAddForm] = useState({ name: "", phone: "", tierId: "", quantity: 1 });
  const [addLoading, setAddLoading] = useState(false);
  
  // Manual Search state
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", birthday: "" });
  const [searchResult, setSearchResult] = useState<TicketResult | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    const [eventRes, ticketsRes, typesRes] = await Promise.all([
      supabase.from("events").select("title_ar").eq("id", eventId).maybeSingle(),
      supabase.from("tickets").select("id, status").eq("event_id", eventId),
      supabase.from("ticket_types").select("id, name_ar, quantity_total, quantity_sold").eq("event_id", eventId).eq("is_active", true).order("sort_order"),
    ]);

    if (eventRes.data) setEventTitle(eventRes.data.title_ar);
    if (ticketsRes.data) {
      setTotalTickets(ticketsRes.data.length);
      setCheckedIn(ticketsRes.data.filter((t) => t.status === "checked_in").length);
    }
    if (typesRes.data) {
      setTicketTypes(typesRes.data as TicketTypeOption[]);
      if (typesRes.data.length > 0 && !addForm.tierId) {
        setAddForm(prev => ({ ...prev, tierId: typesRes.data![0].id }));
      }
    }

    // Fetch last 5 scans for this event
    const { data: history } = await supabase
      .from("tickets")
      .select("id, guest_name, checked_in_at")
      .eq("event_id", eventId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(5);
    
    if (history) setRecentHistory(history);
  }, [eventId]);

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin/login");
      return;
    }
    fetchStats();
  }, [adminUser, authLoading, fetchStats, navigate]);

  const handleQrScan = useCallback(
    async (decodedText: string) => {
      if (processingRef.current || decodedText === lastCodeRef.current) return;
      processingRef.current = true;
      lastCodeRef.current = decodedText;
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);

      try {
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select("id, guest_name, guest_phone, status, checked_in_at, guest_count, ticket_type_id")
          .eq("qr_code", decodedText)
          .eq("event_id", eventId!)
          .maybeSingle();

        if (error || !ticket) {
          setFeedback({ type: "error", guestName: "", guestPhone: "", ticketType: "", message: "تذكرة غير صالحة" });
          scheduleReset();
          return;
        }

        const { data: ttData } = await supabase.from("ticket_types").select("name_ar").eq("id", ticket.ticket_type_id).maybeSingle();
        const ticketTypeName = ttData?.name_ar || "";

        if (ticket.status === "checked_in") {
          const checkedTime = ticket.checked_in_at
            ? new Date(ticket.checked_in_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
            : "";
          setFeedback({
            type: "already", guestName: ticket.guest_name, guestPhone: ticket.guest_phone,
            ticketType: ticketTypeName, message: `تم تسجيل الدخول مسبقاً${checkedTime ? ` الساعة ${checkedTime}` : ""}`,
          });
          scheduleReset();
          return;
        }

        if (ticket.status === "cancelled" || ticket.status === "pending_payment") {
          setFeedback({
            type: "error", guestName: ticket.guest_name, guestPhone: ticket.guest_phone,
            ticketType: ticketTypeName, message: ticket.status === "cancelled" ? "التذكرة ملغاة" : "بانتظار الدفع",
          });
          scheduleReset();
          return;
        }

        const { error: updateError } = await supabase
          .from("tickets")
          .update({ 
            status: "checked_in", 
            checked_in_at: new Date().toISOString(),
            checked_in_by: adminUser?.id || null 
          })
          .eq("id", ticket.id);

        if (updateError) {
          setFeedback({ type: "error", guestName: ticket.guest_name, guestPhone: ticket.guest_phone, ticketType: ticketTypeName, message: "فشل في تسجيل الدخول" });
          scheduleReset();
          return;
        }

        setCheckedIn((prev) => prev + 1);
        setFeedback({
          type: "success", guestName: ticket.guest_name, guestPhone: ticket.guest_phone,
          ticketType: ticketTypeName, message: `${ticket.guest_count} ${ticket.guest_count > 1 ? "أشخاص" : "شخص"}`,
        });
        fetchStats(); // Update history and stats
        scheduleReset();
      } catch {
        setFeedback({ type: "error", guestName: "", guestPhone: "", ticketType: "", message: "خطأ في الاتصال" });
        scheduleReset();
      }
    },
    [eventId, adminUser?.id, fetchStats]
  );

  const scheduleReset = () => {
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      processingRef.current = false;
      lastCodeRef.current = "";
    }, 3000);
  };

  const handleAddGuest = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim() || !addForm.tierId || !eventId) return;
    const cleanedPhone = normalizeSyrianPhone(addForm.phone);
    const phoneCheck = validatePhone(cleanedPhone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error || "رقم الهاتف غير صالح");
      return;
    }
    setAddLoading(true);
    try {
      const now = new Date().toISOString();
      const ticketsToInsert = Array.from({ length: addForm.quantity }, () => ({
        event_id: eventId,
        ticket_type_id: addForm.tierId,
        guest_name: addForm.name.trim(),
        guest_phone: cleanedPhone,
        guest_email: "",
        guest_count: 1,
        payment_method: "cash",
        payment_status: "paid",
        payment_amount: 0,
        status: "checked_in",
        checked_in_at: now,
        qr_code: crypto.randomUUID(),
        checked_in_by: adminUser?.id || null,
      }));

      const { error } = await supabase.from("tickets").insert(ticketsToInsert);
      if (error) throw error;

      const tt = ticketTypes.find(t => t.id === addForm.tierId);
      if (tt) {
        await supabase.from("ticket_types").update({
          quantity_sold: tt.quantity_sold + addForm.quantity,
        }).eq("id", addForm.tierId);
      }

      setCheckedIn(prev => prev + addForm.quantity);
      setTotalTickets(prev => prev + addForm.quantity);
      setShowAddGuest(false);
      setAddForm({ name: "", phone: "", tierId: ticketTypes[0]?.id || "", quantity: 1 });

      setFeedback({
        type: "success",
        guestName: addForm.name.trim(),
        guestPhone: addForm.phone.trim(),
        ticketType: tt?.name_ar || "",
        message: `تم إضافة ${addForm.quantity} تذكرة - دفع نقدي`,
      });
      fetchStats();
      scheduleReset();
    } catch {
      setFeedback({ type: "error", guestName: "", guestPhone: "", ticketType: "", message: "فشل في إضافة الضيف" });
      scheduleReset();
    }
    setAddLoading(false);
  };

  const handleManualSearch = async () => {
    if (!manualForm.name.trim() || !manualForm.birthday || !eventId) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await (supabase as any)
        .from("tickets")
        .select("id, guest_name, guest_phone, guest_birthday, status, checked_in_at, guest_count, ticket_type_id")
        .eq("event_id", eventId)
        .ilike("guest_name", `%${manualForm.name.trim()}%`)
        .eq("guest_birthday", manualForm.birthday)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("لم يتم العثور على تذكرة تطابق هذه البيانات");
      } else {
        setSearchResult(data as TicketResult);
      }
    } catch (err) {
      toast.error("خطأ في البحث");
    } finally {
      setSearching(false);
    }
  };

  const performManualCheckIn = async (ticket: TicketResult) => {
    if (processingRef.current || !eventId) return;
    processingRef.current = true;
    
    try {
      const { data: ttData } = await supabase.from("ticket_types").select("name_ar").eq("id", ticket.ticket_type_id).maybeSingle();
      const ticketTypeName = ttData?.name_ar || "";

      if (ticket.status === "checked_in") {
        toast.info("هذا الضيف مسجل دخوله مسبقاً");
        processingRef.current = false;
        return;
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update({ 
          status: "checked_in", 
          checked_in_at: new Date().toISOString(),
          checked_in_by: adminUser?.id || null 
        })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      setCheckedIn((prev) => prev + 1);
      setFeedback({
        type: "success", guestName: ticket.guest_name, guestPhone: ticket.guest_phone,
        ticketType: ticketTypeName, message: "تم تسجيل الدخول يدوياً"
      });
      setShowManualSearch(false);
      setManualForm({ name: "", birthday: "" });
      setSearchResult(null);
      fetchStats();
      scheduleReset();
    } catch {
      toast.error("فشل في تسجيل الدخول");
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!eventId) return;
    let html5QrCode: any = null;

    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("scanner-viewport");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => handleQrScan(decodedText),
          () => {}
        );
        setCameraReady(true);
      } catch (err: any) {
        setCameraError(err?.message || "فشل في تشغيل الكاميرا");
      }
    };

    startCamera();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
        html5QrCode.clear();
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [eventId, handleQrScan]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <ScanLine className="h-12 w-12 animate-pulse text-emerald-400" />
      </div>
    );
  }

  const isStaff = adminUser && ["super_admin", "admin", "scanner"].includes(adminUser.role);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 text-white flex flex-col" dir="rtl">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 safe-top flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <ScanLine className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-sm truncate">{eventTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <button
              onClick={() => setShowAddGuest(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition shadow-lg"
            >
              <UserPlus className="w-3.5 h-3.5" />
              إضافة
            </button>
          )}
          {isStaff && (
            <button
              onClick={() => setShowManualSearch(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition shadow-lg"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              بحث يدوي
            </button>
          )}
          <div className="bg-zinc-800 rounded-full px-3 py-1 text-sm font-mono shrink-0 shadow-inner">
            <span className="text-emerald-400 font-bold">{checkedIn}</span>
            <span className="text-zinc-500"> / </span>
            <span className="text-white">{totalTickets}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="relative aspect-square max-h-[50vh] bg-black">
          <div id="scanner-viewport" className="w-full h-full" />
          
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-zinc-400 text-sm">جاري تشغيل الكاميرا...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6">
              <div className="text-center space-y-3">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <p className="text-red-400 text-sm">{cameraError}</p>
                <p className="text-zinc-500 text-xs">تأكد من السماح بالوصول للكاميرا</p>
              </div>
            </div>
          )}

          {feedback && (
            <div className={`absolute inset-0 z-50 flex items-center justify-center transition-all ${
              feedback.type === "success" ? "bg-emerald-600" : feedback.type === "already" ? "bg-amber-600" : "bg-red-600"
            }`}>
              <div className="text-center space-y-4 p-6">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-24 h-24 text-white mx-auto animate-bounce" />
                ) : feedback.type === "already" ? (
                  <AlertTriangle className="w-24 h-24 text-white mx-auto animate-pulse" />
                ) : (
                  <XCircle className="w-24 h-24 text-white mx-auto animate-shake" />
                )}
                <h2 className="text-3xl font-bold text-white">{feedback.guestName || feedback.message}</h2>
                {feedback.guestName && <p className="text-lg text-white/90">{feedback.message}</p>}
                {feedback.ticketType && <p className="text-sm bg-black/20 rounded-full px-4 py-1 inline-block">{feedback.ticketType}</p>}
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="flex-1 bg-zinc-900/50 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3 h-3" />
              آخر عمليات الدخول
            </h3>
          </div>
          <div className="space-y-3">
            {recentHistory.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-4">لا يوجد عمليات دخول بعد</p>
            ) : (
              recentHistory.map((h, i) => (
                <div key={h.id} className={`flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate text-emerald-50">{h.guest_name}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(h.checked_in_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddGuest && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 space-y-6 border-t sm:border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">إضافة ضيف عند الباب</h3>
              <button onClick={() => setShowAddGuest(false)} className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 mr-1">اسم الضيف</Label>
                <input
                  type="text"
                  placeholder="محمد الأحمد"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 mr-1">رقم الهاتف</Label>
                <input
                  type="tel"
                  placeholder="09xx xxx xxx"
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500 mr-1">فئة التذكرة</Label>
                  <select
                    value={addForm.tierId}
                    onChange={e => setAddForm(f => ({ ...f, tierId: e.target.value }))}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none appearance-none"
                  >
                    {ticketTypes.map(tt => (
                      <option key={tt.id} value={tt.id}>{tt.name_ar}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500 mr-1">الكمية</Label>
                  <div className="flex items-center h-[50px] bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
                    <button onClick={() => setAddForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))} className="flex-1 h-full hover:bg-zinc-700 active:bg-zinc-600 text-lg transition">−</button>
                    <span className="w-8 text-center font-bold">{addForm.quantity}</span>
                    <button onClick={() => setAddForm(f => ({ ...f, quantity: Math.min(10, f.quantity + 1) }))} className="flex-1 h-full hover:bg-zinc-700 active:bg-zinc-600 text-lg transition">+</button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddGuest}
              disabled={addLoading || !addForm.name.trim() || !addForm.phone.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {addLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <>دفع نقدي وتسجيل دخول</>}
            </button>
          </div>
        </div>
      )}

      {showManualSearch && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 space-y-6 border-t sm:border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold">البحث والتحقق</h3>
              </div>
              <button 
                onClick={() => {
                  setShowManualSearch(false);
                  setManualForm({ name: "", birthday: "" });
                  setSearchResult(null);
                }} 
                className="bg-zinc-800 p-2 rounded-full text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 mr-1">الاسم الكامل للضيف</Label>
                <input
                  type="text"
                  placeholder="ابحث عن الاسم..."
                  value={manualForm.name}
                  onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500 mr-1">تاريخ الميلاد للتحقق</Label>
                <input
                  type="date"
                  value={manualForm.birthday}
                  onChange={e => setManualForm(f => ({ ...f, birthday: e.target.value }))}
                  className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition invert brightness-110"
                />
              </div>

              <Button 
                onClick={handleManualSearch} 
                className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10"
                disabled={searching || !manualForm.name.trim() || !manualForm.birthday}
              >
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : "ابحث عن التذكرة"}
              </Button>
            </div>

            {searchResult && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">تم العثور على حجز</p>
                    <h4 className="text-xl font-bold">{searchResult.guest_name}</h4>
                    <p className="text-emerald-400/60 font-mono text-sm">{searchResult.guest_phone}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    searchResult.status === "checked_in" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {searchResult.status === "checked_in" ? "مسجل مسبقاً" : "جاهز للدخول"}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/10">
                  <Button 
                    onClick={() => performManualCheckIn(searchResult)}
                    disabled={searchResult.status === "checked_in"}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                  >
                    تأكيد الهوية وتسجيل الدخول
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerPage;
