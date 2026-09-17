import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Send,
  ShieldCheck,
  Search,
  ArrowLeft,
  Flag,
} from "lucide-react";
import { api, list } from "../services/api";
import { useAuth, useData } from "../context";
import { Loading, Empty, ErrorState, Modal } from "../components/ui";
import { ReportForm } from "./Details";
export default function Messages() {
  const { user, notify } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get("conversation")) || null;
  const [conversationPage, setConversationPage] = useState(1),
    [messagePage, setMessagePage] = useState(1);
  const conversations = useData(`conversations/?page=${conversationPage}`);
  const active = useData(selected ? `conversations/${selected}/` : null);
  const messages = useData(
    selected ? `messages/?conversation=${selected}&page=${messagePage}` : null,
  );
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [report, setReport] = useState(null);
  const end = useRef();
  useEffect(() => {
    const timer = setInterval(() => {
      conversations.reload();
      if (selected) {
        messages.reload();
        api("messages/mark-read/", {
          method: "POST",
          body: { conversation: selected },
        }).catch(() => {});
      }
    }, 7000);
    return () => clearInterval(timer);
  }, [selected, conversationPage, messagePage]);
  useEffect(() => {
    setMessagePage(1);
    if (selected)
      api("messages/mark-read/", {
        method: "POST",
        body: { conversation: selected },
      }).catch((e) => notify(e.message, true));
  }, [selected]);
  useEffect(
    () => end.current?.scrollIntoView({ block: "nearest" }),
    [messages.data?.results?.length],
  );
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api("messages/", {
        method: "POST",
        body: { conversation: selected, content: text.trim() },
      });
      setText("");
      const d = await api(`messages/?conversation=${selected}`);
      setMessagePage(Math.max(1, Math.ceil(d.count / 12)));
      messages.reload();
      conversations.reload();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  const c = active.data;
  const person = c ? (c.buyer.id === user.id ? c.owner : c.buyer) : null;
  return (
    <div className={`messages-page ${selected ? "has-active" : ""}`}>
      <aside className="conversation-panel">
        <div className="chat-title">
          <span className="eyebrow">GOOD CONVERSATIONS START HERE</span>
          <h1>Messages</h1>
        </div>
        <label className="conversation-search">
          <Search size={17} />
          <input
            aria-label="Search conversations"
            placeholder="Find a conversation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {conversations.loading && !conversations.data ? (
          <Loading />
        ) : conversations.error ? (
          <ErrorState
            message={conversations.error}
            retry={conversations.reload}
          />
        ) : list(conversations.data).length ? (
          list(conversations.data)
            .filter((c) =>
              (c.owner.name + c.buyer.name + c.property?.title)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((c) => {
              const person = c.buyer.id === user.id ? c.owner : c.buyer;
              return (
                <button
                  key={c.id}
                  className={`conversation ${selected === c.id ? "selected" : ""}`}
                  onClick={() => setParams({ conversation: c.id })}
                >
                  <span className="avatar">{person.name[0]}</span>
                  <span>
                    <strong>
                      {person.name}
                      {person.verified && <ShieldCheck size={13} />}
                    </strong>
                    <small>{c.property?.title || "Conversation"}</small>
                    <p>{c.latest_message?.content || "Start a conversation"}</p>
                  </span>
                  {c.unread > 0 && <b>{c.unread}</b>}
                </button>
              );
            })
        ) : (
          <div className="chat-empty">
            <MessageCircle size={28} />
            <p>Your conversations will appear here.</p>
            <Link className="text-link" to="/search">
              Find a place to talk about →
            </Link>
          </div>
        )}
        {conversations.data?.count > 12 && (
          <div className="pagination">
            <button
              disabled={!conversations.data.previous}
              onClick={() => setConversationPage((x) => x - 1)}
            >
              Previous
            </button>
            <button
              disabled={!conversations.data.next}
              onClick={() => setConversationPage((x) => x + 1)}
            >
              Next
            </button>
          </div>
        )}
        <div className="chat-safety">
          <ShieldCheck size={18} /> Keep payments and personal details safe.{" "}
          <Link to="/safety">Learn how</Link>
        </div>
      </aside>
      <section className="chat-panel">
        {!selected ? (
          <div className="chat-welcome">
            <span>
              <MessageCircle size={47} />
            </span>
            <h2>A conversation can open a door.</h2>
            <p>
              Ask a question, arrange a viewing, or get to know your host.
              <br />
              Select a conversation to begin.
            </p>
          </div>
        ) : active.loading && !c ? (
          <Loading />
        ) : active.error ? (
          <ErrorState message={active.error} />
        ) : (
          c && (
            <>
              <header className="chat-header">
                <button
                  className="icon-button chat-back"
                  aria-label="Back to conversations"
                  onClick={() => setParams({})}
                >
                  <ArrowLeft />
                </button>
                <span className="avatar">{person.name[0]}</span>
                <div>
                  <h3>
                    {person.name} {person.verified && <ShieldCheck size={15} />}
                  </h3>
                  <small>
                    <span className="presence-indicator" /> Messages refresh
                    every few seconds · live status unavailable
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Report user"
                  onClick={() => setReport({ reported_user: person.id })}
                >
                  <Flag size={16} />
                </button>
              </header>
              {c.property && (
                <Link
                  className="chat-property"
                  to={`/properties/${c.property.id}`}
                >
                  <img src={c.property.images[0]?.url} alt={c.property.title} />
                  <div>
                    <strong>{c.property.title}</strong>
                    <p>{c.property.location}</p>
                  </div>
                  <span>View place →</span>
                </Link>
              )}
              <div className="message-history">
                {messages.data?.count > 12 && (
                  <div className="pagination">
                    <button
                      className="button outline small"
                      disabled={!messages.data.previous}
                      onClick={() => setMessagePage((x) => x - 1)}
                    >
                      Earlier
                    </button>
                    <span>
                      {messagePage} / {Math.ceil(messages.data.count / 12)}
                    </span>
                    <button
                      className="button outline small"
                      disabled={!messages.data.next}
                      onClick={() => setMessagePage((x) => x + 1)}
                    >
                      Later
                    </button>
                  </div>
                )}
                {messages.error && <ErrorState message={messages.error} />}
                <div className="chat-date">
                  Your conversation stays private between you and this member.
                </div>
                {list(messages.data).map((m) => (
                  <div
                    className={`message ${m.sender === user.id ? "sent" : "received"}`}
                    key={m.id}
                  >
                    <p>{m.content}</p>
                    <span>
                      {new Date(m.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.sender === user.id ? (
                        m.is_read ? (
                          " · Read"
                        ) : (
                          " · Sent"
                        )
                      ) : (
                        <button
                          onClick={() => setReport({ message: m.id })}
                          aria-label="Report message"
                        >
                          <Flag size={11} />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                <div ref={end} />
              </div>
              <form className="message-composer" onSubmit={send}>
                <input
                  aria-label="Message"
                  placeholder="A hello is a good place to start…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength="5000"
                  required
                />
                <button
                  className="button blue"
                  disabled={busy || !text.trim()}
                  aria-label="Send message"
                >
                  <Send size={20} />
                  <span>Send</span>
                </button>
              </form>
            </>
          )
        )}
      </section>
      {report && (
        <Modal title="Report a concern" onClose={() => setReport(null)}>
          <ReportForm target={report} onDone={() => setReport(null)} />
        </Modal>
      )}
    </div>
  );
}
