function FeedbackCard({
  id,
  name,
  email,
  rating,
  message,
  onUpdate,
  onDelete,
}) {
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
      name,
      email,
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
      <h2>{name}</h2>

      <p>Email: {email}</p>

      <p>Rating: {rating}/5</p>

      <p>{message}</p>

      <button onClick={handleUpdate}>
        Edit
      </button>

      <button onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
}

export default FeedbackCard;