import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, CheckCircle, XCircle, AlertCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Ticket {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_amount: number | null;
  checked_in_at: string | null;
  created_at: string;
  qr_code: string;
  ticket_code: string | null;
  ticket_type_id: string;
  sub_organizer_allocations?: { seating_area: string | null } | null;
}

interface TicketType {
  id: string;
  name_ar: string;
}

interface GroupedGuest {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  quantity: number;
  ticketIds: string[];
  ticket_codes: string[];
  checkedInCount: number;
  payment_status: string;
  payment_method: string | null;
  payment_reference: string | null;
  totalAmount: number;
  created_at: string;
  statuses: string[];
  tierName: string;
  ticket_type_id: string;
}

type FilterMode = "all" | "pending" | "paid" | "rejected" | "expired" | "free";

const paymentBadge = (ps: string) => {
  if (ps === "paid") return <Badge className="bg-green-600 text-white">مدفوع</Badge>;
  if (ps === "pending") return <Badge className="bg-amber-500 text-white">بانتظار الدفع</Badge>;
  if (ps === "free") return <Badge className="bg-green-600/80 text-white">مجاني</Badge>;
  if (ps === "rejected") return <Badge className="bg-red-600 text-white">مرفوض</Badge>;
  if (ps === "expired") return <Badge className="bg-red-400 text-white">منتهي</Badge>;
  return <Badge variant="secondary">{ps}</Badge>;
};

export default function EventGuestList({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [eventTerms, setEventTerms] = useState<string>("");
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ticketsRes, typesRes, eventRes] = await Promise.all([
      supabase
        .from("tickets")
        .select("id, guest_name, guest_phone, guest_email, status, payment_status, payment_method, payment_reference, payment_amount, checked_in_at, created_at, qr_code, ticket_code, ticket_type_id, sub_organizer_allocations(seating_area)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase
        .from("ticket_types")
        .select("id, name_ar")
        .eq("event_id", eventId),
      supabase
        .from("events")
        .select("terms_ar")
        .eq("id", eventId)
        .single(),
    ]);
    if (ticketsRes.data) setTickets(ticketsRes.data as Ticket[]);
    if (typesRes.data) setTicketTypes(typesRes.data as TicketType[]);
    if (eventRes.data) setEventTerms(eventRes.data.terms_ar || "");
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const typeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const tt of ticketTypes) m.set(tt.id, tt.name_ar);
    return m;
  }, [ticketTypes]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedGuest>();
    for (const t of tickets) {
      // Group by phone + ticket_type_id for better granularity
      const key = `${t.guest_phone}__${t.ticket_type_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity++;
        existing.ticketIds.push(t.id);
        if (t.ticket_code) existing.ticket_codes.push(t.ticket_code);
        if (t.status === "checked_in") existing.checkedInCount++;
        existing.totalAmount += t.payment_amount ?? 0;
        existing.statuses.push(t.status);
        if (t.created_at < existing.created_at) existing.created_at = t.created_at;
      } else {
        map.set(key, {
          guest_name: t.guest_name,
          guest_phone: t.guest_phone,
          guest_email: t.guest_email,
          quantity: 1,
          ticketIds: [t.id],
          ticket_codes: t.ticket_code ? [t.ticket_code] : [],
          checkedInCount: t.status === "checked_in" ? 1 : 0,
          payment_status: t.payment_status,
          payment_method: t.payment_method,
          payment_reference: t.payment_reference,
          totalAmount: t.payment_amount ?? 0,
          created_at: t.created_at,
          statuses: [t.status],
          tierName: typeMap.get(t.ticket_type_id) || "—",
          ticket_type_id: t.ticket_type_id,
        });
      }
    }
    return Array.from(map.values());
  }, [tickets, typeMap]);

  const pendingCount = useMemo(() => grouped.filter(g => g.payment_status === "pending").length, [grouped]);

  const filtered = useMemo(() => {
    let result = grouped;
    if (filter === "pending") result = result.filter(g => g.payment_status === "pending");
    else if (filter === "paid") result = result.filter(g => g.payment_status === "paid");
    else if (filter === "rejected") result = result.filter(g => g.payment_status === "rejected");
    else if (filter === "expired") result = result.filter(g => g.payment_status === "expired");
    else if (filter === "free") result = result.filter(g => g.payment_status === "free");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.guest_name.toLowerCase().includes(q) || g.guest_phone.includes(q));
    }
    return result;
  }, [grouped, search, filter]);

  const activeTickets = tickets.filter(t => t.status === "valid" || t.status === "pending_payment" || t.status === "checked_in");
  const registered = activeTickets.length;
  const checkedIn = tickets.filter(t => t.status === "checked_in").length;
  const remaining = activeTickets.filter(t => t.status === "valid" || t.status === "pending_payment").length;

  const handleVerify = async (group: GroupedGuest) => {
    setActionLoading(group.guest_phone);
    try {
      // Generate QR codes for tickets missing them
      const updates = group.ticketIds.map(id => {
        const ticket = tickets.find(t => t.id === id);
        const needsQr = !ticket?.qr_code || ticket.qr_code === "";
        return {
          id,
          payment_status: "paid" as const,
          status: "valid" as const,
          ...(needsQr ? { qr_code: crypto.randomUUID() } : {}),
        };
      });

      // Update each ticket
      for (const upd of updates) {
        const { id, ...rest } = upd;
        const { error: updErr } = await supabase.from("tickets").update(rest).eq("id", id);
        if (updErr) console.error("=== TICKET UPDATE ERROR ===", id, updErr);
      }

      // Trigger confirmation email
      if (group.guest_email) {
        const emailPayload = {
          templateName: "ticket-confirmation",
          recipientEmail: group.guest_email,
          idempotencyKey: `ticket-paid-confirm-${group.ticketIds[0]}`,
          templateData: {
            guestName: group.guest_name,
            ticketCount: group.quantity,
            confirmationUrl: `${window.location.origin}/invite/${eventId}/confirmation/${group.ticketIds[0]}`,
            eventTerms: eventTerms,
          },
        };
        console.log("=== SENDING APPROVAL EMAIL ===", JSON.stringify(emailPayload, null, 2));
        try {
          const res = await supabase.functions.invoke("send-transactional-email", { body: emailPayload });
          console.log("=== APPROVAL EMAIL RESPONSE ===", { data: res.data, error: res.error });
        } catch (emailErr) {
          console.error("=== APPROVAL EMAIL EXCEPTION ===", emailErr);
        }
      } else {
        console.warn("=== NO EMAIL ADDRESS — skipping approval email ===", group.guest_name);
      }

      toast.success(`تم تأكيد الدفع لـ ${group.quantity} تذكرة`);
      setTickets(prev => prev.map(t => {
        if (!group.ticketIds.includes(t.id)) return t;
        const upd = updates.find(u => u.id === t.id);
        return { ...t, payment_status: "paid", status: "valid", ...(upd?.qr_code ? { qr_code: upd.qr_code } : {}) };
      }));
    } catch (err) {
      console.error("=== VERIFY HANDLER ERROR ===", err);
      toast.error("فشل في تأكيد الدفع");
    }
    setActionLoading(null);
  };

  const handleReject = async (group: GroupedGuest) => {
    setActionLoading(group.guest_phone);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ payment_status: "rejected", status: "cancelled" })
        .in("id", group.ticketIds);

      if (error) throw error;

      // Decrement quantity_sold on the ticket type
      const { data: ttData, error: ttFetchErr } = await supabase
        .from("ticket_types")
        .select("quantity_sold")
        .eq("id", group.ticket_type_id)
        .single();
      
      console.log("=== QUANTITY BEFORE REJECT ===", { quantity_sold: ttData?.quantity_sold, decrement_by: group.quantity, fetch_error: ttFetchErr });
      
      if (ttData && !ttFetchErr) {
        const newSold = Math.max(0, (ttData.quantity_sold || 0) - group.quantity);
        console.log("=== QUANTITY AFTER REJECT ===", { from: ttData.quantity_sold, to: newSold });
        const { error: updateErr } = await supabase
          .from("ticket_types")
          .update({ quantity_sold: newSold })
          .eq("id", group.ticket_type_id);
        if (updateErr) {
          console.error("=== QUANTITY UPDATE FAILED ===", updateErr);
        } else {
          console.log("=== QUANTITY UPDATE SUCCESS ===");
        }
      }

      // Send rejection email
      if (group.guest_email) {
        const emailPayload = {
          templateName: "payment-rejected",
          recipientEmail: group.guest_email,
          idempotencyKey: `payment-rejected-${group.ticketIds[0]}`,
          templateData: {
            guestName: group.guest_name,
            ticketCount: group.quantity,
          },
        };
        console.log("=== SENDING REJECTION EMAIL ===", JSON.stringify(emailPayload, null, 2));
        try {
          const res = await supabase.functions.invoke("send-transactional-email", { body: emailPayload });
          console.log("=== REJECTION EMAIL RESPONSE ===", { data: res.data, error: res.error });
        } catch (emailErr) {
          console.error("=== REJECTION EMAIL EXCEPTION ===", emailErr);
        }
      } else {
        console.warn("=== NO EMAIL ADDRESS — skipping rejection email ===", group.guest_name);
      }

      toast.success(`تم رفض ${group.quantity} تذكرة`);
      setTickets(prev => prev.map(t =>
        group.ticketIds.includes(t.id) ? { ...t, payment_status: "rejected", status: "cancelled" } : t
      ));
    } catch (err) {
      console.error("=== REJECT HANDLER ERROR ===", err);
      toast.error("فشل في رفض التذاكر");
    }
    setActionLoading(null);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    const msg = encodeURIComponent(`مرحباً ${name}، بخصوص حجزك...`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const exportCsv = () => {
    const header = "Guest Name,Phone,Email,Tier,Seating Area,Status,Payment Status,Payment Method,Payment Ref,Amount,Checked In At,Registered At";
    const rows = tickets.map(t =>
      [
        `"${t.guest_name}"`, t.guest_phone, t.guest_email,
        `"${typeMap.get(t.ticket_type_id) || ""}"`,
        `"${t.sub_organizer_allocations?.seating_area || ""}"`,
        t.status, t.payment_status, t.payment_method || "", t.payment_reference || "",
        t.payment_amount ?? "", t.checked_in_at ? format(new Date(t.checked_in_at), "yyyy-MM-dd HH:mm") : "",
        format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guest-list-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-[200px] w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{registered}</p>
          <p className="text-xs text-muted-foreground">تذاكر</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-foreground">{grouped.length}</p>
          <p className="text-xs text-muted-foreground">ضيوف</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-primary">{checkedIn}</p>
          <p className="text-xs text-muted-foreground">دخلوا</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold text-accent-foreground">{remaining}</p>
          <p className="text-xs text-muted-foreground">متبقي</p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => setFilter(f => f === "pending" ? "all" : "pending")}
            className={`rounded-lg border px-4 py-3 text-center transition ${filter === "pending" ? "border-amber-500 bg-amber-500/10" : "bg-card hover:border-amber-500/50"}`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">بانتظار الدفع</p>
          </button>
        )}
      </div>

      {/* Search & Filter & Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو رقم الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="فلتر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">بانتظار الدفع</SelectItem>
            <SelectItem value="paid">مدفوع</SelectItem>
            <SelectItem value="free">مجاني</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
            <SelectItem value="expired">منتهي الصلاحية</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={tickets.length === 0}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {tickets.length === 0 ? "لا يوجد ضيوف مسجلين بعد." : "لا توجد نتائج مطابقة."}
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرمز</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>المرجع</TableHead>
                <TableHead>التسجيل</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g, idx) => {
                const allCancelled = g.statuses.every(s => s === "cancelled");
                const statusText = g.checkedInCount > 0
                  ? `${g.checkedInCount}/${g.quantity} دخلوا`
                  : allCancelled ? "ملغي" : "صالح";
                const statusV = g.checkedInCount > 0 ? "default" as const
                  : allCancelled ? "destructive" as const : "secondary" as const;

                return (
                  <TableRow key={`${g.guest_phone}-${g.ticket_type_id}-${idx}`} className={g.payment_status === "pending" ? "bg-amber-500/5" : ""}>
                    <TableCell className="font-medium">{g.guest_name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.ticket_codes[0] || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{g.guest_phone}</span>
                        <button
                          onClick={() => openWhatsApp(g.guest_phone, g.guest_name)}
                          className="text-green-600 hover:text-green-700 p-0.5"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{g.tierName}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{tickets.find(t => g.ticketIds.includes(t.id))?.sub_organizer_allocations?.seating_area || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{g.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusV}>{statusText}</Badge>
                    </TableCell>
                    <TableCell>{paymentBadge(g.payment_status)}</TableCell>
                    <TableCell>{g.totalAmount ? `${g.totalAmount.toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{g.payment_reference || "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(g.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell>
                      {g.payment_status === "pending" && !allCancelled && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" disabled={actionLoading === g.guest_phone}
                            onClick={() => handleVerify(g)}
                            className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" /> تأكيد
                          </Button>
                          <Button size="sm" variant="destructive" disabled={actionLoading === g.guest_phone}
                            onClick={() => handleReject(g)}
                            className="h-7 px-2 text-xs">
                            <XCircle className="h-3 w-3 mr-1" /> رفض
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
