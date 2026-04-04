import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function PublicLayout() {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-wujha-text font-sans overflow-x-hidden">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
