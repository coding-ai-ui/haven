import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Provider, useAuth } from "./context";
import { Navbar, Footer, ScrollManager } from "./components/Layout";
import { Loading } from "./components/ui";
import AgentTools from "./components/AgentTools";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Details from "./pages/Details";
import {
  AuthPage,
  Verification,
  ProfilePage,
  ListProperty,
} from "./pages/Account";
import Dashboard, { AdminDashboard } from "./pages/Dashboard";
import Messages from "./pages/Messages";
import {
  About,
  Contact,
  Information,
  Careers,
  ReportPage,
  NotFound,
} from "./pages/Information";
function Protected({ children, admin = false }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && !user.is_staff) return <Navigate to="/dashboard" replace />;
  return children;
}
function Shell() {
  const location = useLocation();
  const workspace =
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/dashboard");
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <ScrollManager />
      <AgentTools />
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          {[
            "buy",
            "rent",
            "rooms",
            "hotels",
            "search",
            "emergency-housing",
          ].map((path) => (
            <Route key={path} path={`/${path}`} element={<Browse />} />
          ))}
          <Route
            path="/saved"
            element={
              <Protected>
                <Browse />
              </Protected>
            }
          />
          <Route path="/properties/:id" element={<Details />} />
          {["login", "register", "forgot-password"].map((path) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<AuthPage key={path} />}
            />
          ))}
          <Route path="/reset-password/:uid/:token" element={<AuthPage />} />
          <Route
            path="/verification"
            element={
              <Protected>
                <Verification />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="/list-property"
            element={
              <Protected>
                <ListProperty />
              </Protected>
            }
          />
          <Route
            path="/list-property/:id"
            element={
              <Protected>
                <ListProperty />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/dashboard/:tab"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/messages"
            element={
              <Protected>
                <Messages />
              </Protected>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <Protected admin>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/report" element={<ReportPage />} />
          {["terms", "privacy", "safety"].map((path) => (
            <Route key={path} path={`/${path}`} element={<Information />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!workspace && <Footer />}
    </>
  );
}
export default function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
