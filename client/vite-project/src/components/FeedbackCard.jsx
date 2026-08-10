function FeedbackCard({ name, rating, feedback }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>Rating: {rating}/5</p>
      <p>{feedback}</p>
    </div>
  );
}

export default FeedbackCard;
