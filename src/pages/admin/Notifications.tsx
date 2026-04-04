import { useEffect, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { adminUser } = useAdminAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!adminUser) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_admin_id", adminUser.id)
      .order("created_at", { ascending: false });
    setNotifications((data as unknown as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [adminUser]);

  const markAllRead = async () => {
    if (!adminUser) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_admin_id", adminUser.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const getLinkForNotification = (n: Notification) => {
    if (n.type.startsWith("event_") && n.reference_id) {
      return `/admin/events/${n.reference_id}/edit`;
    }
    return null;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="mx-auto h-10 w-10 mb-3 opacity-40" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const link = getLinkForNotification(n);
                return (
                  <div
                    key={n.id}
                    className={`py-4 px-2 flex items-start gap-3 rounded-lg transition-colors ${
                      !n.is_read ? "bg-accent/50" : ""
                    }`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(n.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                        {link && (
                          <Link
                            to={link}
                            className="text-xs text-primary hover:underline"
                          >
                            View Event →
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
