import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  MessageCircle,
  HeartHandshake,
  ArrowRight,
  Check,
  House,
} from "lucide-react";
import { api } from "../services/api";
import { ActionForm, Field, formObject } from "../components/ui";
const content = {
  "/terms": {
    eyebrow: "THE DETAILS THAT KEEP US CONNECTED",
    title: "Terms & conditions",
    intro:
      "Clear expectations help make Haven a better place for everyone. These platform terms apply when you create an account, publish a listing, contact a member, or reserve a stay.",
    sections: [
      [
        "Using Haven",
        "You must be at least 18 to publish a listing or make a reservation. Provide accurate account information and keep your sign-in details secure. You are responsible for activity carried out through your account. Contact us promptly if you believe your account has been compromised.",
      ],
      [
        "Listings and identity",
        "Publish only properties you own or are authorised to offer. Information, pricing, availability, and photos must be accurate. Identity verification is required before publishing. Identity review is a trust measure; it is not a guarantee of ownership, property condition, safety, or future conduct.",
      ],
      [
        "Prohibited conduct",
        "Fake listings, fraud, identity fraud, scams, stolen property listings, misleading photos, fake hotels, harassment, illegal activity, and payment fraud are prohibited. Do not impersonate others, upload stolen documents, misuse private information, or request suspicious payments.",
      ],
      [
        "Reservations and transactions",
        "A confirmed room reservation records the dates, room, guests, and price shown at confirmation. Haven does not collect payments in this version. Confirm payment, deposits, taxes, check-in requirements, and cancellation terms directly with the provider before committing. Buying or renting a property requires a separate agreement with its owner.",
      ],
      [
        "Your responsibilities",
        "Check properties, ownership or authority, contracts, payment conditions, and local laws before entering a transaction. Inspect in person when possible and seek suitable independent advice where needed. Accommodation availability is not guaranteed.",
      ],
      [
        "Moderation and enforcement",
        "We may review reported activity and take proportionate action, including listing removal, account suspension, or account termination. Where appropriate and lawful, this may include evidence preservation, cooperation with legally valid investigations, reporting suspected criminal activity to relevant authorities, and other lawful action permitted under applicable regulations. Contact us if you believe a moderation decision is incorrect.",
      ],
      [
        "Privacy and communication",
        "Use internal messaging responsibly. Do not harass members, share someone else’s sensitive information, or send unsolicited commercial messages. Our Privacy Policy describes how account, identity, booking, and messaging information is handled.",
      ],
      [
        "Changes and questions",
        "Material changes to these terms will be communicated through the platform. Contact the Haven team through the contact form with questions or concerns. Mandatory rights and protections that apply to you remain unaffected.",
      ],
    ],
  },
  "/privacy": {
    eyebrow: "YOUR INFORMATION DESERVES CARE",
    title: "Privacy policy",
    intro:
      "This policy explains the information used to run your Haven account and the choices available to you.",
    sections: [
      [
        "Account information",
        "We store your name, email, phone number, profile details, and acceptance of the platform terms to provide account access and help you communicate with owners. Passwords are hashed using Django authentication and are never returned through the API.",
      ],
      [
        "Sensitive identity documents",
        "When you request verification, we collect your legal name, date of birth, document number, address, country, identity images, and selfie. These are sensitive records used for manual identity review. Documents are stored separately from public listing photos and are accessible only through protected administrator requests. They are never published on your profile or listing.",
      ],
      [
        "Listings, messages, and bookings",
        "Listing information and your public name and verification badge can be shown to other members. Your email, private profile details, and identity documents are not included in public listing responses. Your phone number is shown to signed-in members only when you choose a phone contact option. Conversations are available to their participants and authorised administrators. Booking and viewing information is shared with the relevant provider.",
      ],
      [
        "Cookies and device preferences",
        "Haven uses essential session and CSRF cookies to keep sign-in and forms working. Recent searches and recently viewed listing names may be stored locally in your browser. Clearing browser site data removes these device-local records. No advertising tracker is installed by this application.",
      ],
      [
        "Photography and external services",
        "Illustrative listing photography is loaded from Unsplash and fonts from Google Fonts. Your browser connects to those services and their own privacy terms apply. External map links open Google Maps only when you choose them.",
      ],
      [
        "Access, correction, and deletion requests",
        "You can edit profile information in account settings. Use the contact form to request access, correction, account closure, deletion, or withdrawal from newsletter messages. Requests are handled manually, subject to identity checks and any applicable record-retention obligations.",
      ],
      [
        "Retention and security",
        "Information is retained for the purposes described here while needed for account operation, bookings, safety review, and applicable legal requirements. Administrators must review retention regularly and remove records no longer needed; automatic retention is not implemented in this version. Access controls and validated uploads protect private files. No online service can promise absolute security.",
      ],
      [
        "Questions",
        "Use the contact form for privacy questions and requests. This platform is a development installation until an operator supplies its service contact details and deployment-specific policies. Do not submit real identity documents to a demonstration installation.",
      ],
    ],
  },
  "/safety": {
    eyebrow: "A LITTLE KNOWLEDGE. MORE CONFIDENCE.",
    title: "Feel informed. Stay in control.",
    intro:
      "Finding a place should feel exciting. A few simple checks can help you make better decisions.",
    sections: [
      [
        "See the place before sending money",
        "Never send money before verifying a property and the person offering it. Inspect in person where possible. If that is not possible, request a live video viewing and independent confirmation.",
      ],
      [
        "Check the agreement",
        "Use written agreements. Read payment schedules, deposits, cancellation rules, and the conditions for moving in or checking out. Keep copies of the agreement and communications.",
      ],
      [
        "Understand verification",
        "A verified badge means an administrator has reviewed an identity submission. It does not guarantee legal ownership, property quality, safety, or the outcome of a transaction. Check the listing and the provider’s authority for yourself.",
      ],
      [
        "Watch for pressure and unusual payment requests",
        "Be cautious of urgent deadlines, prices that seem implausibly low, requests to leave the platform, and payments by gift cards or untraceable methods. Do not share passwords, banking codes, or unnecessary personal information.",
      ],
      [
        "Keep conversations here",
        "Internal messaging gives you a record of what was discussed. Only share personal information when it is needed and you understand who will receive it.",
      ],
      [
        "Report what does not feel right",
        "Use Report Listing, Report User, or Report Message to flag scams, fake identities, harassment, and other concerns. The team reviews reports. If you are in immediate danger, contact your local emergency or social services. Haven is not an emergency service.",
      ],
    ],
  },
};
export function Information() {
  const data = content[useLocation().pathname];
  return (
    <article className="narrow-page legal-page">
      <span className="eyebrow">{data.eyebrow}</span>
      <h1>{data.title}</h1>
      <p className="intro-text">{data.intro}</p>
      {data.sections.map(([title, text], i) => (
        <section key={title}>
          <span className="section-number">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        </section>
      ))}
      <div className="privacy-note">
        <MessageCircle size={25} />
        <div>
          <h3>Let’s talk.</h3>
          <p>
            Have a question or need help?{" "}
            <Link to="/contact">Contact the Haven team →</Link>
          </p>
        </div>
      </div>
    </article>
  );
}
export function About() {
  return (
    <>
      <section className="about-hero">
        <div className="container">
          <span className="eyebrow">MORE THAN A PLACE TO STAY</span>
          <h1>
            Everyone deserves
            <br />a place to <em>begin.</em>
          </h1>
          <p>
            We believe finding a safe place to live should be simple,
            <br />
            transparent, and accessible.
          </p>
        </div>
      </section>
      <section className="section about-story">
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=85"
          alt="A comfortable, light-filled home"
        />
        <div>
          <span className="eyebrow">OUR REASON FOR BEING</span>
          <h2>A new address can change everything.</h2>
          <p>
            A first home. A room in a new city. Somewhere to land while you
            figure things out. We bring homes, rooms, and hotels together, so
            you can focus on what comes next.
          </p>
          <p>
            Haven gives people clear listing details, identity-reviewed owners,
            private conversations, and a straightforward way to reserve a stay.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="steps">
          {[
            [
              ShieldCheck,
              "Trust through transparency",
              "Know who you’re speaking with, compare clear details, and report concerns.",
            ],
            [
              HeartHandshake,
              "A place for more people",
              "Explore rooms and temporary stays alongside homes for sale and long-term rent.",
            ],
            [
              MessageCircle,
              "Human connection",
              "Ask the questions that matter and keep your conversations in one place.",
            ],
          ].map(([Icon, t, p]) => (
            <div key={t}>
              <span className="step-icon">
                <Icon />
              </span>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
        <div className="center">
          <Link to="/search" className="button blue">
            Find your next chapter <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
export function Contact() {
  const [done, setDone] = useState(false);
  return (
    <div className="container contact-page">
      <div>
        <span className="eyebrow">A HELLO IS A GOOD PLACE TO START</span>
        <h1>
          Let’s find
          <br />a way forward.
        </h1>
        <p>
          Questions about Haven, a listing, or your account?
          <br />
          Send us a note and we’ll keep it with our support requests.
        </p>
        <div className="contact-item">
          <MessageCircle />
          <div>
            <h3>Tell us what you need</h3>
            <p>Include the listing or booking number when relevant.</p>
          </div>
        </div>
        <div className="contact-item">
          <ShieldCheck />
          <div>
            <h3>Something doesn’t feel right?</h3>
            <p>
              Use the report button on a listing or message for a safety review.
            </p>
          </div>
        </div>
        <div className="privacy-note">
          <p>
            Please don’t include passwords, payment card details, or identity
            documents in this form.
          </p>
        </div>
      </div>
      <div className="panel">
        {done ? (
          <div className="success-message">
            <Check size={42} />
            <h2>Your message is with us.</h2>
            <p>
              Thank you for getting in touch. Your request has been saved for
              the Haven team.
            </p>
            <button className="button outline" onClick={() => setDone(false)}>
              Send another message
            </button>
          </div>
        ) : (
          <ActionForm
            submit="Send your message"
            onSubmit={async (fd) => {
              await api("contact/", { method: "POST", body: formObject(fd) });
              setDone(true);
            }}
          >
            <h2>How can we help?</h2>
            <Field label="Your name" name="name" maxLength="100" required />
            <Field label="Email address" name="email" type="email" required />
            <Field label="Subject" name="subject" maxLength="200" required />
            <Field
              label="Your message"
              name="message"
              type="textarea"
              maxLength="5000"
              required
            />
          </ActionForm>
        )}
      </div>
    </div>
  );
}
export function Careers() {
  return (
    <div className="narrow-page">
      <span className="eyebrow">BUILD A PLACE FOR MORE PEOPLE</span>
      <h1>Good things start with good people.</h1>
      <p>
        We don’t have open roles listed at the moment. If you care about housing
        access, thoughtful design, or helping people feel at home, we’d like to
        hear from you.
      </p>
      <Link className="button blue" to="/contact">
        Introduce yourself <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function ReportPage() {
  return (
    <div className="narrow-page">
      <span className="eyebrow">HELP KEEP HAVEN SAFE</span>
      <h1>Tell us what concerns you.</h1>
      <p>
        Use the Report button on the relevant listing, owner, or chat message so
        the team can review the right information. For a general concern,
        contact the team below.
      </p>
      <div className="two-actions">
        <Link className="button blue" to="/search">
          Find the listing
        </Link>
        <Link className="button outline" to="/contact">
          Contact the team
        </Link>
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="not-found">
      <span>404</span>
      <House size={45} />
      <h1>Looks like this address doesn’t exist.</h1>
      <p>Let’s get you somewhere that feels a little more like home.</p>
      <div className="two-actions">
        <Link className="button blue" to="/">
          Back home
        </Link>
        <Link className="button outline" to="/search">
          Search properties
        </Link>
      </div>
    </div>
  );
}
