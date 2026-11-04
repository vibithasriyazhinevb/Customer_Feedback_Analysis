import { useState } from "react";

const API_URL =
  import.meta?.env?.VITE_API_URL ||
  (import.meta?.env?.PROD ? "" : "http://localhost:5000");

function FeedbackCard({ feedback, onUpdate, onDelete }) {
  const { _id: id, customerName, customer, rating, message, attachment } = feedback;
  const name = customerName || customer?.name || "Anonymous customer";
  const email = customer?.email || feedback.email || "No email provided";
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: name,
    rating: String(rating),
    message,
  });

  const handleEditChange = (event) => {
    setEditForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const saved = await onUpdate(id, {
        ...editForm,
        rating: Number(editForm.rating),
      });
      if (saved) setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      onDelete(id);
    }
  };

  const date = feedback.createdAt
    ? new Date(feedback.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : null;

  return (
    <article className="feedback-card">
      <div className="card-topline">
        <div><h3>{name}</h3><p className="email">{email}</p></div>
        <div className="card-meta">
          <span className="rating" aria-label={`${rating} out of 5 stars`}>{rating}/5 <span aria-hidden="true">★</span></span>
          {date && <time className="feedback-date" dateTime={feedback.createdAt}>{date}</time>}
        </div>
      </div>
      {isEditing ? (
        <form className="edit-form" onSubmit={handleUpdate}>
          <label>Name<input name="customerName" value={editForm.customerName} onChange={handleEditChange} required /></label>
          <label>Rating
            <select name="rating" value={editForm.rating} onChange={handleEditChange}>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
            </select>
          </label>
          <label>Feedback<textarea name="message" value={editForm.message} onChange={handleEditChange} rows="3" required /></label>
          <div className="edit-actions">
            <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      ) : (
        <>
          <p className="message">{message}</p>
          {attachment?.filePath && (
            <a className="attachment" href={`${API_URL}${attachment.filePath}`} target="_blank" rel="noopener noreferrer">
              ↗ View attachment: {attachment.fileName}
            </a>
          )}
          <div className="card-actions">
            <button type="button" onClick={() => setIsEditing(true)}>Edit</button>
            <button type="button" className="danger" onClick={handleDelete}>Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

export default FeedbackCard;
