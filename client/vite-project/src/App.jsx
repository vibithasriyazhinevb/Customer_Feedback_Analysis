import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import AuthPage from "./components/AuthPage";
import FeedbackCard from "./components/FeedbackCard";
import FeedbackTrends from "./components/FeedbackTrends";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:5000");
const EMPTY_FORM = { customerName: "", email: "", rating: "5", message: "" };

async function readResponse(response, fallbackMessage) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok) throw new Error(data?.message || fallbackMessage);
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachment, setAttachment] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const fileInputRef = useRef(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("feedback-auth-token")}`,
  });

  useEffect(() => {
    const token = localStorage.getItem("feedback-auth-token");
    if (!token) {
      setIsCheckingSession(false);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() })
      .then((response) => readResponse(response, "Session expired. Please sign in again."))
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("feedback-auth-token"))
      .finally(() => setIsCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    fetch(`${API_URL}/api/feedback`, { headers: authHeaders() })
      .then((response) => readResponse(response, "Unable to load feedback."))
      .then(setFeedbacks)
      .catch((error) => {
        console.error("Error fetching feedback:", error);
        setStatus({ type: "error", message: error.message });
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const metrics = useMemo(() => {
    const average = feedbacks.length
      ? feedbacks.reduce((sum, item) => sum + Number(item.rating || 0), 0) / feedbacks.length
      : 0;
    const positiveCount = feedbacks.filter((item) => Number(item.rating) >= 4).length;
    const ratingCounts = feedbacks.reduce((counts, item) => {
      const rating = Number(item.rating);
      if (rating >= 1 && rating <= 5) counts[rating] += 1;
      return counts;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    return {
      total: feedbacks.length,
      average: average.toFixed(1),
      positiveRate: feedbacks.length ? Math.round((positiveCount / feedbacks.length) * 100) : 0,
      ratingCounts,
    };
  }, [feedbacks]);

  const visibleFeedbacks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return feedbacks
      .filter((feedback) => {
        const rating = Number(feedback.rating);
        const matchesRating = ratingFilter === "all"
          || ratingFilter === String(rating)
          || (ratingFilter === "positive" && rating >= 4)
          || (ratingFilter === "neutral" && rating === 3)
          || (ratingFilter === "negative" && rating <= 2);
        const searchableText = [
          feedback.customerName,
          feedback.customer?.name,
          feedback.customer?.email,
          feedback.message,
        ].filter(Boolean).join(" ").toLowerCase();
        return matchesRating && (!normalizedSearch || searchableText.includes(normalizedSearch));
      })
      .sort((a, b) => {
        if (sortBy === "highest") return Number(b.rating) - Number(a.rating);
        if (sortBy === "lowest") return Number(a.rating) - Number(b.rating);
        const dateDifference = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        return sortBy === "oldest" ? dateDifference : -dateDifference;
      });
  }, [feedbacks, ratingFilter, search, sortBy]);

  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/api/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(updatedData),
      });
      const data = await readResponse(response, "Unable to update feedback.");
      setFeedbacks((current) => current.map((item) => item._id === id ? data.feedback : item));
      setStatus({ type: "success", message: "Feedback updated successfully." });
      return true;
    } catch (error) {
      console.error("Update error:", error);
      setStatus({ type: "error", message: error.message });
      return false;
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/feedback/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await readResponse(response, "Unable to delete feedback.");
      setFeedbacks((current) => current.filter((item) => item._id !== id));
      setStatus({ type: "success", message: "Feedback deleted successfully." });
    } catch (error) {
      console.error("Delete error:", error);
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });
    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", message: "Attachments must be 5 MB or smaller." });
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (attachment) formData.append("attachment", attachment);

    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await readResponse(response, "Unable to submit feedback.");
      setFeedbacks((current) => [data.feedback, ...current]);
      setForm(EMPTY_FORM);
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStatus({ type: "success", message: "Thanks — your feedback is now part of the conversation." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Customer", "Email", "Rating", "Feedback", "Date"],
      ...visibleFeedbacks.map((item) => [
        item.customerName || item.customer?.name || "Anonymous customer",
        item.customer?.email || "",
        item.rating,
        item.message,
        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "customer-feedback.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("feedback-auth-token");
    setUser(null);
    setFeedbacks([]);
    setStatus({ type: "", message: "" });
  };

  if (isCheckingSession) {
    return <div className="session-screen"><span className="loading-mark" />Getting your workspace ready…</div>;
  }
  if (!user) return <div className="app"><AuthPage onAuthenticated={setUser} /></div>;

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />
      <main className="dashboard">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER VOICE, CLEARER</p>
            <h1>Every response is<br /><span>a chance to grow.</span></h1>
            <p className="hero-description">A thoughtful place to gather customer feedback, spot patterns, and make the next experience even better.</p>
            <a className="hero-link" href="#share-feedback">Share your experience <span aria-hidden="true">↓</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-card art-card-back"><span>★★★★★</span><i /></div>
            <div className="art-card art-card-front"><span className="art-quote">“</span><span className="art-stars">★★★★★</span><i /><i /><i className="short-line" /></div>
            <span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✦</span>
          </div>
          <div className="hero-note"><span className="note-icon">✳</span><span>Better listening starts<br />with one good question.</span></div>
        </section>

        <section className="stats-grid" aria-label="Feedback overview">
          <article className="stat-card stat-primary">
            <span className="stat-icon">↗</span>
            <p>Total responses</p>
            <strong>{metrics.total}</strong>
            <span className="stat-foot">Every voice, in one place</span>
          </article>
          <article className="stat-card">
            <span className="stat-icon stat-star">★</span>
            <p>Average rating</p>
            <strong>{metrics.average}<span className="stat-suffix"> / 5</span></strong>
            <span className="stat-foot">Across all responses</span>
          </article>
          <article className="stat-card">
            <span className="stat-icon stat-heart">♡</span>
            <p>Positive experiences</p>
            <strong>{metrics.positiveRate}<span className="stat-suffix">%</span></strong>
            <span className="stat-foot">Rated 4 stars or higher</span>
          </article>
        </section>

        <FeedbackTrends feedbacks={feedbacks} />

        <section className="rating-overview" aria-labelledby="rating-overview-heading">
          <div className="rating-overview-copy">
            <p className="section-kicker">A CLOSER LOOK</p>
            <h2 id="rating-overview-heading">The feeling behind the feedback.</h2>
            <p>See how each experience adds up. Select a rating to explore those responses.</p>
          </div>
          <div className="rating-breakdown" aria-label="Responses by star rating">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = metrics.ratingCounts[rating];
              const percentage = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <button
                  className={`rating-row${ratingFilter === String(rating) ? " selected" : ""}`}
                  type="button"
                  key={rating}
                  onClick={() => setRatingFilter(ratingFilter === String(rating) ? "all" : String(rating))}
                  aria-pressed={ratingFilter === String(rating)}
                  aria-label={`${rating} stars: ${count} responses, ${percentage} percent. ${ratingFilter === String(rating) ? "Clear rating filter" : "Filter by this rating"}`}
                >
                  <span className="rating-label">{rating} <span aria-hidden="true">★</span></span>
                  <span className="rating-track"><span className="rating-fill" style={{ width: `${percentage}%` }} /></span>
                  <span className="rating-count">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="rating-overview-foot">Based on {metrics.total} {metrics.total === 1 ? "response" : "responses"}</p>
        </section>

        <section className="workspace-grid">
          <form id="share-feedback" className="feedback-form" onSubmit={handleSubmit}>
            <div className="section-kicker"><span>01</span> YOUR VOICE MATTERS</div>
            <div className="form-heading">
              <h2>Tell us how<br />we did.</h2>
              <p>A few honest words can<br />make a real difference.</p>
            </div>
            <div className="field-grid">
              <label>Name <span className="required">*</span><input name="customerName" value={form.customerName} onChange={handleChange} autoComplete="name" placeholder="Your name" required /></label>
              <label>Email <span className="required">*</span><input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" required /></label>
              <label className="rating-field">Your rating <span className="required">*</span>
                <select name="rating" value={form.rating} onChange={handleChange}>
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? "star" : "stars"}</option>)}
                </select>
              </label>
              <label className="wide-field">Your feedback <span className="required">*</span><textarea name="message" value={form.message} onChange={handleChange} rows="4" placeholder="What stood out about your experience?" required /></label>
              <label className="file-field wide-field">Add an attachment <span className="optional">(optional · image or PDF, up to 5 MB)</span><input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={(event) => setAttachment(event.target.files[0] || null)} /></label>
            </div>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending your feedback…" : "Send feedback"} <span aria-hidden="true">→</span>
            </button>
            <p className="privacy-note"><span aria-hidden="true">⌑</span> Your feedback helps us do better, every day.</p>
            {status.message && <p className={`status ${status.type}`} role="status">{status.message}</p>}
          </form>

          <section className="feedback-list" aria-labelledby="responses-heading">
            <div className="section-kicker"><span>02</span> THE CONVERSATION</div>
            <div className="list-heading">
              <div><h2 id="responses-heading">Recent responses</h2><p>Real words from real people.</p></div>
              <button className="export-button" type="button" onClick={handleExport} disabled={!visibleFeedbacks.length}><span aria-hidden="true">↧</span> Export</button>
            </div>
            <div className="feedback-controls">
              <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search feedback" placeholder="Search responses…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <div className="control-row">
                <label className="filter-field"><span className="visually-hidden">Filter by rating</span>
                  <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
                    <option value="all">All ratings</option><option value="positive">Positive · 4–5</option><option value="neutral">Neutral · 3</option><option value="negative">Needs care · 1–2</option>
                    <option value="5">5 stars only</option><option value="4">4 stars only</option><option value="3">3 stars only</option><option value="2">2 stars only</option><option value="1">1 star only</option>
                  </select>
                </label>
                <label className="filter-field"><span className="visually-hidden">Sort feedback</span>
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
                  </select>
                </label>
              </div>
            </div>
            {status.message && <p className={`status response-status ${status.type}`} role="status">{status.message}</p>}
            {isLoading ? (
              <div className="empty-state"><span className="loading-mark" /><p>Gathering the latest responses…</p></div>
            ) : feedbacks.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">✳</span><h3>Your conversation starts here.</h3><p>When feedback comes in, you’ll find it all here.</p></div>
            ) : visibleFeedbacks.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">⌕</span><h3>No matching responses.</h3><p>Try a different search or rating filter.</p><button type="button" onClick={() => { setSearch(""); setRatingFilter("all"); }}>Clear filters</button></div>
            ) : (
              <div className="cards-list">
                <p className="results-count">Showing <strong>{visibleFeedbacks.length}</strong> of {feedbacks.length} responses</p>
                {visibleFeedbacks.map((feedback) => <FeedbackCard key={feedback._id} feedback={feedback} onUpdate={handleUpdate} onDelete={handleDelete} />)}
              </div>
            )}
          </section>
        </section>
        <footer className="dashboard-footer"><span>Made for better conversations.</span><span>Listen closely. Grow thoughtfully.</span></footer>
      </main>
    </div>
  );
}

export default App;
