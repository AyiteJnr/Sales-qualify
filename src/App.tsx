import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SalesDashboard from "./pages/SalesDashboard";
import LeadsManagement from "./pages/LeadsManagement";
import AddClient from "./pages/AddClient";
import GoogleSheetsImport from "./pages/GoogleSheetsImport";
import EnhancedQualificationForm from "./pages/EnhancedQualificationForm";
import StartQualification from "./pages/StartQualification";
import CallHistory from "./pages/CallHistory";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Role-based route component
const RoleBasedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    // Redirect to auth page instead of Index
    window.location.href = '/auth';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-gray-600">Redirecting to login...</p>
      </div>
    );
  }
  
  // If user exists but profile is still loading, show loading state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Role-based dashboard routing */}
            <Route path="/dashboard" element={
              <RoleBasedRoute>
                <Dashboard />
              </RoleBasedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <RoleBasedRoute>
                <AdminDashboard />
              </RoleBasedRoute>
            } />
            <Route path="/sales-dashboard" element={
              <RoleBasedRoute>
                <SalesDashboard />
              </RoleBasedRoute>
            } />
            
            {/* Lead management */}
            <Route path="/leads-management" element={
              <RoleBasedRoute>
                <LeadsManagement />
              </RoleBasedRoute>
            } />
            
            {/* Other routes */}
            <Route path="/client/new" element={
              <RoleBasedRoute>
                <AddClient />
              </RoleBasedRoute>
            } />
            <Route path="/import/google-sheets" element={
              <RoleBasedRoute>
                <GoogleSheetsImport />
              </RoleBasedRoute>
            } />
            <Route path="/qualification/:clientId" element={
              <RoleBasedRoute>
                <EnhancedQualificationForm />
              </RoleBasedRoute>
            } />
            <Route path="/start-qualification" element={
              <RoleBasedRoute>
                <StartQualification />
              </RoleBasedRoute>
            } />
            <Route path="/call-history" element={
              <RoleBasedRoute>
                <CallHistory />
              </RoleBasedRoute>
            } />
            <Route path="/admin" element={
              <RoleBasedRoute>
                <AdminSettings />
              </RoleBasedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
