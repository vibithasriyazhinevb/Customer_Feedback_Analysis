import { useEffect, useState } from "react";
import Header from "./components/Header";
import FeedbackCard from "./components/FeedbackCard";
import Button from "./components/Button";
import "./App.css";

function App() {
  const [feedbacks, setFeedbacks] = useState([]);

  // Get feedback from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/feedback")
      .then((response) => response.json())
      .then((data) => {
        setFeedbacks(data);
      })
      .catch((error) => {
        console.error("Error fetching feedback:", error);
      });
  }, []);

  // Update feedback
  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/feedback/${id}`,
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

      alert("Feedback updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      alert("Unable to update feedback");
    }
  };

  // Delete feedback
  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/feedback/${id}`,
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

      alert("Feedback deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Unable to delete feedback");
    }
  };

  return (
    <div className="app">
      <Header />

      <main>
        <h1>Customer Feedback</h1>

        {feedbacks.length === 0 ? (
          <p>No feedback available.</p>
        ) : (
          feedbacks.map((feedback) => (
            <FeedbackCard
              key={feedback._id}
              id={feedback._id}
              name={feedback.name}
              email={feedback.email}
              rating={feedback.rating}
              message={feedback.message}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}

        <Button text="Submit Feedback" />
      </main>
    </div>
  );
}

export default App;