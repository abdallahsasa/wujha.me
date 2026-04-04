import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Badge } from "@/components/ui/badge";

const AdminLayout = () => {
  const { adminUser } = useAdminAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" dir="ltr">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">Admin Panel</span>
            </div>
            {adminUser && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{adminUser.name}</span>
                <Badge variant="secondary" className="capitalize text-xs">
                  {adminUser.role.replace("_", " ")}
                </Badge>
              </div>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
