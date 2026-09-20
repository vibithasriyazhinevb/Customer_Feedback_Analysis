const API_URL = "http://localhost:5000";

function FeedbackCard({ feedback, onUpdate, onDelete }) {
  const { _id: id, customerName, customer, rating, message, attachment } = feedback;
  const name = customerName || customer?.name || "Anonymous customer";
  const email = customer?.email || "No email provided";
  const handleUpdate = () => {
    const newMessage = prompt(
      "Enter updated feedback:",
      message
    );

    if (newMessage === null || newMessage.trim() === "") {
      return;
    }

    const newRating = prompt(
      "Enter updated rating (1-5):",
      rating
    );

    if (newRating === null) {
      return;
    }

    const ratingNumber = Number(newRating);

    if (ratingNumber < 1 || ratingNumber > 5) {
      alert("Rating must be between 1 and 5");
      return;
    }

    onUpdate(id, {
      customerName: name,
      rating: ratingNumber,
      message: newMessage,
    });
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this feedback?"
    );

    if (confirmDelete) {
      onDelete(id);
    }
  };

  return (
    <div className="feedback-card">
      <div className="card-topline"><div><h3>{name}</h3><p className="email">{email}</p></div><span className="rating">{rating}/5</span></div>
      <p className="message">{message}</p>
      {attachment?.filePath && <a className="attachment" href={`${API_URL}${attachment.filePath}`} target="_blank" rel="noreferrer">View attachment: {attachment.fileName}</a>}
      <div className="card-actions"><button onClick={handleUpdate}>Edit</button><button className="danger" onClick={handleDelete}>Delete</button></div>
    </div>
  );
}

export default FeedbackCard;