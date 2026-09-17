import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Heart,
  Share2,
  BedDouble,
  Bath,
  Maximize,
  ShieldCheck,
  MessageCircle,
  Phone,
  CalendarDays,
  Flag,
  Check,
  ArrowRight,
  ChevronRight,
  Wifi,
  House,
} from "lucide-react";
import { useAuth, useData } from "../context";
import { api, money, list } from "../services/api";
import {
  PropertyCard,
  VerifiedBadge,
  Rating,
  Loading,
  ErrorState,
  Empty,
  Modal,
  ActionForm,
  Field,
  formObject,
} from "../components/ui";
const reasons = [
  "Scam",
  "Fake listing",
  "Fake identity",
  "Harassment",
  "Suspicious payment request",
  "Incorrect information",
  "Duplicate listing",
  "Other",
];
export function ReportForm({ target, onDone }) {
  const { notify } = useAuth();
  return (
    <ActionForm
      submit="Submit report"
      onSubmit={async (fd) => {
        await api("reports/", {
          method: "POST",
          body: { ...formObject(fd), ...target },
        });
        notify("Your report has been sent to the review team.");
        onDone?.();
      }}
    >
      <p>Tell us what concerns you. Reports are reviewed by the Haven team.</p>
      <Field label="Reason" name="reason" options={reasons} />
      <Field
        label="What happened?"
        name="details"
        type="textarea"
        maxLength="5000"
        required
      />
    </ActionForm>
  );
}
function BookingForm({ property, hotel, onDone }) {
  const { notify } = useAuth();
  const [roomId, setRoomId] = useState(
    hotel.rooms.find((r) => r.available)?.id || "",
  );
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [guests, setGuests] = useState(1),
    [confirm, setConfirm] = useState(false);
  const room = hotel.rooms.find((r) => r.id === Number(roomId));
  const nights =
    start && end
      ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000)
      : 0;
  const total = room && nights > 0 ? nights * Number(room.price) : 0;
  return (
    <ActionForm
      submit={confirm ? "Confirm reservation" : "Review reservation"}
      onSubmit={async () => {
        if (!room || nights <= 0)
          throw new Error("Choose a room and valid stay dates.");
        if (Number(guests) > room.capacity)
          throw new Error(
            "Please choose a room with enough space for your guests.",
          );
        if (!confirm) {
          setConfirm(true);
          return;
        }
        await api("bookings/", {
          method: "POST",
          body: {
            room: room.id,
            check_in: start,
            check_out: end,
            guests: Number(guests),
          },
        });
        notify("Your reservation is confirmed. Find it in your bookings.");
        onDone();
      }}
    >
      {!hotel.rooms.length ? (
        <p>
          No rooms have been added yet. Contact the host to ask about
          availability.
        </p>
      ) : (
        <>
          <Field
            label="Choose your room"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setConfirm(false);
            }}
            options={hotel.rooms
              .filter((r) => r.available)
              .map((r) => ({
                value: r.id,
                label: `${r.name} · ${money(r.price)} / night · ${r.capacity} guests`,
              }))}
            required
          />
          {room && (
            <div className="room-preview">
              <img
                src={room.image_url || property.images[0]?.url}
                alt={room.name}
              />
              <div>
                <strong>{room.name}</strong>
                <p>
                  {room.bed_type} · Up to {room.capacity} guests
                </p>
                <small>{room.amenities.join(" · ")}</small>
              </div>
            </div>
          )}
          <div className="two-fields">
            <Field
              label="Check-in"
              type="date"
              value={start}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setStart(e.target.value);
                setConfirm(false);
              }}
              required
            />
            <Field
              label="Check-out"
              type="date"
              value={end}
              min={start || new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setEnd(e.target.value);
                setConfirm(false);
              }}
              required
            />
          </div>
          <Field
            label="Guests"
            type="number"
            min="1"
            max={room?.capacity || 1}
            value={guests}
            onChange={(e) => {
              setGuests(e.target.value);
              setConfirm(false);
            }}
            required
          />
          <div className="booking-total">
            <span>
              {nights > 0
                ? `${nights} night${nights === 1 ? "" : "s"} × ${money(room?.price || 0)}`
                : "Choose dates to see your total"}
            </span>
            <strong>{money(total)}</strong>
          </div>
          <p className="small-text">
            No online payment is taken. Confirm payment and cancellation
            arrangements directly with the hotel.
          </p>
          {confirm && (
            <div className="success-box">
              <strong>Review your stay at {property.title}</strong>
              <p>
                {start} to {end} · {guests} guest(s) · {room?.name}
              </p>
              <p>
                Total: {money(total)}. Availability is checked again when you
                confirm.
              </p>
            </div>
          )}
        </>
      )}
    </ActionForm>
  );
}
export default function Details() {
  const { id } = useParams();
  const resource = useData(`properties/${id}/`);
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(0),
    [modal, setModal] = useState(""),
    [saved, setSaved] = useState(false);
  const [reviewType, setReviewType] = useState("property");
  const p = resource.data;
  const hotel = useData(p?.hotel_id ? `hotels/${p.hotel_id}/` : null);
  const reviews = useData(
    p
      ? `reviews/?${reviewType === "host" ? "host=" + p.owner.id : "property=" + id}`
      : null,
  );
  const similar = useData(
    p ? `properties/?category=${encodeURIComponent(p.category)}` : null,
  );
  useEffect(() => {
    setPhoto(0);
    setModal("");
  }, [id]);
  useEffect(() => {
    if (!p) return;
    setSaved(p.is_saved);
    try {
      const old = JSON.parse(localStorage.getItem("haven-recent") || "[]");
      localStorage.setItem(
        "haven-recent",
        JSON.stringify(
          [
            { id: p.id, title: p.title },
            ...old.filter((x) => x.id !== p.id),
          ].slice(0, 5),
        ),
      );
    } catch {}
  }, [p]);
  const requireLogin = () => {
    if (!user) {
      navigate(`/login?next=/properties/${id}`);
      return false;
    }
    return true;
  };
  async function save() {
    if (!requireLogin()) return;
    try {
      const d = await api("favorites/toggle/", {
        method: "POST",
        body: { property: p.id },
      });
      setSaved(d.saved);
      notify(d.saved ? "Saved to your places." : "Removed from saved places.");
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function chat() {
    if (!requireLogin()) return;
    try {
      const c = await api("conversations/", {
        method: "POST",
        body: { property: p.id },
      });
      navigate(`/messages?conversation=${c.id}`);
    } catch (e) {
      notify(e.message, true);
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: p.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        notify("Listing link copied.");
      }
    } catch (e) {
      if (e.name !== "AbortError")
        notify("Copy this page’s address from your browser to share.");
    }
  }
  if (resource.loading) return <Loading />;
  if (resource.error)
    return (
      <div className="container section">
        <ErrorState message={resource.error} retry={resource.reload} />
      </div>
    );
  if (!p) return <Empty title="Property not found" />;
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={14} />
        <Link to={p.category === "Hotel" ? "/hotels" : "/search"}>
          {p.category === "Hotel" ? "Hotels" : "Properties"}
        </Link>
        <ChevronRight size={14} />
        <span>{p.title}</span>
      </div>
      <div className="detail-heading">
        <div>
          <div className="inline-badges">
            <span className="pill">
              {p.transaction_type === "sale"
                ? "For sale"
                : p.transaction_type === "hotel"
                  ? "Hotel stay"
                  : "For rent"}
            </span>
            {p.owner.verified && <VerifiedBadge />}
          </div>
          <h1>{p.title}</h1>
          <p className="location">
            <MapPin size={16} />
            {p.address}
            <Rating rating={p.rating} count={p.review_count} />
          </p>
        </div>
        <div className="detail-actions">
          <button className="button outline small" onClick={share}>
            <Share2 size={16} />
            Share
          </button>
          <button className="button outline small" onClick={save}>
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <div className="gallery">
        <button
          className="gallery-main"
          onClick={() => setModal("gallery")}
          aria-label="Open photo gallery"
        >
          <img
            src={p.images[photo]?.url}
            alt={p.images[photo]?.caption || p.title}
          />
          <span>View all {p.images.length} photos</span>
        </button>
        <div className="gallery-thumbs">
          {p.images.map((img, i) => (
            <button
              className={photo === i ? "chosen" : ""}
              onClick={() => setPhoto(i)}
              key={img.id}
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={img.url}
                alt={img.caption || `Property view ${i + 1}`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="detail-layout">
        <div className="detail-content">
          <section>
            <div className="detail-specs">
              <span>
                <BedDouble />
                {p.bedrooms} bedrooms
              </span>
              <span>
                <Bath />
                {p.bathrooms} bathrooms
              </span>
              <span>
                <Maximize />
                {p.area} m²
              </span>
              <span>
                <House />
                {p.category}
              </span>
            </div>
            <h2>A little more about this place</h2>
            <p className="description">{p.description}</p>
          </section>
          <section>
            <h2>Make yourself comfortable</h2>
            <div className="amenities">
              {[
                ...p.amenities,
                ...(p.furnished ? ["Furnished"] : []),
                ...(p.parking ? ["Parking"] : []),
              ].map((x) => (
                <span key={x}>
                  <Check size={18} />
                  {x}
                </span>
              ))}
            </div>
          </section>
          {hotel.data && (
            <section>
              <h2>A room for your kind of stay</h2>
              <p>
                Check-in from {hotel.data.check_in_time.slice(0, 5)} · Check-out
                by {hotel.data.check_out_time.slice(0, 5)}
              </p>
              <div className="hotel-rooms">
                {hotel.data.rooms.map((r) => (
                  <div className="room-card" key={r.id}>
                    <img
                      src={r.image_url || p.images[0]?.url}
                      alt={r.name}
                      loading="lazy"
                    />
                    <div>
                      <h3>{r.name}</h3>
                      <p>
                        {r.bed_type} · {r.capacity} guests
                      </p>
                      <small>{r.amenities.join(" · ")}</small>
                      <strong>
                        {money(r.price)} <small>/ night</small>
                      </strong>
                    </div>
                    <button
                      disabled={!r.available}
                      className="button outline small"
                      onClick={() => {
                        if (requireLogin()) setModal("booking");
                      }}
                    >
                      {r.available ? "Choose dates" : "Unavailable"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2>The neighbourhood</h2>
            <p>{p.address}</p>
            <div className="map-placeholder">
              <MapPin size={32} />
              <strong>{p.location}</strong>
              <span>Approximate location · interactive map not connected</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Explore this address on Google Maps <ArrowRight size={16} />
              </a>
            </div>
          </section>
          <section>
            <div className="section-heading">
              <h2>A few words from guests</h2>
              <button
                className="text-button"
                onClick={() => {
                  if (requireLogin()) setModal("review");
                }}
              >
                Write a review
              </button>
            </div>
            <div className="collection-tabs">
              <div>
                <button
                  className={reviewType === "property" ? "selected" : ""}
                  onClick={() => setReviewType("property")}
                >
                  This place
                </button>
                <button
                  className={reviewType === "host" ? "selected" : ""}
                  onClick={() => setReviewType("host")}
                >
                  The host
                </button>
              </div>
            </div>
            {reviews.loading ? (
              <Loading />
            ) : list(reviews.data).length ? (
              list(reviews.data).map((r) => (
                <article className="review" key={r.id}>
                  <div>
                    <span className="avatar">{r.user.name[0]}</span>
                    <div>
                      <strong>{r.user.name}</strong>
                      <small>
                        {new Date(r.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <Rating rating={r.rating} />
                  </div>
                  <p>{r.comment}</p>
                </article>
              ))
            ) : (
              <p>No reviews yet. Be the first to share your experience.</p>
            )}
          </section>
        </div>
        <aside className="booking-sidebar">
          <div className="owner-box">
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <h2>
              {money(p.price)}
              <small>
                {p.transaction_type === "sale"
                  ? ""
                  : p.transaction_type === "rent"
                    ? " / month"
                    : " / night"}
              </small>
            </h2>
            <div className="availability-label">
              {p.availability === "available"
                ? "Available to enquire"
                : p.availability}
            </div>
            <hr />
            <div className="owner-profile">
              <span className="avatar large">{p.owner.name[0]}</span>
              <div>
                <h3>{p.owner.name}</h3>
                {p.owner.verified && <VerifiedBadge />}
              </div>
            </div>
            <p className="small-text">
              Member since {new Date(p.owner.member_since).getFullYear()}
              <br />
              Response rate: not enough data yet
            </p>
            <button className="button blue full" onClick={chat}>
              <MessageCircle size={18} /> Message{" "}
              {p.category === "Hotel" ? "hotel" : "owner"}
            </button>
            {p.transaction_type === "hotel" ? (
              <button
                className="button dark full"
                disabled={
                  !hotel.data?.rooms.length || p.availability !== "available"
                }
                onClick={() => {
                  if (requireLogin()) setModal("booking");
                }}
              >
                Book your stay <ArrowRight size={17} />
              </button>
            ) : (
              <button
                className="button outline full"
                disabled={p.availability !== "available"}
                onClick={() => {
                  if (requireLogin()) setModal("viewing");
                }}
              >
                <CalendarDays size={17} /> Request a viewing
              </button>
            )}
            {p.phone ? (
              <a className="button outline full" href={`tel:${p.phone}`}>
                <Phone size={17} /> Call owner
              </a>
            ) : (
              <p className="small-text center">
                {user
                  ? "This owner prefers messages."
                  : "Sign in to view the owner’s contact options."}
              </p>
            )}
            <div className="owner-safety">
              <ShieldCheck size={19} />
              <p>
                Visit before paying. Keep your conversations here and check all
                agreements.
              </p>
            </div>
          </div>
          <button
            className="plain-button"
            onClick={() => {
              if (requireLogin()) setModal("report");
            }}
          >
            <Flag size={14} /> Report this listing
          </button>
          <button
            className="plain-button"
            onClick={() => {
              if (requireLogin()) setModal("report-user");
            }}
          >
            Report this owner
          </button>
        </aside>
      </div>
      <section className="section similar-section">
        <div className="section-heading">
          <h2>More places to picture yourself.</h2>
          <Link className="text-link" to="/search">
            Keep exploring <ArrowRight size={17} />
          </Link>
        </div>
        <div className="property-grid">
          {list(similar.data)
            .filter((x) => x.id !== p.id)
            .slice(0, 3)
            .map((x) => (
              <PropertyCard property={x} key={x.id} />
            ))}
        </div>
      </section>
      {modal && (
        <Modal
          title={
            {
              gallery: p.title,
              booking: "Make a little room for a getaway",
              viewing: "Come and see for yourself",
              report: "Report this listing",
              "report-user": "Report this owner",
              review: "Share your experience",
            }[modal]
          }
          onClose={() => setModal("")}
        >
          {modal === "gallery" ? (
            <div className="modal-gallery">
              {p.images.map((img) => (
                <img key={img.id} src={img.url} alt={img.caption} />
              ))}
            </div>
          ) : modal === "booking" ? (
            <BookingForm
              property={p}
              hotel={hotel.data}
              onDone={() => setModal("")}
            />
          ) : modal === "viewing" ? (
            <ActionForm
              submit="Send viewing request"
              onSubmit={async (fd) => {
                await api("viewing-requests/", {
                  method: "POST",
                  body: { ...formObject(fd), property: p.id },
                });
                notify("Your viewing request has been sent.");
                setModal("");
              }}
            >
              <div className="two-fields">
                <Field
                  label="Preferred date"
                  name="preferred_date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  required
                />
                <Field
                  label="Preferred time"
                  name="preferred_time"
                  type="time"
                  required
                />
              </div>
              <Field
                label="A message for the owner"
                name="message"
                type="textarea"
                maxLength="2000"
              />
            </ActionForm>
          ) : modal === "report" || modal === "report-user" ? (
            <ReportForm
              target={
                modal === "report"
                  ? { property: p.id }
                  : { reported_user: p.owner.id }
              }
              onDone={() => setModal("")}
            />
          ) : (
            <ActionForm
              submit="Post review"
              onSubmit={async (fd) => {
                const values = formObject(fd);
                const target =
                  values.target === "host"
                    ? { host: p.owner.id }
                    : { property: p.id };
                delete values.target;
                await api("reviews/", {
                  method: "POST",
                  body: { ...values, ...target },
                });
                reviews.reload();
                resource.reload();
                notify("Thanks for sharing your experience.");
                setModal("");
              }}
            >
              <Field
                label="Review"
                name="target"
                options={[
                  { value: "property", label: "This property / hotel" },
                  { value: "host", label: "This host" },
                ]}
              />
              <Field
                label="Rating"
                name="rating"
                options={[
                  { value: 5, label: "5 — Excellent" },
                  { value: 4, label: "4 — Very good" },
                  { value: 3, label: "3 — Good" },
                  { value: 2, label: "2 — Fair" },
                  { value: 1, label: "1 — Poor" },
                ]}
              />
              <Field
                label="Your experience"
                name="comment"
                type="textarea"
                maxLength="3000"
                required
              />
            </ActionForm>
          )}
        </Modal>
      )}
    </div>
  );
}
