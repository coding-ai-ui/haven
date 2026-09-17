import React, { useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  House,
  Plus,
  CalendarDays,
  MessageCircle,
  Heart,
  Star,
  ShieldCheck,
  Settings,
  LogOut,
  Eye,
  ArrowUpRight,
  Check,
  Clock3,
  Users,
  Flag,
  ChevronRight,
} from "lucide-react";
import { useAuth, useData } from "../context";
import { api, list, money } from "../services/api";
import {
  Loading,
  ErrorState,
  Empty,
  Modal,
  ActionForm,
  Field,
  formObject,
  Pagination,
} from "../components/ui";
function RoomManager({ property, onClose }) {
  const rooms = useData(`hotel-rooms/?hotel=${property.hotel_id}`);
  const { notify } = useAuth();
  const [edit, setEdit] = useState(null);
  return (
    <Modal title={`Rooms at ${property.title}`} onClose={onClose}>
      <p>
        Each entry represents one physical room. Add another room when you have
        more inventory.
      </p>
      <div className="room-management">
        {list(rooms.data).map((r) => (
          <div className="management-row" key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <p>
                {money(r.price)} / night · {r.capacity} guests ·{" "}
                {r.available ? "Available" : "Unavailable"}
              </p>
            </div>
            <button className="button outline small" onClick={() => setEdit(r)}>
              Edit
            </button>
          </div>
        ))}
      </div>
      <h3>{edit ? "Edit room" : "Add a bookable room"}</h3>
      <ActionForm
        key={edit?.id || "new"}
        submit={edit ? "Save room" : "Add room"}
        onSubmit={async (fd, form) => {
          const data = formObject(fd);
          data.hotel = property.hotel_id;
          data.available = fd.get("available") === "on";
          data.amenities = data.amenities
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          await api(edit ? `hotel-rooms/${edit.id}/` : "hotel-rooms/", {
            method: edit ? "PATCH" : "POST",
            body: data,
          });
          rooms.reload();
          setEdit(null);
          form.reset();
          notify("Room saved.");
        }}
      >
        <Field
          label="Room name or number"
          name="name"
          defaultValue={edit?.name || ""}
          required
        />
        <Field
          label="Room type"
          name="room_type"
          defaultValue={edit?.room_type || "Double Room"}
          options={[
            "Single Room",
            "Double Room",
            "Twin Room",
            "Family Room",
            "Suite",
          ]}
        />
        <div className="two-fields">
          <Field
            label="Nightly price ($)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={edit?.price || ""}
            required
          />
          <Field
            label="Guest capacity"
            name="capacity"
            type="number"
            min="1"
            max="20"
            defaultValue={edit?.capacity || 2}
            required
          />
        </div>
        <Field
          label="Bed type"
          name="bed_type"
          defaultValue={edit?.bed_type || "Queen bed"}
          required
        />
        <Field
          label="Amenities (comma separated)"
          name="amenities"
          defaultValue={edit?.amenities.join(", ") || "Wi-Fi, Private bathroom"}
        />
        <Field
          label="Available for bookings"
          name="available"
          type="checkbox"
          defaultChecked={edit ? edit.available : true}
        />
        <p className="small-text">
          This room will use your hotel’s main photo if no separate image is
          configured in administration.
        </p>
      </ActionForm>
      {edit && (
        <button className="plain-button" onClick={() => setEdit(null)}>
          Cancel editing
        </button>
      )}
    </Modal>
  );
}
export default function Dashboard() {
  const { tab = "overview" } = useParams();
  const { user, setUser, notify } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [roomProperty, setRoomProperty] = useState(null),
    [remove, setRemove] = useState(null);
  const stats = useData("dashboard/");
  const [recent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("haven-recent") || "[]");
    } catch {
      return [];
    }
  });
  const path = {
    listings: "properties/?mine=1",
    bookings: "bookings/?",
    viewings: "viewing-requests/?",
    reviews: "reviews/?mine=1",
  }[tab];
  const resource = useData(path ? path + "&page=" + page : null, [tab]);
  async function act(url, body) {
    try {
      await api(url, { method: "POST", body });
      resource.reload();
      stats.reload();
      notify("Updated successfully.");
    } catch (e) {
      notify(e.message, true);
    }
  }
  const links = [
    ["overview", LayoutDashboard, "Overview"],
    ["listings", House, "My listings"],
    ["/list-property", Plus, "Add property"],
    ["bookings", CalendarDays, "Bookings"],
    ["viewings", Eye, "Viewing requests"],
    ["/messages", MessageCircle, "Messages"],
    ["/saved", Heart, "Saved places"],
    ["reviews", Star, "Reviews"],
    ["/verification", ShieldCheck, "Verification"],
    ["/profile", Settings, "Account settings"],
  ];
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-nav">
        <div className="dashboard-person">
          <span className="avatar large">{user.first_name?.[0] || "H"}</span>
          <h3>
            {user.first_name} {user.last_name}
          </h3>
          <span className="status-chip">
            {user.profile.verification_status.replace("_", " ")}
          </span>
        </div>
        <nav>
          {links.map(([url, Icon, label]) => (
            <NavLink
              key={url}
              to={
                url.startsWith("/")
                  ? url
                  : url === "overview"
                    ? "/dashboard"
                    : `/dashboard/${url}`
              }
              end
              onClick={() => setPage(1)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {user.is_staff && (
            <NavLink to="/admin-dashboard">
              <ShieldCheck size={18} />
              Admin overview
            </NavLink>
          )}
        </nav>
        <button
          className="logout-button"
          onClick={async () => {
            try {
              await api("auth/logout/", { method: "POST" });
              setUser(null);
              navigate("/");
            } catch (e) {
              notify(e.message, true);
            }
          }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>
      <main className="dashboard-main">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR LITTLE CORNER OF HAVEN</span>
            <h1>
              {tab === "overview"
                ? `Good to see you, ${user.first_name}.`
                : {
                    listings: "Your places, all together.",
                    bookings: "Good stays ahead.",
                    viewings: "Open the door to what’s next.",
                    reviews: "The experiences you’ve shared.",
                  }[tab] || "Your dashboard"}
            </h1>
          </div>
          <Link className="button blue small" to="/list-property">
            <Plus size={16} /> List a property
          </Link>
        </div>
        {tab === "overview" ? (
          <>
            <div className="dashboard-stats">
              {[
                ["listings", "Active listings", House],
                ["views", "Property views", Eye],
                ["messages", "Unread messages", MessageCircle],
                ["bookings", "Total bookings", CalendarDays],
                ["viewings", "Viewing requests", Users],
                ["favorites", "Saves on your places", Heart],
              ].map(([key, label, Icon]) => (
                <div className="stat-card" key={key}>
                  <span>
                    <Icon size={19} />
                    {label}
                  </span>
                  <strong>{stats.data?.[key] ?? "—"}</strong>
                </div>
              ))}
            </div>
            <div className="dashboard-welcome">
              <ShieldCheck size={38} />
              <div>
                <h2>
                  {user.profile.verification_status === "verified"
                    ? "You’re ready to open doors."
                    : "A little trust goes a long way."}
                </h2>
                <p>
                  {user.profile.verification_status === "verified"
                    ? "Your identity is verified. Add a listing and help someone find their next place."
                    : "Verify your identity before publishing your first property. Your documents stay private."}
                </p>
              </div>
              <Link
                className="button dark"
                to={
                  user.profile.verification_status === "verified"
                    ? "/list-property"
                    : "/verification"
                }
              >
                {user.profile.verification_status === "verified"
                  ? "Add a property"
                  : "Get verified"}
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <h3>Your profile, at a glance</h3>
                <p>A few details make it easier to connect.</p>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${[user.first_name, user.last_name, user.profile.phone, user.profile.bio, user.profile.country].filter(Boolean).length * 20}%`,
                    }}
                  />
                </div>
                <strong>
                  {[
                    user.first_name,
                    user.last_name,
                    user.profile.phone,
                    user.profile.bio,
                    user.profile.country,
                  ].filter(Boolean).length * 20}
                  % complete
                </strong>
                <Link className="text-link" to="/profile">
                  Update your profile <ArrowRightIcon />
                </Link>
              </section>
              <section className="panel">
                <h3>Recently viewed</h3>
                {recent.length ? (
                  recent.map((p) => (
                    <Link
                      className="recent-row"
                      key={p.id}
                      to={`/properties/${p.id}`}
                    >
                      {p.title}
                      <ChevronRight size={15} />
                    </Link>
                  ))
                ) : (
                  <p>Places you explore on this device will appear here.</p>
                )}
              </section>
            </div>
          </>
        ) : resource.loading ? (
          <Loading />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.reload} />
        ) : !list(resource.data).length ? (
          <Empty
            title={
              {
                listings: "You haven't listed a property yet.",
                bookings: "You don't have any bookings.",
                viewings: "No viewing requests yet.",
                reviews: "Your reviews will appear here.",
              }[tab]
            }
            text="Every new chapter starts with a first step."
            link={tab === "listings" ? "/list-property" : "/search"}
            label={
              tab === "listings"
                ? "Add your first listing"
                : "Explore properties"
            }
          />
        ) : (
          <>
            <div className="management-list">
              {list(resource.data).map((item) => (
                <div className="management-row" key={item.id}>
                  {tab === "listings" ? (
                    <>
                      <img src={item.images[0]?.url} alt={item.title} />
                      <div>
                        <Link to={`/properties/${item.id}`}>
                          <h3>{item.title}</h3>
                        </Link>
                        <p>
                          {item.location} · {money(item.price)}
                        </p>
                        <span className="status-chip">
                          {item.approved ? item.availability : "removed"}
                        </span>
                      </div>
                      <div className="row-actions">
                        <Link
                          className="button outline small"
                          to={`/list-property/${item.id}`}
                        >
                          Edit
                        </Link>
                        {item.hotel_id && (
                          <button
                            className="button outline small"
                            onClick={() => setRoomProperty(item)}
                          >
                            Manage rooms
                          </button>
                        )}
                        <button
                          className="text-button danger"
                          onClick={() => setRemove(item)}
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  ) : tab === "bookings" ? (
                    <>
                      <span className="row-icon">
                        <CalendarDays />
                      </span>
                      <div>
                        <h3>{item.hotel_title}</h3>
                        <p>
                          {item.room_name} · {item.guests} guests ·{" "}
                          {item.user_name}
                        </p>
                        <p>
                          {item.check_in} → {item.check_out} ·{" "}
                          {money(item.total_price)}
                        </p>
                        <span className="status-chip">{item.status}</span>
                      </div>
                      <div className="row-actions">
                        <Link
                          to={`/properties/${item.property_id}`}
                          className="button outline small"
                        >
                          View hotel
                        </Link>
                        {["pending", "confirmed"].includes(item.status) && (
                          <button
                            className="text-button danger"
                            onClick={() => setRemove(item)}
                          >
                            Cancel booking
                          </button>
                        )}
                      </div>
                    </>
                  ) : tab === "viewings" ? (
                    <>
                      <span className="row-icon">
                        <Eye />
                      </span>
                      <div>
                        <h3>{item.property_title}</h3>
                        <p>
                          {item.preferred_date} at{" "}
                          {item.preferred_time.slice(0, 5)} · {item.user_name}
                        </p>
                        <p>{item.message}</p>
                        <span className="status-chip">{item.status}</span>
                      </div>
                      {item.owner_id === user.id &&
                        item.status === "pending" && (
                          <div className="row-actions">
                            <button
                              className="button blue small"
                              onClick={() =>
                                act(`viewing-requests/${item.id}/respond/`, {
                                  status: "accepted",
                                })
                              }
                            >
                              Accept
                            </button>
                            <button
                              className="button outline small"
                              onClick={() =>
                                act(`viewing-requests/${item.id}/respond/`, {
                                  status: "rejected",
                                })
                              }
                            >
                              Decline
                            </button>
                          </div>
                        )}
                    </>
                  ) : (
                    <>
                      <span className="row-icon">
                        <Star />
                      </span>
                      <div>
                        <h3>{item.rating} out of 5 stars</h3>
                        <p>{item.comment}</p>
                        <small>
                          {new Date(item.created_at).toLocaleDateString()}
                        </small>
                      </div>
                      <button
                        className="text-button danger"
                        onClick={() => setRemove(item)}
                      >
                        Remove review
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <Pagination data={resource.data} page={page} setPage={setPage} />
          </>
        )}
        {roomProperty && (
          <RoomManager
            property={roomProperty}
            onClose={() => setRoomProperty(null)}
          />
        )}
        {remove && (
          <Modal
            title={
              tab === "bookings"
                ? "Cancel this reservation?"
                : "Remove this item?"
            }
            onClose={() => setRemove(null)}
          >
            <p>
              {tab === "bookings"
                ? "The room will become available for someone else to book."
                : "This will permanently remove this item. Listings with booking records must be archived instead."}
            </p>
            <ActionForm
              submit={
                tab === "bookings" ? "Yes, cancel reservation" : "Yes, remove"
              }
              onSubmit={async () => {
                if (tab === "bookings")
                  await api(`bookings/${remove.id}/cancel/`, {
                    method: "POST",
                  });
                else
                  await api(
                    `${tab === "listings" ? "properties" : "reviews"}/${remove.id}/`,
                    { method: "DELETE" },
                  );
                resource.reload();
                stats.reload();
                setRemove(null);
                notify("Your change has been saved.");
              }}
            />
          </Modal>
        )}
      </main>
    </div>
  );
}
function ArrowRightIcon() {
  return <ChevronRight size={16} />;
}

export function AdminDashboard() {
  const resource = useData("admin/overview/");
  const { notify } = useAuth();
  const [tab, setTab] = useState("verifications"),
    [review, setReview] = useState(null),
    [confirm, setConfirm] = useState(null);
  async function act(kind, id, value, note = "") {
    await api("admin/overview/", {
      method: "POST",
      body: { kind, id, value, note },
    });
    resource.reload();
    notify("Administration updated.");
  }
  if (resource.loading && !resource.data) return <Loading />;
  if (resource.error)
    return <ErrorState message={resource.error} retry={resource.reload} />;
  const d = resource.data;
  return (
    <div className="container admin-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">KEEPING HAVEN IN GOOD HANDS</span>
          <h1>Marketplace overview</h1>
        </div>
        <a
          className="button dark"
          href="/admin/"
          target="_blank"
          rel="noreferrer"
        >
          Django administration <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="dashboard-stats admin-stats">
        {Object.entries(d.counts).map(([key, value]) => (
          <div className="stat-card" key={key}>
            <span>{key.replaceAll("_", " ")}</span>
            <strong>{value}</strong>
            <div className="mini-bar">
              <i
                style={{
                  width: `${Math.max(5, Math.min((value / Math.max(...Object.values(d.counts))) * 100, 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="admin-tabs">
        {[
          "verifications",
          "users",
          "listings",
          "bookings",
          "reports",
          "reviews",
        ].map((x) => (
          <button
            key={x}
            className={tab === x ? "selected" : ""}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="section-heading">
          <h2>{tab[0].toUpperCase() + tab.slice(1)}</h2>
          <small className="muted">
            Latest 100 records · use Django admin for the full archive
          </small>
        </div>
        {!d[tab].length ? (
          <p>No records to review.</p>
        ) : (
          d[tab].map((row) => (
            <div className="management-row" key={row.id}>
              <div>
                <h3>
                  {row.legal_name ||
                    row.title ||
                    row.hotel_title ||
                    row.reason ||
                    row.email ||
                    `${row.rating} star review`}
                </h3>
                <p>
                  {row.user?.name ||
                    row.user ||
                    row.comment ||
                    row.details ||
                    row.category ||
                    `${row.first_name || ""} ${row.last_name || ""}`}
                </p>
                {tab === "bookings" && (
                  <p>
                    {row.check_in} → {row.check_out} · {money(row.total_price)}
                  </p>
                )}
                <span className="status-chip">
                  {row.status ||
                    (row.is_active === false
                      ? "suspended"
                      : row.approved === false
                        ? "removed"
                        : "active")}
                </span>
              </div>
              <div className="row-actions">
                {tab === "verifications" ? (
                  <button
                    className="button blue small"
                    onClick={() => setReview(row)}
                  >
                    Review identity
                  </button>
                ) : tab === "users" ? (
                  !row.is_staff && (
                    <button
                      className="button outline small"
                      onClick={() =>
                        setConfirm({
                          kind: "user",
                          id: row.id,
                          value: row.is_active ? "suspended" : "active",
                          label: row.is_active
                            ? "Suspend account"
                            : "Restore account",
                        })
                      }
                    >
                      {row.is_active ? "Suspend" : "Restore"}
                    </button>
                  )
                ) : tab === "listings" ? (
                  <>
                    <button
                      className="button outline small"
                      onClick={() =>
                        setConfirm({
                          kind: "listing",
                          id: row.id,
                          value: row.approved ? "removed" : "approved",
                          label: row.approved
                            ? "Remove from browsing"
                            : "Approve listing",
                        })
                      }
                    >
                      {row.approved ? "Remove" : "Approve"}
                    </button>
                    {row.category === "Hotel" && (
                      <a
                        className="text-link"
                        href={`/admin/core/property/${row.id}/change/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Manage hotel
                      </a>
                    )}
                  </>
                ) : tab === "reports" ? (
                  <select
                    aria-label="Report status"
                    value={row.status}
                    onChange={(e) =>
                      act("report", row.id, e.target.value).catch((e) =>
                        notify(e.message, true),
                      )
                    }
                  >
                    {["pending", "investigating", "resolved", "dismissed"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                ) : tab === "reviews" ? (
                  <button
                    className="text-button danger"
                    onClick={() =>
                      setConfirm({
                        kind: "review",
                        id: row.id,
                        value: "remove",
                        label: "Remove review",
                      })
                    }
                  >
                    Remove
                  </button>
                ) : (
                  ["pending", "confirmed"].includes(row.status) && (
                    <>
                      <button
                        className="button outline small"
                        onClick={() =>
                          setConfirm({
                            kind: "booking",
                            id: row.id,
                            value: "completed",
                            label: "Complete booking",
                          })
                        }
                      >
                        Complete
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() =>
                          setConfirm({
                            kind: "booking",
                            id: row.id,
                            value: "cancelled",
                            label: "Cancel booking",
                          })
                        }
                      >
                        Cancel
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {review && (
        <Modal title="Identity review" onClose={() => setReview(null)}>
          <dl className="review-details">
            {[
              "legal_name",
              "date_of_birth",
              "document_type",
              "document_number",
              "address",
              "country",
              "status",
            ].map((k) => (
              <React.Fragment key={k}>
                <dt>{k.replaceAll("_", " ")}</dt>
                <dd>{review[k]}</dd>
              </React.Fragment>
            ))}
          </dl>
          <div className="document-links">
            {[
              "document_front",
              ...(review.has_back ? ["document_back"] : []),
              "selfie",
            ].map((f) => (
              <a
                key={f}
                className="button outline small"
                href={`/api/admin/verification/${review.id}/${f}/`}
                target="_blank"
                rel="noreferrer"
              >
                Download {f.replace("_", " ")}
              </a>
            ))}
          </div>
          <ActionForm
            submit="Save review decision"
            onSubmit={async (fd) => {
              await act(
                "verification",
                review.id,
                fd.get("status"),
                fd.get("note"),
              );
              setReview(null);
            }}
          >
            <Field
              label="Decision"
              name="status"
              options={[
                { value: "verified", label: "Approve identity" },
                { value: "rejected", label: "Reject submission" },
              ]}
            />
            <Field
              label="Review note (visible to user)"
              name="note"
              type="textarea"
              defaultValue={review.review_note}
              required
              maxLength="2000"
            />
          </ActionForm>
        </Modal>
      )}
      {confirm && (
        <Modal title={`${confirm.label}?`} onClose={() => setConfirm(null)}>
          <p>This change takes effect immediately.</p>
          <ActionForm
            submit={confirm.label}
            onSubmit={async () => {
              await act(confirm.kind, confirm.id, confirm.value);
              setConfirm(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
