import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BecomeSellerPage from "./pages/BecomeSellerPage";
import NotificationsPage from "./pages/NotificationsPage";
import AboutPage from "./pages/AboutPage";
import SuccessStoriesPage from "./pages/SuccessStoriesPage";
import SellerGuidePage from "./pages/SellerGuidePage";
import FssaiInfoPage from "./pages/FssaiInfoPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import ContactUsPage from "./pages/ContactUsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SellerStorePage from "./pages/SellerStorePage";
import CartPage from "./pages/CartPage";
import AddressesPage from "./pages/AddressesPage";
import CheckoutPage from "./pages/CheckoutPage";
import LocationPrompt from "./components/LocationPrompt";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/store/:sellerId" element={<SellerStorePage />} />
              <Route path="/cart" element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              } />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } />
              <Route path="/addresses" element={
                <ProtectedRoute>
                  <AddressesPage />
                </ProtectedRoute>
              } />
              <Route path="/seller" element={
                <ProtectedRoute requiredRole="seller">
                  <SellerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/buyer" element={
                <ProtectedRoute>
                  <BuyerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/become-seller" element={
                <ProtectedRoute>
                  <BecomeSellerPage />
                </ProtectedRoute>
              } />
              <Route path="/delivery/dashboard" element={
                <ProtectedRoute requiredRole="delivery_partner">
                  <DeliveryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/success-stories" element={<SuccessStoriesPage />} />
              <Route path="/seller-guide" element={<SellerGuidePage />} />
              <Route path="/fssai-info" element={<FssaiInfoPage />} />
              <Route path="/help-center" element={<HelpCenterPage />} />
              <Route path="/contact-us" element={<ContactUsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <LocationPrompt />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
