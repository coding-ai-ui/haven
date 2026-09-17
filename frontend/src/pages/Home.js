import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  House,
  Building2,
  KeyRound,
  BedDouble,
  MapPin,
  Search,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  HeartHandshake,
  Check,
  Quote,
  SlidersHorizontal,
  MessageCircle,
} from "lucide-react";
import { useData, useAuth } from "../context";
import { api, list } from "../services/api";
import { PropertyCard, Loading, ErrorState } from "../components/ui";
export function SearchBar() {
  const [tab, setTab] = useState("sale");
  const navigate = useNavigate();
  const [history] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("haven-search-history") || "[]");
    } catch {
      return [];
    }
  });
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams([...fd].filter(([, v]) => v));
    if (tab === "room") params.set("rooms", "1");
    else params.set("transaction_type", tab);
    const q = fd.get("q");
    if (q) {
      try {
        localStorage.setItem(
          "haven-search-history",
          JSON.stringify([q, ...history.filter((x) => x !== q)].slice(0, 5)),
        );
      } catch {}
    }
    navigate("/search?" + params);
  };
  return (
    <div className="search-wrap">
      <div className="search-tabs" role="tablist" aria-label="Find a place">
        {[
          ["sale", "Buy a home"],
          ["rent", "Rent a home"],
          ["room", "Find a room"],
          ["hotel", "Book a hotel"],
        ].map(([v, t]) => (
          <button
            role="tab"
            aria-selected={tab === v}
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {t}
          </button>
        ))}
      </div>
      <form
        className={`search-panel ${tab === "hotel" ? "hotel-search" : ""}`}
        onSubmit={submit}
      >
        <label>
          <span>LOCATION</span>
          <div>
            <MapPin size={18} />
            <input
              name="q"
              placeholder="Where would you like to go?"
              list="recent-searches"
            />
          </div>
          <datalist id="recent-searches">
            {history.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </label>
        {tab === "hotel" ? (
          <>
            <label>
              <span>CHECK-IN</span>
              <input
                name="check_in"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              <span>CHECK-OUT</span>
              <input
                name="check_out"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label>
              <span>GUESTS</span>
              <input
                type="number"
                name="guests"
                defaultValue="2"
                min="1"
                max="10"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              <span>PROPERTY TYPE</span>
              <select name="category">
                <option value="">All property types</option>
                {(tab === "room"
                  ? ["Room", "Shared Room"]
                  : ["House", "Apartment", "Villa", "Studio", "Guest House"]
                ).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              <span>PRICE RANGE</span>
              <select name="max_price">
                <option value="">Any budget</option>
                <option value={tab === "sale" ? "500000" : "1000"}>
                  {tab === "sale" ? "Up to $500,000" : "Up to $1,000"}
                </option>
                <option value={tab === "sale" ? "1000000" : "2500"}>
                  {tab === "sale" ? "Up to $1,000,000" : "Up to $2,500"}
                </option>
              </select>
            </label>
          </>
        )}
        <button className="button blue">
          <Search size={18} /> Find my place
        </button>
      </form>
      <div className="search-note">
        <ShieldCheck size={15} /> A little more peace of mind, every step of the
        way.
      </div>
    </div>
  );
}
function Count({ value }) {
  const ref = useRef();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame;
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCount(value);
        return;
      }
      const start = performance.now();
      const tick = (time) => {
        const p = Math.min((time - start) / 900, 1);
        setCount(Math.round(value * (1 - (1 - p) ** 3)));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    if (ref.current) o.observe(ref.current);
    return () => {
      o.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return <strong ref={ref}>{count.toLocaleString()}</strong>;
}
export default function Home() {
  const properties = useData("properties/?transaction_type=sale");
  const rentals = useData("properties/?transaction_type=rent");
  const hotels = useData("properties/?transaction_type=hotel");
  const stats = useData("stats/");
  const { notify } = useAuth();
  const [collection, setCollection] = useState("sale");
  const [busy, setBusy] = useState(false);
  const selected = collection === "sale" ? properties : rentals;
  async function subscribe(e) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    try {
      const d = await api("newsletter/", {
        method: "POST",
        body: { email: new FormData(form).get("email") },
      });
      notify(d.detail);
      form.reset();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="eyebrow light">
            <span className="tiny-line" /> EVERY NEW CHAPTER STARTS SOMEWHERE
          </span>
          <h1>
            Find a place
            <br />
            to call <em>home.</em>
          </h1>
          <p>
            Buy, rent, book, or find a room —<br />
            safely, simply, and in one place.
          </p>
          <div className="hero-proof">
            <ShieldCheck size={19} /> Real places. Verified people. Better
            beginnings.
          </div>
        </div>
        <div className="hero-location">
          <MapPin size={17} />
          <div>
            Room to breathe.<small>Your next chapter, anywhere.</small>
          </div>
        </div>
      </section>
      <SearchBar />
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GOOD PLACES. GREAT POSSIBILITIES.</span>
            <h2>A place for every chapter</h2>
          </div>
          <p>
            A first home. A fresh start. A weekend away.
            <br />
            Whatever comes next, find it here.
          </p>
        </div>
        <div className="category-grid">
          {[
            [House, "Houses for sale", "Room for your future", "/buy"],
            [KeyRound, "Homes for rent", "Make yourself at home", "/rent"],
            [
              Building2,
              "Rooms & shared living",
              "Your own little corner",
              "/rooms",
            ],
            [
              BedDouble,
              "Hotels & getaways",
              "Check in. Switch off.",
              "/hotels",
            ],
          ].map(([Icon, t, s, u]) => (
            <Link className="category-card" key={u} to={u}>
              <div className="category-icon">
                <Icon size={24} />
              </div>
              <div>
                <h3>{t}</h3>
                <p>{s}</p>
              </div>
              <ArrowUpRight size={22} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section featured-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HANDPICKED FOR YOUR NEXT MOVE</span>
            <h2>Some places just feel right.</h2>
          </div>
          <Link className="text-link" to="/search">
            Explore all properties <ArrowRight size={18} />
          </Link>
        </div>
        <div className="collection-tabs">
          <div>
            <button
              className={collection === "sale" ? "selected" : ""}
              onClick={() => setCollection("sale")}
            >
              For sale
            </button>
            <button
              className={collection === "rent" ? "selected" : ""}
              onClick={() => setCollection("rent")}
            >
              For rent
            </button>
          </div>
          <span>Find the one that feels like you.</span>
        </div>
        {selected.loading ? (
          <Loading />
        ) : selected.error ? (
          <ErrorState message={selected.error} retry={selected.reload} />
        ) : (
          <div className="property-grid">
            {list(selected.data)
              .slice(0, 3)
              .map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
          </div>
        )}
      </section>
      <section className="section reveal">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A DIFFERENT VIEW, A NEW BEGINNING</span>
            <h2>Where will life take you?</h2>
          </div>
          <Link className="text-link" to="/search">
            Explore destinations <ArrowRight size={18} />
          </Link>
        </div>
        <div className="destination-grid">
          {[
            ["Lisbon", "Portugal", "photo-1664894364100-0e1a5165cb8a"],
            ["London", "United Kingdom", "photo-1513635269975-59663e0ac1ad"],
            ["Barcelona", "Spain", "photo-1583422409516-2895a77efded"],
            [
              "Dubai",
              "United Arab Emirates",
              "photo-1643140966003-ed6ce19fd750",
            ],
          ].map(([city, country, img]) => (
            <Link key={city} to={`/search?q=${city}`} className="destination">
              <img
                src={`https://images.unsplash.com/${img}?auto=format&fit=crop&w=650&q=80`}
                alt={`${city} cityscape`}
                loading="lazy"
              />
              <div>
                <h3>{city}</h3>
                <p>{country}</p>
              </div>
              <ArrowUpRight size={21} />
            </Link>
          ))}
        </div>
      </section>
      <section className="hotel-band">
        <div className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STAY A LITTLE. FEEL A LOT.</span>
              <h2>Your next great escape</h2>
            </div>
            <Link className="text-link" to="/hotels">
              Discover all hotels <ArrowRight size={18} />
            </Link>
          </div>
          {hotels.loading ? (
            <Loading />
          ) : hotels.error ? (
            <ErrorState message={hotels.error} retry={hotels.reload} />
          ) : (
            <div className="property-grid">
              {list(hotels.data)
                .slice(0, 3)
                .map((p) => (
                  <PropertyCard property={p} key={p.id} />
                ))}
            </div>
          )}
        </div>
      </section>
      <section className="section">
        <div className="temporary-banner">
          <div className="temporary-icon">
            <HeartHandshake size={43} />
          </div>
          <div>
            <span className="eyebrow">EVERYONE DESERVES A PLACE TO BEGIN</span>
            <h2>Need somewhere to stay?</h2>
            <p>
              Explore available rooms and short-term accommodation near you.
              <br />A little support for your next step.
            </p>
          </div>
          <Link to="/emergency-housing" className="button dark">
            Find accommodation <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section trust-section reveal">
        <div className="trust-photo">
          <img
            src="https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1000&q=85"
            loading="lazy"
            alt="A bright, welcoming living room"
          />
          <div className="trust-float">
            <span>
              <ShieldCheck size={28} />
            </span>
            <div>
              A real person.<strong>A little more peace of mind.</strong>
            </div>
          </div>
        </div>
        <div className="trust-copy">
          <span className="eyebrow">TRUST IS WHERE WE START</span>
          <h2>
            Behind every good place,
            <br />
            there should be a real person.
          </h2>
          <p>
            Home is personal. That’s why we review an owner’s identity before
            they can publish, and keep conversations in one place.
          </p>
          <ul>
            {[
              "Identity reviewed by a real person",
              "Private conversations, right here",
              "Clear details to help you compare",
            ].map((x) => (
              <li key={x}>
                <span>
                  <Check size={15} />
                </span>
                {x}
              </li>
            ))}
          </ul>
          <Link className="text-link" to="/safety">
            Get to know our approach <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section how-section">
        <div className="section-heading centered">
          <div>
            <span className="eyebrow">LESS COMPLICATED. MORE POSSIBLE.</span>
            <h2>Your next chapter, in four steps.</h2>
          </div>
        </div>
        <div className="steps">
          {[
            [
              Search,
              "Find your place",
              "Explore homes, rooms, and stays that fit your life.",
            ],
            [
              SlidersHorizontal,
              "Make it yours",
              "Compare the details that matter most to you.",
            ],
            [
              MessageCircle,
              "Start a conversation",
              "Message an owner, arrange a viewing, or book a stay.",
            ],
            [
              KeyRound,
              "Settle into what’s next",
              "Agree the details and get ready for a fresh start.",
            ],
          ].map(([Icon, t, s], i) => (
            <div key={t}>
              <span className="step-icon">
                <Icon size={24} />
                <small>0{i + 1}</small>
              </span>
              <h3>{t}</h3>
              <p>{s}</p>
            </div>
          ))}
        </div>
        {stats.data && (
          <div className="stats-row">
            {[
              ["properties", "Places to discover"],
              ["owners", "Verified owners"],
              ["bookings", "Confirmed bookings"],
              ["cities", "Cities to explore"],
            ].map(([key, label]) => (
              <div key={key}>
                <Count value={stats.data[key]} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="testimonial-band">
        <div className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">IT’S ABOUT MORE THAN AN ADDRESS</span>
              <h2>Little stories. Big beginnings.</h2>
            </div>
            <span className="muted small-text">
              Illustrative community stories
            </span>
          </div>
          <div className="testimonials">
            {[
              [
                "“Having the details and the conversation in one place made our search feel so much simpler.”",
                "Amara O.",
                "A fresh start in Lisbon",
              ],
              [
                "“We wanted a quiet room for a short stay. Comparing the options gave us a clear place to start.”",
                "Oliver C.",
                "A slower weekend in Porto",
              ],
              [
                "“A simple way to share a place I care about, and get to know the people interested in it.”",
                "Sofia A.",
                "A host with a warm welcome",
              ],
            ].map(([q, n, s]) => (
              <div className="testimonial" key={n}>
                <Quote size={24} />
                <blockquote>{q}</blockquote>
                <div className="testimonial-person">
                  <span className="avatar">{n[0]}</span>
                  <div>
                    <strong>{n}</strong>
                    <small>{s}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="safety-strip">
          <ShieldCheck size={28} />
          <div>
            <h3>Feel informed. Stay in control.</h3>
            <p>
              Visit before paying, check agreements, and report anything that
              doesn’t feel right.
            </p>
          </div>
          <Link className="text-link" to="/safety">
            A few ways to stay safe <ArrowRight size={17} />
          </Link>
        </div>
        <div className="newsletter">
          <div>
            <span className="eyebrow">SOMETHING GOOD IS AROUND THE CORNER</span>
            <h2>Keep an eye on what’s next.</h2>
            <p>
              New places, local inspiration, and useful advice. In your inbox.
            </p>
          </div>
          <form onSubmit={subscribe}>
            <div>
              <input
                type="email"
                aria-label="Your email address"
                name="email"
                placeholder="Your email address"
                required
              />
              <button className="button blue" disabled={busy}>
                {busy ? "Joining…" : "Count me in"}
                <ArrowRight size={16} />
              </button>
            </div>
            <small>
              By subscribing, you agree to our{" "}
              <Link to="/privacy">Privacy Policy</Link>. Unsubscribe by
              contacting us.
            </small>
          </form>
        </div>
      </section>
    </>
  );
}
