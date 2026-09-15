const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const Feedback = require("./models/Feedback");
const Customer = require("./models/Customer");

const app = express();

app.use(cors());
app.use(express.json());

const uploadsDirectory = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-z0-9-_]/gi, "-");
    callback(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      return callback(null, true);
    }

    callback(new Error("Only image and PDF files are allowed"));
  },
});

app.use("/uploads", express.static(uploadsDirectory));

// MongoDB connection
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

// WRITE - Create feedback with Customer relationship
app.post("/api/feedback", upload.single("attachment"), async (req, res) => {
  try {
    const {
      customerName,
      name,
      email,
      rating,
      message
    } = req.body;

    // Support both customerName and name
    const finalCustomerName = customerName || name;

    // Validate required fields
    if (!finalCustomerName || !email || !rating || !message) {
      return res.status(400).json({
        message:
          "Customer name, email, rating and message are required"
      });
    }

    // Find existing customer or create a new customer
    let customer = await Customer.findOne({ email });

    if (!customer) {
      customer = await Customer.create({
        name: finalCustomerName,
        email
      });
    }

    // Create feedback and connect it to Customer
    const feedback = await Feedback.create({
      customer: customer._id,
      customerName: finalCustomerName,
      rating,
      message,
      attachment: req.file
        ? {
            fileName: req.file.originalname,
            filePath: `/uploads/${req.file.filename}`,
            fileType: req.file.mimetype,
          }
        : undefined,
    });

    // Return feedback with customer details
    const populatedFeedback = await Feedback.findById(
      feedback._id
    ).populate("customer");

    res.status(201).json({
      message: "Feedback created successfully",
      feedback: populatedFeedback
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to create feedback",
      error: error.message
    });
  }
});

// READ - Get all feedback with Customer relationship
app.get("/api/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message
    });
  }
});

// READ - Get feedback by ID with Customer
app.get("/api/feedback/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate("customer");

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

// READ - Get all feedback of a Customer
app.get("/api/customers/:customerId/feedback", async (req, res) => {
  try {
    const feedback = await Feedback.find({
      customer: req.params.customerId
    })
      .populate("customer")
      .sort({ createdAt: -1 });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(400).json({
      message: "Failed to fetch customer feedback",
      error: error.message
    });
  }
});

// UPDATE - Update feedback
app.put("/api/feedback/:id", async (req, res) => {
  try {
    const updateData = {};

    if (req.body.customerName || req.body.name) {
      updateData.customerName =
        req.body.customerName || req.body.name;
    }

    if (req.body.rating !== undefined) {
      updateData.rating = req.body.rating;
    }

    if (req.body.message) {
      updateData.message = req.body.message;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate("customer");

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

// DELETE - Delete feedback
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(
      req.params.id
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found"
      });
    }

    res.status(200).json({
      message: "Feedback deleted successfully"
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to delete feedback",
      error: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError || error.message?.includes("Only image")) {
    return res.status(400).json({ message: error.message });
  }

  res.status(500).json({ message: "Unexpected server error" });
});