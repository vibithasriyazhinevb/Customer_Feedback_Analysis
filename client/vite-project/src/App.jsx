import { useEffect, useState } from "react";
import Header from "./components/Header";
import FeedbackCard from "./components/FeedbackCard";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ customerName: "", email: "", rating: "5", message: "" });
  const [attachment, setAttachment] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get feedback from backend
  useEffect(() => {
    fetch(`${API_URL}/api/feedback`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load feedback.");
        }
        return data;
      })
      .then((data) => {
        setFeedbacks(data);
      })
      .catch((error) => {
        console.error("Error fetching feedback:", error);
        setStatus({ type: "error", message: error.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Update feedback
  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await fetch(
        `${API_URL}/api/feedback/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Update failed");
        return;
      }

      setFeedbacks((currentFeedbacks) =>
        currentFeedbacks.map((feedback) =>
          feedback._id === id ? data.feedback : feedback
        )
      );

      setStatus({ type: "success", message: "Feedback updated successfully." });
    } catch (error) {
      console.error("Update error:", error);
      setStatus({ type: "error", message: "Unable to update feedback." });
    }
  };

  // Delete feedback
  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `${API_URL}/api/feedback/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Delete failed");
        return;
      }

      setFeedbacks((currentFeedbacks) =>
        currentFeedbacks.filter(
          (feedback) => feedback._id !== id
        )
      );

      setStatus({ type: "success", message: "Feedback deleted successfully." });
    } catch (error) {
      console.error("Delete error:", error);
      setStatus({ type: "error", message: "Unable to delete feedback." });
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (attachment) formData.append("attachment", attachment);

    try {
      const response = await fetch(`${API_URL}/api/feedback`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Submission failed");
      setFeedbacks((currentFeedbacks) => [data.feedback, ...currentFeedbacks]);
      setForm({ customerName: "", email: "", rating: "5", message: "" });
      setAttachment(null);
      event.target.reset();
      setStatus({ type: "success", message: "Thanks. Your feedback was submitted." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app">
      <Header />

      <main>
        <section className="intro">
          <p className="eyebrow">Voice of the customer</p>
          <h1>Customer feedback, made useful.</h1>
          <p>Collect thoughtful responses and keep the context attached.</p>
        </section>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div><p className="eyebrow">New response</p><h2>Share your experience</h2></div>
            <span className="required-note">All fields marked * are required</span>
          </div>
          <div className="field-grid">
            <label>Name *<input name="customerName" value={form.customerName} onChange={handleChange} required /></label>
            <label>Email *<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
            <label>Rating *<select name="rating" value={form.rating} onChange={handleChange}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
            <label className="wide-field">Message *<textarea name="message" value={form.message} onChange={handleChange} rows="4" required /></label>
            <label className="file-field wide-field">Attachment <span>(optional, image or PDF, max 5 MB)</span><input type="file" accept="image/*,.pdf" onChange={(event) => setAttachment(event.target.files[0] || null)} /></label>
          </div>
          <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit feedback"}</button>
          {status.message && <p className={`status ${status.type}`}>{status.message}</p>}
        </form>

        {isLoading ? (
          <p className="empty-state">Loading feedback...</p>
        ) : feedbacks.length === 0 ? (
          <p className="empty-state">No feedback yet. The first response will appear here.</p>
        ) : (
          <section className="feedback-list">
            <div className="list-heading"><h2>Recent responses</h2><span>{feedbacks.length} total</span></div>
            {feedbacks.map((feedback) => <FeedbackCard key={feedback._id} feedback={feedback} onUpdate={handleUpdate} onDelete={handleDelete} />)}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;