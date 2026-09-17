import React, { useEffect, useRef, useState, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShieldCheck,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Star,
  X,
  House,
  ArrowRight,
} from "lucide-react";
import { api, money } from "../services/api";
import { useAuth } from "../context";
export const VerifiedBadge = () => (
  <span className="verified">
    <ShieldCheck size={13} /> Verified owner
  </span>
);
export function Rating({ rating, count }) {
  return (
    <span className="rating">
      <Star size={13} fill="currentColor" />{" "}
      {rating ? Number(rating).toFixed(1) : "New"}
      {count > 0 && <small> ({count})</small>}
    </span>
  );
}
export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span /> Finding your next chapter…
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text,
  link = "/search",
  label = "Explore properties",
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <House size={30} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <Link className="button blue" to={link}>
        {label}
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-box" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button outline small" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function PropertyCard({ property: p, onChange }) {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(p.is_saved),
    [busy, setBusy] = useState(false);
  useEffect(() => setSaved(p.is_saved), [p.is_saved]);
  const save = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login?next=/saved");
    setBusy(true);
    try {
      const d = await api("favorites/toggle/", {
        method: "POST",
        body: { property: p.id },
      });
      setSaved(d.saved);
      notify(d.saved ? "Saved to your places." : "Removed from saved places.");
      onChange?.();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="property-card">
      <Link to={`/properties/${p.id}`} className="card-photo">
        <img src={p.images[0]?.url} alt={p.title} loading="lazy" />
        <div className="card-badges">
          <Badge>
            {p.transaction_type === "sale"
              ? "For sale"
              : p.transaction_type === "hotel"
                ? "Hotel stay"
                : p.transaction_type === "short_term"
                  ? "Short stay"
                  : "For rent"}
          </Badge>
          {p.featured && <span className="featured">Featured</span>}
        </div>
        <button
          className={`heart ${saved ? "saved" : ""}`}
          disabled={busy}
          onClick={save}
          aria-label={saved ? "Remove from saved" : "Save property"}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        {p.owner.verified && (
          <div className="card-verified">
            <VerifiedBadge />
          </div>
        )}
      </Link>
      <div className="card-body">
        <div className="card-price">
          {money(p.price)}
          <small>
            {p.transaction_type === "sale"
              ? ""
              : p.transaction_type === "rent"
                ? " / month"
                : " / night"}
          </small>
          <Rating rating={p.rating} />
        </div>
        <Link to={`/properties/${p.id}`}>
          <h3>{p.title}</h3>
        </Link>
        <p className="location">
          <MapPin size={13} />
          {p.location}
        </p>
        <div className="property-specs">
          <span>
            <BedDouble size={15} />
            {p.bedrooms} {p.category === "Room" ? "room" : "beds"}
          </span>
          <span>
            <Bath size={15} />
            {p.bathrooms} baths
          </span>
          <span>
            <Maximize size={14} />
            {p.area} m²
          </span>
        </div>
        <div className="card-bottom">
          <span className="owner-mini">
            <span className="avatar tiny">{p.owner.name[0]}</span>
            {p.owner.name}
          </span>
          <span className={p.availability === "available" ? "available" : ""}>
            {p.availability === "available" ? "Available" : p.availability}
          </span>
        </div>
      </div>
    </article>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = ref.current.querySelectorAll(
          'button,a[href],input,select,textarea,[tabindex="0"]',
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  options,
  children,
  ...props
}) {
  const id = useId();
  return (
    <div className={`field ${type === "checkbox" ? "check-field" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select id={id} name={name} {...props}>
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.value}
              value={typeof o === "string" ? o : o.value}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} name={name} rows={4} {...props} />
      ) : (
        <input id={id} name={name} type={type} {...props} />
      )}{" "}
      {children}
    </div>
  );
}
export function ActionForm({
  onSubmit,
  children,
  submit = "Save changes",
  className = "",
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = e.currentTarget;
    try {
      await onSubmit(new FormData(form), form);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={`action-form ${className}`} onSubmit={send}>
      {children}
      {error && <ErrorState message={error} />}
      <button className="button blue" disabled={busy}>
        {busy ? "Please wait…" : submit}
      </button>
    </form>
  );
}
export function Pagination({ data, page, setPage }) {
  return (
    data?.count > 12 && (
      <div className="pagination">
        <button
          className="button outline"
          disabled={!data.previous}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(data.count / 12)}
        </span>
        <button
          className="button outline"
          disabled={!data.next}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    )
  );
}
export const formObject = (fd) => Object.fromEntries(fd.entries());
