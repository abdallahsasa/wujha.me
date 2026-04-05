import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { PublicAuthProvider } from "@/contexts/PublicAuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import PublicLayout from "@/components/layout/PublicLayout";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/admin/Login.tsx";
import ResetPassword from "./pages/admin/ResetPassword.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import PlacesList from "./pages/admin/PlacesList.tsx";
import PlaceForm from "./pages/admin/PlaceForm.tsx";
import VenuesList from "./pages/admin/VenuesList.tsx";
import VenueForm from "./pages/admin/VenueForm.tsx";
import GuestsList from "./pages/admin/GuestsList.tsx";
import OrganizersList from "./pages/admin/OrganizersList.tsx";
import OrganizerForm from "./pages/admin/OrganizerForm.tsx";
import CategoriesList from "./pages/admin/CategoriesList.tsx";
import CategoryForm from "./pages/admin/CategoryForm.tsx";
import CitiesList from "./pages/admin/CitiesList.tsx";
import ScannersList from "./pages/admin/ScannersList.tsx";
import SubOrganizersList from "./pages/admin/SubOrganizersList.tsx";
import PageContentEditor from "./pages/admin/PageContentEditor.tsx";
import AdminSettings from "./pages/admin/Settings.tsx";
import Notifications from "./pages/admin/Notifications.tsx";
import EventsList from "./pages/admin/EventsList.tsx";
import EventForm from "./pages/admin/EventForm.tsx";
import EventTickets from "./pages/admin/EventTickets.tsx";
import EventInvitation from "./pages/EventInvitation.tsx";
import EventConfirmation from "./pages/EventConfirmation.tsx";
import ScannerPage from "./pages/ScannerPage.tsx";
import MyTickets from "./pages/MyTickets.tsx";
import Profile from "./pages/Profile.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import PlacesListing from "./pages/PlacesListing.tsx";
import PlaceDetail from "./pages/PlaceDetail.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import BecomeOrganizer from "./pages/BecomeOrganizer.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import Favorites from "./pages/Favorites.tsx";
import OrganizerApplications from "./pages/admin/OrganizerApplications.tsx";
import PaymentInstructions from "./pages/PaymentInstructions.tsx";
import AdminReviews from "./pages/admin/Reviews.tsx";
import EmailTemplatesList from "./pages/admin/EmailTemplatesList.tsx";
import EmailTemplateEditor from "./pages/admin/EmailTemplateEditor.tsx";
import ContactMessages from "./pages/admin/ContactMessages.tsx";
import Contact from "./pages/Contact.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import SubOrganizerRegister from "./pages/SubOrganizerRegister.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
    },
  },
});

const AdminRoutes = () => (
  <Routes>
    <Route path="login" element={<Login />} />
    <Route path="reset-password" element={<ResetPassword />} />
    <Route
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<EventsList />} />
        <Route path="events/new" element={<EventForm />} />
        <Route path="events/:id/edit" element={<EventForm />} />
        <Route path="events/:eventId/tickets" element={<EventTickets />} />
        <Route path="places" element={<PlacesList />} />
        <Route path="places/new" element={<PlaceForm />} />
        <Route path="places/:id/edit" element={<PlaceForm />} />
        <Route path="venues" element={<VenuesList />} />
        <Route path="venues/new" element={<VenueForm />} />
        <Route path="venues/:id/edit" element={<VenueForm />} />
        <Route path="guests" element={<GuestsList />} />
        <Route path="organizers" element={<OrganizersList />} />
        <Route path="organizers/new" element={<OrganizerForm />} />
        <Route path="organizers/:id/edit" element={<OrganizerForm />} />
        <Route path="categories" element={<CategoriesList />} />
        <Route path="categories/new" element={<CategoryForm />} />
        <Route path="categories/:id/edit" element={<CategoryForm />} />
        <Route path="cities" element={<CitiesList />} />
        <Route path="sub-organizers" element={<SubOrganizersList />} />
        <Route path="scanners" element={<ScannersList />} />
        <Route path="content" element={<PageContentEditor />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="applications" element={<OrganizerApplications />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="contact-messages" element={<ContactMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="email-templates" element={<EmailTemplatesList />} />
        <Route path="email-templates/:templateKey" element={<EmailTemplateEditor />} />
    </Route>
  </Routes>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <PublicAuthProvider>
            <CurrencyProvider>
            <AdminAuthProvider>
            <Routes>
              {/* Public pages with shared header/footer layout */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/places" element={<PlacesListing />} />
                <Route path="/places/:placeId" element={<PlaceDetail />} />
                <Route path="/become-organizer" element={<BecomeOrganizer />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
              </Route>

              {/* Pages without the standard layout */}
              <Route path="/invite/:eventId" element={<EventInvitation />} />
              <Route path="/invite/:eventId/confirmation/:ticketId" element={<EventConfirmation />} />
              <Route path="/scan/:eventId" element={<ScannerPage />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/payment/:ticketId" element={<PaymentInstructions />} />
              <Route path="/event/register/:subSlug" element={<SubOrganizerRegister />} />

              {/* Admin routes */}
              <Route path="/admin/*" element={<AdminRoutes />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AdminAuthProvider>
            </CurrencyProvider>
          </PublicAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
