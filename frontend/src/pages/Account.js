import React, { useState } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ShieldCheck,
  House,
  ArrowRight,
  Check,
  LockKeyhole,
  Upload,
  Clock3,
} from "lucide-react";
import { useAuth, useData } from "../context";
import { api, list } from "../services/api";
import {
  ActionForm,
  Field,
  formObject,
  Loading,
  ErrorState,
  Empty,
} from "../components/ui";

export function AuthPage() {
  const { setUser, notify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { uid, token } = useParams();
  const register = location.pathname === "/register",
    forgot = location.pathname === "/forgot-password",
    reset = !!uid;
  const [success, setSuccess] = useState("");
  const title = register
    ? "A new chapter starts here."
    : forgot
      ? "Let’s get you back home."
      : reset
        ? "A fresh start for your password."
        : "Welcome home.";
  async function submit(fd) {
    const values = formObject(fd);
    if (register) values.accept_terms = fd.get("accept_terms") === "on";
    let action = register
      ? "register"
      : forgot
        ? "forgot-password"
        : reset
          ? "reset-password"
          : "login";
    const data = await api(`auth/${action}/`, {
      method: "POST",
      body: { ...values, ...(reset ? { uid, token } : {}) },
    });
    if (forgot || reset) {
      setSuccess(data.detail);
      return;
    }
    setUser(data.user);
    notify(
      register
        ? "Welcome to Haven. Make yourself at home."
        : "Good to see you again.",
    );
    const next = new URLSearchParams(location.search).get("next");
    navigate(
      next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
    );
  }
  return (
    <div className="auth-page">
      <div className="auth-photo">
        <div>
          <span className="eyebrow light">A PLACE FOR EVERY CHAPTER</span>
          <h2>
            A little space.
            <br />A whole lot of
            <br />
            possibility.
          </h2>
          <p>
            Your next home, your next stay,
            <br />
            your next beginning.
          </p>
          <span className="auth-trust">
            <ShieldCheck size={20} /> Thoughtfully connected. Simply Haven.
          </span>
        </div>
      </div>
      <div className="auth-form">
        <Link className="back-link" to="/">
          ← Back to Haven
        </Link>
        <span className="eyebrow">
          {register ? "MAKE YOURSELF AT HOME" : "YOUR HAVEN ACCOUNT"}
        </span>
        <h1>{title}</h1>
        <p>
          {register
            ? "Save your favourites, connect with owners, and find your next place."
            : forgot
              ? "Enter your account email and we’ll send a reset link."
              : reset
                ? "Choose a strong password you haven’t used before."
                : "Sign in to pick up where you left off."}
        </p>
        {success ? (
          <div className="success-box">
            <Check size={24} />
            <p>{success}</p>
            <Link to="/login">Back to sign in →</Link>
          </div>
        ) : (
          <ActionForm
            onSubmit={submit}
            submit={
              register
                ? "Create your account"
                : forgot
                  ? "Send reset link"
                  : reset
                    ? "Reset password"
                    : "Sign in"
            }
          >
            {register && (
              <div className="two-fields">
                <Field
                  label="First name"
                  name="first_name"
                  autoComplete="given-name"
                  maxLength="150"
                  required
                />
                <Field
                  label="Last name"
                  name="last_name"
                  autoComplete="family-name"
                  maxLength="150"
                  required
                />
              </div>
            )}
            {!reset && (
              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            )}
            {register && (
              <Field
                label="Phone number"
                name="phone"
                type="tel"
                autoComplete="tel"
                minLength="6"
                maxLength="32"
                required
              />
            )}
            {!forgot && (
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete={
                  register || reset ? "new-password" : "current-password"
                }
                minLength={register || reset ? 8 : undefined}
                required
              />
            )}
            {(register || reset) && (
              <Field
                label="Confirm password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength="8"
                required
              />
            )}
            {register && (
              <label className="terms-check">
                <input type="checkbox" name="accept_terms" required />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/terms">Terms & Conditions</Link> and{" "}
                  <Link to="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            )}
            {!register && !forgot && !reset && (
              <Link className="text-link" to="/forgot-password">
                Forgot your password?
              </Link>
            )}
          </ActionForm>
        )}
        <p className="auth-switch">
          {register ? "Already feel at home here?" : "New around here?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <span className="auth-secure">
          <LockKeyhole size={13} /> Your password stays private.
        </span>
      </div>
    </div>
  );
}
export function Verification() {
  const { user, refresh, notify } = useAuth();
  const resource = useData("verification/");
  const status = user.profile.verification_status;
  return (
    <div className="narrow-page">
      <span className="eyebrow">TRUST STARTS WITH YOU</span>
      <h1>A real person behind every place.</h1>
      <p>
        Verify your identity to publish homes, rooms, and hotels on Haven. Our
        team reviews every submission.
      </p>
      <div className={`verification-status ${status}`}>
        <ShieldCheck size={30} />
        <div>
          <strong>
            {
              {
                not_submitted: "Let’s get to know you",
                pending: "Your documents are being reviewed",
                verified: "Your identity is verified",
                rejected: "Your submission needs another look",
              }[status]
            }
          </strong>
          <p>
            {status === "verified"
              ? "You’re ready to share your place with the world."
              : status === "pending"
                ? "We’ll notify you when an administrator has reviewed your submission."
                : "Use clear images of your own valid identity document."}
          </p>
        </div>
      </div>
      {status === "verified" ? (
        <Link className="button blue" to="/list-property">
          List your property <ArrowRight size={17} />
        </Link>
      ) : status === "pending" ? (
        <Link to="/dashboard" className="button outline">
          Back to your dashboard
        </Link>
      ) : (
        <>
          {list(resource.data)[0]?.review_note && (
            <div className="error-box">
              Review note: {list(resource.data)[0].review_note}
            </div>
          )}
          <ActionForm
            submit="Submit for review"
            onSubmit={async (fd) => {
              await api("verification/", { method: "POST", body: fd });
              await refresh();
              resource.reload();
              notify("Your documents have been submitted for manual review.");
            }}
          >
            <h3>Your legal details</h3>
            <Field
              label="Full legal name"
              name="legal_name"
              maxLength="160"
              required
            />
            <div className="two-fields">
              <Field
                label="Date of birth"
                name="date_of_birth"
                type="date"
                required
              />
              <Field label="Country" name="country" maxLength="80" required />
            </div>
            <Field
              label="Home address"
              name="address"
              maxLength="300"
              required
            />
            <div className="two-fields">
              <Field
                label="Document type"
                name="document_type"
                options={[
                  { value: "national_id", label: "National identity card" },
                  { value: "passport", label: "Passport" },
                ]}
              />
              <Field
                label="Document number"
                name="document_number"
                maxLength="80"
                required
              />
            </div>
            <h3>Upload clear, readable images</h3>
            <p className="small-text">
              JPG, PNG, or WebP. Maximum 5 MB per file. Both sides are required
              for national ID cards.
            </p>
            <Field
              label="Document front / passport photo page"
              name="document_front"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <Field
              label="Document back (required for national ID)"
              name="document_back"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <Field
              label="A clear selfie"
              name="selfie"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <div className="privacy-note">
              <LockKeyhole size={23} />
              <p>
                Your identity documents are private. Only authorised
                administrators can access them. They will never appear on your
                listing or profile.
              </p>
            </div>
          </ActionForm>
        </>
      )}
    </div>
  );
}
export function ProfilePage() {
  const { user, refresh, notify } = useAuth();
  return (
    <div className="narrow-page">
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h1>Your account</h1>
      <p>Keep your details up to date.</p>
      <ActionForm
        onSubmit={async (fd) => {
          const d = formObject(fd);
          await api("profile/", {
            method: "PATCH",
            body: {
              first_name: d.first_name,
              last_name: d.last_name,
              profile: {
                phone: d.phone,
                bio: d.bio,
                address: d.address,
                country: d.country,
              },
            },
          });
          await refresh();
          notify("Your profile has been updated.");
        }}
      >
        <div className="two-fields">
          <Field
            label="First name"
            name="first_name"
            defaultValue={user.first_name}
            required
          />
          <Field
            label="Last name"
            name="last_name"
            defaultValue={user.last_name}
            required
          />
        </div>
        <Field label="Email address" type="email" value={user.email} disabled />
        <Field
          label="Phone"
          name="phone"
          defaultValue={user.profile.phone}
          maxLength="32"
        />
        <Field
          label="About you"
          name="bio"
          type="textarea"
          defaultValue={user.profile.bio}
          maxLength="2000"
        />
        <Field
          label="Address"
          name="address"
          defaultValue={user.profile.address}
        />
        <Field
          label="Country"
          name="country"
          defaultValue={user.profile.country}
        />
      </ActionForm>
      <hr />
      <h2>Change your password</h2>
      <ActionForm
        submit="Update password"
        onSubmit={async (fd, form) => {
          await api("profile/", { method: "POST", body: formObject(fd) });
          notify("Your password has been changed.");
          form.reset();
        }}
      >
        <Field
          label="Current password"
          name="old_password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength="8"
          required
        />
        <Field
          label="Confirm new password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength="8"
          required
        />
      </ActionForm>
    </div>
  );
}
export function ListProperty() {
  const { user, notify } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const resource = useData(id ? `properties/${id}/?mine=1` : null);
  const [created, setCreated] = useState(null);
  if (user.profile.verification_status !== "verified")
    return (
      <div className="narrow-page">
        <div className="verification-status">
          <ShieldCheck size={35} />
          <div>
            <h2>A little trust goes a long way.</h2>
            <p>
              Identity verification is required before publishing a listing.
            </p>
          </div>
        </div>
        <Link className="button blue" to="/verification">
          Verify account <ArrowRight size={17} />
        </Link>
      </div>
    );
  if (id && resource.loading) return <Loading />;
  if (resource.error) return <ErrorState message={resource.error} />;
  const p = resource.data || {};
  return (
    <div className="narrow-page">
      <span className="eyebrow">SHARE A PLACE. START A CHAPTER.</span>
      <h1>
        {id ? "Make your listing shine." : "Someone’s next home starts here."}
      </h1>
      <p>
        Clear details and real photos help people picture life in your place.
      </p>
      <ActionForm
        key={id || "new"}
        submit={
          id
            ? "Save listing"
            : created
              ? "Retry photo upload"
              : "Publish your listing"
        }
        onSubmit={async (fd) => {
          const values = formObject(fd);
          delete values.images;
          values.furnished = fd.get("furnished") === "on";
          values.parking = fd.get("parking") === "on";
          values.amenities = values.amenities
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          const files = fd.getAll("images").filter((f) => f.size);
          if (files.some((f) => f.size > 5 * 1024 * 1024))
            throw new Error("Each image must be 5 MB or smaller.");
          if (!id && !created && !files.length)
            throw new Error("Add at least one photo.");
          const saved =
            created ||
            (await api(id ? `properties/${id}/` : "properties/", {
              method: id ? "PATCH" : "POST",
              body: values,
            }));
          setCreated(saved);
          if (files.length) {
            const photos = new FormData();
            files.forEach((f) => photos.append("images", f));
            try {
              await api(`properties/${saved.id}/images/`, {
                method: "POST",
                body: photos,
              });
            } catch (e) {
              throw new Error(
                `Your listing was saved. Photos could not upload: ${e.message} Submit again to retry the photos.`,
              );
            }
          }
          notify(id ? "Listing updated." : "Your listing is live.");
          navigate("/dashboard/listings");
        }}
      >
        <h3>The essentials</h3>
        <Field
          label="Listing title"
          name="title"
          maxLength="160"
          defaultValue={p.title}
          required
        />
        <Field
          label="Description"
          name="description"
          type="textarea"
          maxLength="10000"
          defaultValue={p.description}
          required
        />
        <div className="two-fields">
          <Field
            label="Property type"
            name="category"
            defaultValue={p.category || "House"}
            options={[
              "House",
              "Apartment",
              "Villa",
              "Studio",
              "Room",
              "Shared Room",
              "Hotel",
              "Guest House",
            ]}
          />
          <Field
            label="Transaction"
            name="transaction_type"
            defaultValue={p.transaction_type || "sale"}
            options={[
              { value: "sale", label: "For sale" },
              { value: "rent", label: "Long-term rent" },
              { value: "short_term", label: "Short-term rent" },
              { value: "hotel", label: "Hotel booking" },
            ]}
          />
        </div>
        <Field
          label="Price in USD (sale total / monthly rent / nightly stay)"
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={p.price}
          required
        />
        <div className="two-fields">
          <Field
            label="City and country"
            name="location"
            defaultValue={p.location}
            required
          />
          <Field
            label="Full address"
            name="address"
            defaultValue={p.address}
            required
          />
        </div>
        <div className="three-fields">
          <Field
            label="Bedrooms"
            name="bedrooms"
            type="number"
            min="0"
            max="50"
            defaultValue={p.bedrooms ?? 1}
            required
          />
          <Field
            label="Bathrooms"
            name="bathrooms"
            type="number"
            min="0"
            max="50"
            defaultValue={p.bathrooms ?? 1}
            required
          />
          <Field
            label="Area (m²)"
            name="area"
            type="number"
            min="1"
            defaultValue={p.area || ""}
            required
          />
        </div>
        <div className="two-fields">
          <Field
            label="Furnished"
            name="furnished"
            type="checkbox"
            defaultChecked={p.furnished}
          />
          <Field
            label="Parking available"
            name="parking"
            type="checkbox"
            defaultChecked={p.parking}
          />
        </div>
        <Field
          label="Amenities (separate with commas)"
          name="amenities"
          defaultValue={p.amenities?.join(", ") || ""}
          placeholder="Wi-Fi, Air conditioning, Balcony"
        />
        <div className="two-fields">
          <Field
            label="Availability"
            name="availability"
            defaultValue={p.availability || "available"}
            options={["available", "reserved", "rented", "sold"]}
          />
          <Field
            label="Contact preference"
            name="contact_preference"
            defaultValue={p.contact_preference || "message"}
            options={[
              { value: "message", label: "Messages only" },
              { value: "phone", label: "Phone" },
              { value: "both", label: "Phone and messages" },
            ]}
          />
        </div>
        <Field
          label="Property photos — up to 12 JPG, PNG, or WebP images (5 MB each)"
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required={!id && !created}
        />
        <p className="small-text">
          Use photos you own or have permission to use. For hotels, add
          individually bookable rooms from My Listings after publishing.
        </p>
      </ActionForm>
    </div>
  );
}
