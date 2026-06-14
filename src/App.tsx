import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import HomePage from "@/pages/home";
import HikesPage from "@/pages/hikes";
import HikeDetailPage from "@/pages/hike-detail";
import RentPage from "@/pages/rent";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import AccountPage from "@/pages/account";
import AdminPage from "@/pages/admin";
import BookingSuccessPage from "@/pages/booking-success";
import BookingsPage from "@/pages/bookings";
import NotFoundPage from "@/pages/not-found";
import PrivacyPage from "@/pages/privacy";
import CookiesPage from "@/pages/cookies";
import { SiteShell } from "@/components/site-shell";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        <SiteShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/hikes" element={<HikesPage />} />
            <Route path="/hikes/:id" element={<HikeDetailPage />} />
            <Route path="/rent" element={<RentPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/bookings/success" element={<BookingSuccessPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SiteShell>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </ThemeProvider>
  );
}
