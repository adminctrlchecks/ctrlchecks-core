import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { WorkflowAuthProvider } from "@/contexts/WorkflowAuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AdminRoute } from "./components/admin/AdminRoute";
import SchedulerInitializer from "./components/workflow/SchedulerInitializer";
import { ConnectionStatus } from "./components/ConnectionStatus";

const Chatbot = lazy(() => import("@/components/ui/Chatbot"));
const Index = lazy(() => import("./pages/Index"));
const SignUp = lazy(() => import("./pages/SignUp"));
const SignIn = lazy(() => import("./pages/SignIn"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workflows = lazy(() => import("./pages/Workflows"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const WorkflowCreationChoice = lazy(() => import("./pages/WorkflowCreationChoice"));
const AIWorkflowBuilder = lazy(() => import("./pages/AIWorkflowBuilder"));
const Executions = lazy(() => import("./pages/Executions"));
const ExecutionDetail = lazy(() => import("./pages/ExecutionDetail"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Templates = lazy(() => import("./pages/Templates"));
const TemplatesManager = lazy(() => import("./pages/admin/TemplatesManager"));
const TemplateEditor = lazy(() => import("./pages/admin/TemplateEditor"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersManager = lazy(() => import("./pages/admin/UsersManager"));
const UserDetails = lazy(() => import("./pages/admin/UserDetails"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const SettingsApiKeys = lazy(() => import("./pages/settings/ApiKeys"));
const SettingsTeams = lazy(() => import("./pages/settings/Teams"));
const SettingsNotifications = lazy(() => import("./pages/settings/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GoogleAuthCallback = lazy(() => import("./pages/auth/google/Callback"));
const LinkedInAuthCallback = lazy(() => import("./pages/auth/linkedin/Callback"));
const FacebookAuthCallback = lazy(() => import("./pages/auth/facebook/Callback"));
const GitHubAuthCallback = lazy(() => import("./pages/auth/github/Callback"));
const NotionAuthCallback = lazy(() => import("./pages/auth/notion/Callback"));
const TwitterAuthCallback = lazy(() => import("./pages/auth/twitter/Callback"));
const SalesforceAuthCallback = lazy(() => import("./pages/auth/salesforce/Callback"));
const InstagramAuthCallback = lazy(() => import("./pages/auth/instagram/Callback"));
const WhatsAppAuthCallback = lazy(() => import("./pages/auth/whatsapp/Callback"));
const OAuthRelayPage = lazy(() => import("./pages/auth/OAuthRelayPage"));
const FormTrigger = lazy(() => import("./pages/FormTrigger"));
const ChatTrigger = lazy(() => import("./pages/ChatTrigger"));
const ModelTestingDashboard = lazy(() => import("./pages/ModelTestingDashboard"));
const ModelTestPage = lazy(() => import("./pages/ModelTestPage"));
const NodeTestPage = lazy(() => import("./pages/NodeTestPage"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Profile = lazy(() => import("./pages/Profile"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Connections = lazy(() => import("./pages/Connections"));
const IntroductionPage = lazy(() => import("./pages/doc-pages/IntroductionPage"));
const GettingStartedPage = lazy(() => import("./pages/doc-pages/GettingStartedPage"));
const NodeDocPage = lazy(() => import("./pages/doc-pages/NodeDocPage"));

// Component to conditionally render Chatbot only on landing page
const ConditionalChatbot = () => {
  const location = useLocation();

  // Only show chatbot on the landing page (pre-login pages)
  const showChatbot = location.pathname === "/";

  if (!showChatbot) return null;

  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,     // don't refetch within 30 s of a successful fetch
      retry: 1,              // one retry instead of 3 on transient failures
      refetchOnWindowFocus: false, // avoid silent refetch every time user alt-tabs back
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkflowAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <SchedulerInitializer />
              <Suspense
                fallback={
                  <div className="flex h-screen w-full items-center justify-center text-sm text-muted-foreground">
                    Loading page...
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/workflows" element={<Workflows />} />
                  <Route path="/workflow/create" element={<WorkflowCreationChoice />} />
                  <Route path="/workflow/ai" element={<AIWorkflowBuilder />} />
                  <Route path="/workflow/:id" element={<WorkflowBuilder />} />
                  <Route path="/executions" element={<Executions />} />
                  <Route path="/execution/:id" element={<ExecutionDetail />} />
                  <Route path="/approvals" element={<Approvals />} />
                  <Route path="/approvals/:id" element={<Approvals />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings/profile" element={<Profile />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/connections" element={<Connections />} />
                  <Route path="/docs" element={<Navigate to="/docs/introduction" replace />} />
                  <Route path="/docs/introduction" element={<IntroductionPage />} />
                  <Route path="/docs/getting-started/:slug" element={<GettingStartedPage />} />
                  <Route path="/docs/nodes/:nodeSlug" element={<NodeDocPage />} />
                  <Route path="/settings/api-keys" element={<SettingsApiKeys />} />
                  <Route path="/settings/teams" element={<SettingsTeams />} />
                  <Route path="/settings/notifications" element={<SettingsNotifications />} />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/templates"
                    element={
                      <AdminRoute>
                        <TemplatesManager />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <UsersManager />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users/:id"
                    element={
                      <AdminRoute>
                        <UserDetails />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/subscriptions"
                    element={
                      <AdminRoute>
                        <AdminSubscriptions />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/template/:id/edit"
                    element={
                      <AdminRoute>
                        <TemplateEditor />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminRoute>
                        <AdminPlaceholder />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <AdminRoute>
                        <AdminPlaceholder />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/node-tests"
                    element={
                      <AdminRoute>
                        <NodeTestPage />
                      </AdminRoute>
                    }
                  />
                  <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
                  <Route path="/auth/linkedin/callback" element={<LinkedInAuthCallback />} />
                  <Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
                  <Route path="/auth/github/callback" element={<GitHubAuthCallback />} />
                  <Route path="/auth/notion/callback" element={<NotionAuthCallback />} />
                  <Route path="/auth/twitter/callback" element={<TwitterAuthCallback />} />
                  <Route path="/auth/salesforce/callback" element={<SalesforceAuthCallback />} />
                  <Route path="/auth/instagram/callback" element={<InstagramAuthCallback />} />
                  <Route path="/auth/whatsapp/callback" element={<WhatsAppAuthCallback />} />
                  <Route path="/auth/oauth-relay" element={<OAuthRelayPage />} />
                  <Route path="/form/:workflowId/:nodeId" element={<FormTrigger />} />
                  <Route path="/chat/:workflowId/:nodeId" element={<ChatTrigger />} />
                  <Route path="/model-testing" element={<ModelTestingDashboard />} />
                  <Route path="/model-testing/:category/:model" element={<ModelTestPage />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <ConditionalChatbot />
              <ConnectionStatus />
            </BrowserRouter>
          </TooltipProvider>
          </WorkflowAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
