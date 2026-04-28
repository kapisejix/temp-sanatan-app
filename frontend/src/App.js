import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ContentManagerPage from "./pages/ContentManagerPage";
import ContentUploadPage from "./pages/ContentUploadPage";
import VerseManagerPage from "./pages/VerseManagerPage";
import ArtiManagerPage from "./pages/ArtiManagerPage";
import KathaManagerPage from "./pages/KathaManagerPage";
import GranthManagerPage from "./pages/GranthManagerPage";
import VedasManagerPage from "./pages/VedasManagerPage";
import AudioManagerPage from "./pages/AudioManagerPage";
import VedaChatPage from "./pages/VedaChatPage";
import PanchangPage from "./pages/PanchangPage";
import UsersPage from "./pages/UsersPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import SettingsPage from "./pages/SettingsPage";
import DailySchedulerPage from "./pages/DailySchedulerPage";
import MediaStudioPage from "./pages/MediaStudioPage";
import NakshatraUpayaPage from "./pages/NakshatraUpayaPage";
import IntegrationSettingsPage from "./pages/IntegrationSettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SecurityDashboardPage from "./pages/SecurityDashboardPage";
import BlogManagerPage from "./pages/BlogManagerPage";
import PublicHomePage from "./pages/PublicHomePage";
import { BlogListPage, BlogDetailPage, CmsPage } from "./pages/PublicPages";
import BirthChartPage from "./pages/BirthChartPage";
import ImportWizardPage from "./pages/ImportWizardPage";
import SmartSearchPage from "./pages/SmartSearchPage";
import { Loader2 } from "lucide-react";
// Bhakti Category Managers
import AartiManagerPageNew from "./pages/bhakti/AartiManagerPage";
import ChalisaManagerPage from "./pages/bhakti/ChalisaManagerPage";
import {
  NamavaliManagerPage,
  SahasranamaManagerPage,
  VedicMantraManagerPage,
  StotramManagerPage,
  SuktamManagerPage,
  AshtakamManagerPage,
  ShatkamManagerPage,
  KavachamManagerPage,
  NamRamayanamManagerPage
} from "./pages/bhakti/BhaktiCategoryManager";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F3F1]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#E95A34] mx-auto mb-3" />
          <p className="text-sm text-[#7A8690]">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogDetailPage />} />
      <Route path="/birth-chart" element={<BirthChartPage />} />
      <Route path="/page/:slug" element={<CmsPage />} />
      {/* Auth */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="content-upload" element={<ContentUploadPage />} />
        <Route path="import-wizard" element={<ImportWizardPage />} />
        <Route path="search" element={<SmartSearchPage />} />
        <Route path="content-manager" element={<ContentManagerPage />} />
        <Route path="verse-manager" element={<VerseManagerPage />} />
        <Route path="daily-scheduler" element={<DailySchedulerPage />} />
        <Route path="arti-manager" element={<AartiManagerPageNew />} />
        <Route path="chalisa-manager" element={<ChalisaManagerPage />} />
        <Route path="namavali-manager" element={<NamavaliManagerPage />} />
        <Route path="sahasranama-manager" element={<SahasranamaManagerPage />} />
        <Route path="vedic-mantra-manager" element={<VedicMantraManagerPage />} />
        <Route path="stotram-manager" element={<StotramManagerPage />} />
        <Route path="suktam-manager" element={<SuktamManagerPage />} />
        <Route path="ashtakam-manager" element={<AshtakamManagerPage />} />
        <Route path="shatkam-manager" element={<ShatkamManagerPage />} />
        <Route path="kavacham-manager" element={<KavachamManagerPage />} />
        <Route path="nam-ramayanam-manager" element={<NamRamayanamManagerPage />} />
        <Route path="katha-manager" element={<KathaManagerPage />} />
        <Route path="granth-manager" element={<GranthManagerPage />} />
        <Route path="vedas-manager" element={<VedasManagerPage />} />
        <Route path="audio-manager" element={<AudioManagerPage />} />
        <Route path="media-studio" element={<MediaStudioPage />} />
        <Route path="vedachat" element={<VedaChatPage />} />
        <Route path="nakshatra-upaya" element={<NakshatraUpayaPage />} />
        <Route path="panchang" element={<PanchangPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="admin-users" element={<AdminUsersPage />} />
        <Route path="blog-manager" element={<BlogManagerPage />} />
        <Route path="integrations" element={<IntegrationSettingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="security" element={<SecurityDashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Legacy admin routes redirect */}
      <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
