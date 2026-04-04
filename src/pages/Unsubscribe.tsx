import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        setStatus(data.valid === false && data.reason === "already_unsubscribed" ? "already" : "valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(error ? "error" : "success");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white px-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        <span className="text-2xl font-bold tracking-wider bg-gradient-to-l from-amber-300 to-amber-500 bg-clip-text text-transparent">
          WUJHA
        </span>

        {status === "loading" && <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />}

        {status === "valid" && (
          <>
            <h1 className="text-xl font-bold">إلغاء الاشتراك</h1>
            <p className="text-gray-400">هل تريد التوقف عن تلقي رسائل البريد الإلكتروني منا؟</p>
            <button onClick={handleUnsubscribe}
              className="px-8 py-3 rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 text-black font-bold hover:opacity-90 transition">
              تأكيد إلغاء الاشتراك
            </button>
          </>
        )}

        {status === "already" && (
          <>
            <h1 className="text-xl font-bold">تم الإلغاء مسبقاً</h1>
            <p className="text-gray-400">تم إلغاء اشتراكك بالفعل من قبل.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-green-400">تم الإلغاء بنجاح</h1>
            <p className="text-gray-400">لن تتلقى رسائل بريد إلكتروني منا بعد الآن.</p>
          </>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-xl font-bold text-red-400">رابط غير صالح</h1>
            <p className="text-gray-400">هذا الرابط غير صالح أو منتهي الصلاحية.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-red-400">حدث خطأ</h1>
            <p className="text-gray-400">يرجى المحاولة مرة أخرى لاحقاً.</p>
          </>
        )}
      </div>
    </div>
  );
}
