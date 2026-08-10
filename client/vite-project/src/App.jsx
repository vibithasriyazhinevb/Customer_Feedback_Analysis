import Header from "./components/Header";
import FeedbackCard from "./components/FeedbackCard";
import Button from "./components/Button";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Header />

      <main>
        <FeedbackCard
          name="John"
          rating="5"
          feedback="Excellent customer service!"
        />

        <FeedbackCard
          name="Priya"
          rating="4"
          feedback="Good experience and quick support."
        />

        <Button text="Submit Feedback" />
      </main>
    </div>
  );
}

export default App;