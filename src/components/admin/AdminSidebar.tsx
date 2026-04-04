import wujhaLogo from "@/assets/wujha-logo.png";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Tag,
  Map,
  ScanLine,
  FileText,
  Settings,
  LogOut,
  X,
  Bell,
  Star,
  MessageSquare,
  Mail,
  Ticket,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const allNavItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Events", url: "/admin/events", icon: Calendar, adminOnly: false },
  { title: "Places", url: "/admin/places", icon: MapPin, adminOnly: true },
  { title: "Venues", url: "/admin/venues", icon: Building2, adminOnly: false },
  { title: "Guests", url: "/admin/guests", icon: Users, adminOnly: false },
  { title: "Organizers", url: "/admin/organizers", icon: Briefcase, adminOnly: true },
  { title: "Applications", url: "/admin/applications", icon: ClipboardList, adminOnly: true },
  { title: "Categories", url: "/admin/categories", icon: Tag, adminOnly: true },
  { title: "Cities", url: "/admin/cities", icon: Map, adminOnly: true },
  { title: "Sub-Organizers", url: "/admin/sub-organizers", icon: Ticket, adminOnly: true },
  { title: "Scanners", url: "/admin/scanners", icon: ScanLine, adminOnly: true },
  { title: "Content", url: "/admin/content", icon: FileText, adminOnly: true },
  { title: "Reviews", url: "/admin/reviews", icon: Star, adminOnly: true },
  { title: "Messages", url: "/admin/contact-messages", icon: MessageSquare, adminOnly: true },
  { title: "قوالب البريد", url: "/admin/email-templates", icon: Mail, adminOnly: true },
  { title: "Settings", url: "/admin/settings", icon: Settings, adminOnly: true },
];

export function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { adminUser, signOut } = useAdminAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);

  const isAdmin = adminUser?.role === "super_admin" || adminUser?.role === "admin";
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  // Fetch unread notification count + pending payments
  useEffect(() => {
    if (!adminUser) return;
    const fetchCounts = async () => {
      const [notifRes, pendingRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_admin_id", adminUser.id)
          .eq("is_read", false),
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("payment_status", "pending"),
      ]);
      setUnreadCount(notifRes.count ?? 0);
      setPendingPayments(pendingRes.count ?? 0);
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [adminUser]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-gray-950 text-white [&_[data-sidebar=sidebar]]:bg-gray-950"
    >
      <div className="px-4 py-6 border-b border-white/10 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src={wujhaLogo} alt="Wujha" className="h-8 w-8 invert" />
            <h1 className="text-xl font-bold tracking-tight">
              Wujha <span className="font-normal opacity-80">وجهة</span>
            </h1>
          </div>
        ) : (
          <img src={wujhaLogo} alt="Wujha" className="h-8 w-8 invert mx-auto" />
        )}
        {isMobile && (
          <button onClick={() => setOpenMobile(false)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      <SidebarContent className="bg-gray-950">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="text-gray-400 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/10 data-[active=true]:text-white"
                  >
                    <NavLink
                      to={item.url}
                      className="hover:bg-white/10"
                      activeClassName="bg-white/10 text-white"
                    >
                      <div className="relative">
                        <item.icon className="h-4 w-4" />
                        {item.title === "Events" && pendingPayments > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">
                            {pendingPayments > 9 ? "9+" : pendingPayments}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.title === "Events" && pendingPayments > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {pendingPayments}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Notifications link */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin/notifications")}
                  className="text-gray-400 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/10 data-[active=true]:text-white"
                >
                  <NavLink
                    to="/admin/notifications"
                    className="hover:bg-white/10"
                    activeClassName="bg-white/10 text-white"
                  >
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    {!collapsed && <span>Notifications</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-gray-950 border-t border-white/10 p-4">
        {!collapsed && adminUser && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white truncate">{adminUser.name}</p>
            <p className="text-xs text-gray-400 capitalize">{adminUser.role.replace("_", " ")}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className="w-full text-gray-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
