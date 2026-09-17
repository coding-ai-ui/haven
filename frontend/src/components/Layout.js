import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  House,
  Heart,
  MessageCircle,
  Plus,
  Bell,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  Instagram,
  Facebook,
  ArrowRight,
} from "lucide-react";
import { useAuth, useData } from "../context";
import { api, list } from "../services/api";
export function Navbar() {
  const { user, notify } = useAuth();
  const [menu, setMenu] = useState(false),
    [bell, setBell] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const notices = useData(user ? "notifications/" : null, [user?.id, bell]);
  useEffect(() => {
    setMenu(false);
    setBell(false);
  }, [location.pathname]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link className="logo" to="/">
        <span>
          <House size={23} />
        </span>
        haven<span className="logo-dot">.</span>
      </Link>
      <nav className={menu ? "open" : ""} aria-label="Main navigation">
        {[
          ["Home", "/"],
          ["Buy", "/buy"],
          ["Rent", "/rent"],
          ["Rooms", "/rooms"],
          ["Hotels", "/hotels"],
          ["Emergency Housing", "/emergency-housing"],
          ["About", "/about"],
          ["Contact", "/contact"],
        ].map(([label, url]) => (
          <NavLink key={url} to={url}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-actions">
        <Link to="/saved" title="Saved places" aria-label="Saved places">
          <Heart size={19} />
        </Link>
        <Link to="/messages" title="Messages" aria-label="Messages">
          <MessageCircle size={19} />
        </Link>
        {user && (
          <div className="notification-wrap">
            <button
              className="icon-button"
              aria-label="Notifications"
              aria-expanded={bell}
              onClick={() => setBell(!bell)}
            >
              <Bell size={19} />
              {list(notices.data).some((n) => !n.is_read) && (
                <span className="notification-dot" />
              )}
            </button>
            {bell && (
              <div className="notification-menu">
                <h3>Notifications</h3>
                {list(notices.data).length ? (
                  list(notices.data).map((n) => (
                    <Link
                      className={n.is_read ? "" : "unread"}
                      to={n.link}
                      key={n.id}
                      onClick={() =>
                        api(`notifications/${n.id}/`, {
                          method: "PATCH",
                          body: { is_read: true },
                        }).catch((e) => notify(e.message, true))
                      }
                    >
                      {n.text}
                      <small>
                        {new Date(n.created_at).toLocaleDateString()}
                      </small>
                    </Link>
                  ))
                ) : (
                  <p>You’re all caught up.</p>
                )}
              </div>
            )}
          </div>
        )}
        <Link to={user ? "/dashboard" : "/login"}>
          {user ? (
            <span className="avatar tiny">{user.first_name?.[0] || "H"}</span>
          ) : (
            "Sign in"
          )}
        </Link>
        <Link className="button dark small" to="/list-property">
          <Plus size={16} /> List property
        </Link>
        <button
          className="icon-button mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label="Toggle navigation"
          aria-expanded={menu}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="logo" to="/">
            <span>
              <House size={23} />
            </span>
            haven<span className="logo-dot">.</span>
          </Link>
          <p>
            A place for every chapter.
            <br />
            Find yours with a little more confidence.
          </p>
          <div className="footer-trust">
            <ShieldCheck size={17} /> Built around people. Grounded in trust.
          </div>
        </div>
        {[
          [
            "Company",
            ["About us", "/about"],
            ["Careers", "/careers"],
            ["Contact", "/contact"],
          ],
          [
            "Find your place",
            ["Buy a home", "/buy"],
            ["Rent a home", "/rent"],
            ["Find a room", "/rooms"],
            ["Book a hotel", "/hotels"],
          ],
          [
            "Here to help",
            ["Temporary housing", "/emergency-housing"],
            ["Get verified", "/verification"],
            ["Safety tips", "/safety"],
            ["Report a concern", "/report"],
          ],
          [
            "The details",
            ["Terms & conditions", "/terms"],
            ["Privacy policy", "/privacy"],
            ["Your account", "/profile"],
          ],
        ].map(([title, ...links]) => (
          <div className="footer-column" key={title}>
            <h4>{title}</h4>
            {links.map(([t, u]) => (
              <Link key={u} to={u}>
                {t}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Haven. A place to begin.</span>
        <span>
          English <span className="footer-divider">/</span> USD · $
        </span>
        <span>Social channels coming soon</span>
      </div>
    </footer>
  );
}
export function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      "Haven — " +
      (location.pathname === "/"
        ? "Find a place to call home"
        : location.pathname
            .split("/")[1]
            .replaceAll("-", " ")
            .replace(/^./, (s) => s.toUpperCase()));
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [location.pathname]);
  return null;
}
