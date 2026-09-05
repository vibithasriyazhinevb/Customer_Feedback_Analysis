const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Feedback = require("./models/Feedback");

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Home route
app.get("/", (req, res) => {
  res.send("Customer Feedback API is running");
});

// WRITE - Create feedback
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email and message are required"
      });
    }

    // Create feedback in MongoDB
    const feedback = await Feedback.create(req.body);

    res.status(201).json({
      message: "Feedback created successfully",
      feedback
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to create feedback",
      error: error.message
    });
  }
});

// READ - Get all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message
    });
  }
});

// READ - Get feedback by ID
app.get("/api/feedback/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    res.status(200).json(feedback);
  } catch (error) {
    res.status(400).json({
      message: "Invalid feedback ID",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// UPDATE - Update feedback
app.put("/api/feedback/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    res.status(200).json({
      message: "Feedback updated successfully",
      feedback
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update feedback",
      error: error.message
    });
  }
});