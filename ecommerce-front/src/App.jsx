/*
========================================
APP.JSX - POINT D'ENTRÉE DE L'APPLICATION REACT
========================================

Ce fichier est le CŒUR de votre application frontend React.
Il définit :
- La NAVIGATION (menu avec liens)
- Les ROUTES (URL → Page)
- L'AUTHENTIFICATION (gestion du contexte utilisateur)
- La STRUCTURE générale de l'interface

CONCEPTS CLÉS :
- React Router : gère la navigation (changement de page sans rechargement)
- AuthProvider : fournit les infos utilisateur à toute l'application
- ProtectedRoute : empêche l'accès aux pages si pas connecté
*/

// ========== IMPORTS ==========
import React, { useState } from "react";  // React = bibliothèque pour créer des interfaces
import { Routes, Route, Link } from "react-router-dom";  // React Router = gestion de la navigation
import { AuthProvider } from "./contexts/AuthProvider";  // Context d'authentification
import { useAuth } from "./hooks/useAuth";  // Hook pour accéder aux infos utilisateur
import ProtectedRoute from "./components/ProtectedRoute";  // Composant pour protéger les routes
import BurgerMenu from "./components/BurgerMenu";  // Menu burger
import CartIcon from "./components/CartIcon";  // Icône de panier
import CartMenu from "./components/CartMenu";  // Menu panier latéral
import UserMenu from "./components/UserMenu";  // Menu utilisateur
import CookieConsent from "./components/CookieConsent";  // Bandeau de consentement aux cookies
import Home from "./pages/Home";  // Page d'accueil
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import Support from "./pages/Support";
import AdminSupport from "./pages/AdminSupport";
import SupportTest from "./pages/SupportTest";
import FAQ from "./pages/FAQ";
import CGV from "./pages/legal/CGV";
import MentionsLegales from "./pages/legal/MentionsLegales";
import Confidentialite from "./pages/legal/Confidentialite";
import Cookies from "./pages/legal/Cookies";
import Retractation from "./pages/legal/Retractation";
import Mediation from "./pages/legal/Mediation";
import Livraison from "./pages/Livraison";
import PaiementSecurise from "./pages/PaiementSecurise";
import Garanties from "./pages/Garanties";
import "./styles/global.css";

/**
 * Contenu principal de l'application avec navigation et routes protégées.
 * @returns {JSX.Element}
 */
function AppContent() {
  const { loading } = useAuth();
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);

  // Afficher un indicateur de chargement pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* ===== HEADER AVEC MENU BURGER ===== */}
      <header className="app-header-main">
        <div className="app-header-main__container">
          <BurgerMenu />
          <Link to="/" className="app-header-main__logo">
            <span className="app-header-main__logo-text">YOUR SHAPE</span>
          </Link>
          <div className="app-header-main__actions">
            <CartIcon onOpen={() => setIsCartMenuOpen(true)} />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* ===== MENU PANIER LATÉRAL ===== */}
      <CartMenu isOpen={isCartMenuOpen} onClose={() => setIsCartMenuOpen(false)} />

      {/* ===== BANDEAU DE CONSENTEMENT AUX COOKIES ===== */}
      <CookieConsent />

      {/* ===== CONTENU PRINCIPAL ===== */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ✅ Routes utilisateur connecté */}
        <Route path="/profile" element={
          <ProtectedRoute requireAuth={true}>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/payment/:orderId" element={
          <ProtectedRoute requireAuth={true}>
            <Payment />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute requireAuth={true}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId" element={
          <ProtectedRoute requireAuth={true}>
            <OrderDetail />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/invoice" element={
          <ProtectedRoute requireAuth={true}>
            <OrderDetail />
          </ProtectedRoute>
        } />
        <Route path="/support" element={
          <ProtectedRoute requireAuth={true}>
            <Support />
          </ProtectedRoute>
        } />
        <Route path="/support-test" element={
          <ProtectedRoute requireAuth={true} requireAdmin={true}>
            <SupportTest />
          </ProtectedRoute>
        } />

        {/* ✅ Route Admin (protégée visuellement par le menu) */}
        <Route path="/admin" element={
          <ProtectedRoute requireAuth={true} requireAdmin={true}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/admin/orders/:orderId" element={
          <ProtectedRoute requireAuth={true} requireAdmin={true}>
            <AdminOrderDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute requireAuth={true} requireAdmin={true}>
            <AdminSupport />
          </ProtectedRoute>
        } />

        {/* ✅ Pages légales et informations */}
        <Route path="/faq" element={<FAQ />} />
        <Route path="/legal/cgv" element={<CGV />} />
        <Route path="/legal/mentions-legales" element={<MentionsLegales />} />
        <Route path="/legal/confidentialite" element={<Confidentialite />} />
        <Route path="/legal/cookies" element={<Cookies />} />
        <Route path="/legal/retractation" element={<Retractation />} />
        <Route path="/legal/mediation" element={<Mediation />} />
        <Route path="/livraison" element={<Livraison />} />
        <Route path="/paiement-securise" element={<PaiementSecurise />} />
        <Route path="/garanties" element={<Garanties />} />
        </Routes>
      </main>
    </div>
  );
}

/**
 * Racine de l'application: encapsule AppContent dans AuthProvider.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}