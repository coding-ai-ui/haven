import React, { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  HeartHandshake,
  X,
  MapPin,
} from "lucide-react";
import { useData } from "../context";
import { list } from "../services/api";
import {
  PropertyCard,
  Loading,
  ErrorState,
  Empty,
  Field,
  Pagination,
} from "../components/ui";
export default function Browse() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(false);
  const path = location.pathname;
  const isHotel =
    path === "/hotels" || params.get("transaction_type") === "hotel";
  const emergency = path === "/emergency-housing";
  const saved = path === "/saved";
  const [page, setPage] = useState(1);
  const query = new URLSearchParams(params);
  if (path === "/buy" && !query.has("transaction_type"))
    query.set("transaction_type", "sale");
  if (path === "/rent" && !query.has("transaction_type"))
    query.set("transaction_type", "rent");
  if (path === "/rooms") query.set("rooms", "1");
  if (isHotel) query.set("transaction_type", "hotel");
  if (emergency) query.set("emergency", "1");
  query.set("page", page);
  const resource = useData(
    (saved ? "favorites/" : "properties/") + "?" + query.toString(),
  );
  useEffect(() => setPage(1), [params.toString(), path]);
  const title = saved
    ? "Your favourite places"
    : emergency
      ? "A place to stay. A chance to reset."
      : path === "/buy"
        ? "Make room for your future."
        : path === "/rent"
          ? "Find a home that fits your life."
          : path === "/rooms"
            ? "A little space to call your own."
            : isHotel
              ? "Check in to something good."
              : "Find your kind of place.";
  function apply(e) {
    e.preventDefault();
    const p = new URLSearchParams(
      [...new FormData(e.currentTarget)].filter(([, v]) => v),
    );
    setParams(p);
    setPage(1);
    setFilters(false);
  }
  return (
    <div className="browse-page">
      <section className={`page-intro ${emergency ? "emergency-intro" : ""}`}>
        <div className="container">
          <span className="eyebrow">
            {saved
              ? "MAKE YOURSELF A SHORTLIST"
              : emergency
                ? "SUPPORT FOR YOUR NEXT STEP"
                : isHotel
                  ? "A CHANGE OF SCENERY"
                  : "YOUR NEXT CHAPTER STARTS HERE"}
          </span>
          <h1>{title}</h1>
          <p>
            {saved
              ? "The homes, rooms, and getaways you want to come back to."
              : emergency
                ? "Explore available rooms, affordable stays, and temporary accommodation. Availability is never guaranteed."
                : "Explore thoughtfully presented places. Compare the details. Find what feels right."}
          </p>
          {emergency && (
            <div className="emergency-disclaimer">
              <HeartHandshake size={23} />
              <span>
                This platform is not an emergency service. If you are in
                immediate danger, contact your local emergency or social
                services.
              </span>
            </div>
          )}
        </div>
      </section>
      <div className="container browse-layout">
        {!saved && (
          <>
            <button
              className="button outline filter-toggle"
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={18} /> Filters
            </button>
            <aside className={`filter-panel ${filters ? "show" : ""}`}>
              <form onSubmit={apply} key={path + params.toString()}>
                <div className="filter-title">
                  <h3>Find your fit</h3>
                  <SlidersHorizontal size={18} />
                </div>
                <Field
                  label="Location or name"
                  name="q"
                  defaultValue={params.get("q") || ""}
                  placeholder="City, area, or property"
                />
                {!isHotel && (
                  <>
                    <Field
                      label="Looking to"
                      name="transaction_type"
                      defaultValue={query.get("transaction_type") || ""}
                      options={[
                        { value: "", label: "Buy or rent" },
                        { value: "sale", label: "Buy a home" },
                        { value: "rent", label: "Long-term rent" },
                        { value: "short_term", label: "Short-term rent" },
                      ]}
                    />
                    <Field
                      label="Property type"
                      name="category"
                      defaultValue={params.get("category") || ""}
                      options={[
                        { value: "", label: "All types" },
                        ...[
                          "House",
                          "Apartment",
                          "Villa",
                          "Studio",
                          "Room",
                          "Shared Room",
                          "Guest House",
                        ],
                      ]}
                    />
                  </>
                )}
                <div className="two-fields">
                  <Field
                    label="Min price ($)"
                    name="min_price"
                    type="number"
                    min="0"
                    placeholder="0"
                    defaultValue={params.get("min_price") || ""}
                  />
                  <Field
                    label="Max price ($)"
                    name="max_price"
                    type="number"
                    min="0"
                    placeholder="Any"
                    defaultValue={params.get("max_price") || ""}
                  />
                </div>
                <small className="muted">
                  {isHotel
                    ? "Per night"
                    : emergency
                      ? "Rent is monthly; short stays are per night."
                      : "Sale total, monthly rent, or nightly short stay"}
                </small>
                {isHotel ? (
                  <>
                    <Field
                      label="Check-in"
                      name="check_in"
                      type="date"
                      defaultValue={params.get("check_in") || ""}
                    />
                    <Field
                      label="Check-out"
                      name="check_out"
                      type="date"
                      defaultValue={params.get("check_out") || ""}
                    />
                    <Field
                      label="Guests"
                      name="guests"
                      type="number"
                      min="1"
                      max="10"
                      defaultValue={params.get("guests") || ""}
                    />
                    <Field
                      label="Room type"
                      name="room_type"
                      defaultValue={params.get("room_type") || ""}
                      options={[
                        { value: "", label: "Any room" },
                        "Single Room",
                        "Double Room",
                        "Twin Room",
                        "Family Room",
                        "Suite",
                      ]}
                    />
                    <Field
                      label="Minimum rating"
                      name="rating"
                      defaultValue={params.get("rating") || ""}
                      options={[
                        { value: "", label: "Any rating" },
                        { value: "4", label: "4 stars & above" },
                        { value: "5", label: "5 stars" },
                      ]}
                    />
                    <Field
                      label="Amenity"
                      name="amenity"
                      placeholder="Wi-Fi, Breakfast…"
                      defaultValue={params.get("amenity") || ""}
                    />
                  </>
                ) : (
                  <>
                    <div className="two-fields">
                      <Field
                        label="Bedrooms"
                        name="bedrooms"
                        type="number"
                        min="0"
                        max="20"
                        defaultValue={params.get("bedrooms") || ""}
                        placeholder="Any"
                      />
                      <Field
                        label="Bathrooms"
                        name="bathrooms"
                        type="number"
                        min="0"
                        max="20"
                        defaultValue={params.get("bathrooms") || ""}
                        placeholder="Any"
                      />
                    </div>
                    <Field
                      label="Furnished"
                      name="furnished"
                      type="checkbox"
                      value="1"
                      defaultChecked={params.get("furnished") === "1"}
                    />
                  </>
                )}
                <Field
                  label="Verified owners only"
                  name="verified"
                  type="checkbox"
                  value="1"
                  defaultChecked={params.get("verified") === "1"}
                />
                <button className="button blue full">
                  <Search size={17} /> Apply filters
                </button>
                <button
                  type="button"
                  className="plain-button"
                  onClick={() => setParams({})}
                >
                  Reset filters
                </button>
              </form>
              <div className="filter-safety">
                <ShieldCheck size={23} />
                <h4>A little peace of mind</h4>
                <p>
                  Get to know the place and the person before making a
                  commitment.
                </p>
                <Link to="/safety">Read our safety tips →</Link>
              </div>
            </aside>
          </>
        )}
        <div className="browse-results">
          <div className="results-toolbar">
            <span>
              <strong>{resource.data?.count ?? "…"}</strong>{" "}
              {saved ? "saved places" : "places to discover"}
            </span>
            {!saved && (
              <select
                aria-label="Sort results"
                value={params.get("sort") || ""}
                onChange={(e) => {
                  const p = new URLSearchParams(params);
                  p.set("sort", e.target.value);
                  setParams(p);
                }}
              >
                <option value="">Recommended</option>
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Highest rated</option>
              </select>
            )}
          </div>
          {resource.loading ? (
            <Loading />
          ) : resource.error ? (
            <ErrorState message={resource.error} retry={resource.reload} />
          ) : list(resource.data).length ? (
            <>
              <div className={`property-grid ${saved ? "" : "compact"}`}>
                {list(resource.data).map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onChange={saved ? resource.reload : undefined}
                  />
                ))}
              </div>
              <Pagination data={resource.data} page={page} setPage={setPage} />
            </>
          ) : (
            <Empty
              title={
                saved
                  ? "You haven't saved any properties yet."
                  : "No places match just yet."
              }
              text={
                saved
                  ? "Tap the heart on a listing to keep it here."
                  : "Try a nearby city or a wider price range."
              }
            />
          )}
        </div>
      </div>
      {emergency && (
        <section className="section emergency-help">
          <h2>More ways to find support</h2>
          <div className="steps">
            <div>
              <h3>Local housing services</h3>
              <p>
                Contact your city’s housing office about shelters, temporary
                housing, and eligibility. Local contact directory: not yet
                available.
              </p>
            </div>
            <div>
              <h3>Community organisations</h3>
              <p>
                Local charities and community centres may help you explore
                nearby options. Contact directory: not yet available.
              </p>
            </div>
            <div>
              <h3>Search nearby</h3>
              <p>
                Use your city or a nearby area in the search filter. Ask the
                host about move-in dates and the full cost before booking.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
