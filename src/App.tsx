import { lazy, Suspense, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProducerLayout from "@/components/ProducerLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";

function lazyRetry(fn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() => fn().catch(() => {
    window.location.reload();
    return new Promise(() => {}); // never resolves, page will reload
  }));
}

const HomePage = lazyRetry(() => import("./pages/HomePage"));
const EventDetailPage = lazyRetry(() => import("./pages/EventDetailPage"));
const CreateEventPage = lazyRetry(() => import("./pages/CreateEventPage"));
const EditEventPage = lazyRetry(() => import("./pages/EditEventPage"));
const ProducerDashboardPage = lazyRetry(() => import("./pages/ProducerDashboardPage"));
const DashboardOverviewPage = lazyRetry(() => import("./pages/DashboardOverviewPage"));
const ManageLocationsPage = lazyRetry(() => import("./pages/ManageLocationsPage"));
const TicketSelectionPage = lazyRetry(() => import("./pages/TicketSelectionPage"));
const CheckoutPage = lazyRetry(() => import("./pages/CheckoutPage"));
const MyOrdersPage = lazyRetry(() => import("./pages/MyOrdersPage"));
const LoginPage = lazyRetry(() => import("./pages/LoginPage"));
const SignupPage = lazyRetry(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazyRetry(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyRetry(() => import("./pages/ResetPasswordPage"));
const ProfilePage = lazyRetry(() => import("./pages/ProfilePage"));
const SoldTicketsPage = lazyRetry(() => import("./pages/SoldTicketsPage"));
const ArchivedEventsPage = lazyRetry(() => import("./pages/ArchivedEventsPage"));
const TrashPage = lazyRetry(() => import("./pages/TrashPage"));
const RevenueDashboardPage = lazyRetry(() => import("./pages/RevenueDashboardPage"));
const ValidateTicketsPage = lazyRetry(() => import("./pages/ValidateTicketsPage"));
const MyPagePage = lazyRetry(() => import("./pages/MyPagePage"));
const PaymentSuccessPage = lazyRetry(() => import("./pages/PaymentSuccessPage"));
const AdminDashboardPage = lazyRetry(() => import("./pages/AdminDashboardPage"));
const AdminProducerDetailPage = lazyRetry(() => import("./pages/AdminProducerDetailPage"));
const AdminValidateTicketsPage = lazyRetry(() => import("./pages/AdminValidateTicketsPage"));
const AdminCredentialsPage = lazyRetry(() => import("./pages/AdminCredentialsPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProducerRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (profile && profile.user_type !== 'produtor') return <Navigate to="/" replace />;
  return <ProducerLayout>{children}</ProducerLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>
);

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/event/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/my-orders" element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
      <Route path="/create-event" element={<ProducerRoute><CreateEventPage /></ProducerRoute>} />
      <Route path="/edit-event/:id" element={<ProducerRoute><EditEventPage /></ProducerRoute>} />
      <Route path="/my-page" element={<ProducerRoute><MyPagePage /></ProducerRoute>} />
      <Route path="/dashboard" element={<ProducerRoute><DashboardOverviewPage /></ProducerRoute>} />
      <Route path="/dashboard/:eventId" element={<ProducerRoute><ProducerDashboardPage /></ProducerRoute>} />
      <Route path="/revenue" element={<ProducerRoute><RevenueDashboardPage /></ProducerRoute>} />
      <Route path="/manage-locations/:eventId" element={<ProducerRoute><ManageLocationsPage /></ProducerRoute>} />
      <Route path="/sold-tickets" element={<ProducerRoute><SoldTicketsPage /></ProducerRoute>} />
      <Route path="/archived" element={<ProducerRoute><ArchivedEventsPage /></ProducerRoute>} />
      <Route path="/trash" element={<ProducerRoute><TrashPage /></ProducerRoute>} />
      <Route path="/validate-tickets" element={<ProducerRoute><ValidateTicketsPage /></ProducerRoute>} />
      <Route path="/tickets/:eventId" element={<ProtectedRoute><TicketSelectionPage /></ProtectedRoute>} />
      <Route path="/checkout/:eventId" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/producer/:producerId" element={<AdminRoute><AdminProducerDetailPage /></AdminRoute>} />
      <Route path="/admin/validate" element={<AdminRoute><AdminValidateTicketsPage /></AdminRoute>} />
      <Route path="/admin-credentials" element={<ProtectedRoute><AdminCredentialsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
