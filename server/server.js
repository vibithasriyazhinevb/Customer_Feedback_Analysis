const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

require("dotenv").config();

const Feedback = require("./models/Feedback");
const Customer = require("./models/Customer");

const app = express();

// ===============================
// Environment variables
// ===============================

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is required to start the server");
}

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not configured. AI autocomplete will not work.");
}

// ===============================
// OpenAI client
// ===============================

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// ===============================
// Middleware
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// Upload configuration
// ===============================

const uploadsDirectory = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);

    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-z0-9-_]/gi, "-");

    callback(
      null,
      `${Date.now()}-${baseName}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, callback) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      return callback(null, true);
    }

    callback(
      new Error("Only image and PDF files are allowed")
    );
  },
});

app.use(
  "/uploads",
  express.static(uploadsDirectory)
);

// ===============================
// MongoDB connection
// ===============================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  });

// ===============================
// HOME
// ===============================

app.get("/", (_req, res) => {
  res.send("Customer Feedback API is running");
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// =====================================================
// AI AUTOCOMPLETE
// =====================================================

app.post("/api/ai-autocomplete", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    if (!openai) {
      return res.status(500).json({
        message:
          "OpenAI API key is not configured on the server",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      instructions:
        "You are an AI assistant for a customer feedback application. " +
        "Help users complete their feedback sentence. " +
        "Return only one short, natural suggestion. " +
        "Do not add explanations, quotation marks, or bullet points.",

      input: `Complete this customer feedback naturally:\n${text}`,
    });

    const suggestion = response.output_text?.trim();

    res.status(200).json({
      suggestion: suggestion || "",
    });
  } catch (error) {
    console.error(
      "AI autocomplete error:",
      error.message
    );

    res.status(500).json({
      message: "AI autocomplete failed",
      error: error.message,
    });
  }
});

// =====================================================
// CREATE FEEDBACK
// =====================================================

app.post(
  "/api/feedback",
  upload.single("attachment"),
  async (req, res) => {
    try {
      const {
        customerName,
        name,
        email,
        rating,
        message,
      } = req.body;

      const finalCustomerName =
        customerName || name;

      if (
        !finalCustomerName ||
        !email ||
        !rating ||
        !message
      ) {
        return res.status(400).json({
          message:
            "Customer name, email, rating and message are required",
        });
      }

      let customer = await Customer.findOne({
        email,
      });

      if (!customer) {
        customer = await Customer.create({
          name: finalCustomerName,
          email,
        });
      }

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

      const populatedFeedback =
        await Feedback.findById(
          feedback._id
        ).populate("customer");

      res.status(201).json({
        message:
          "Feedback created successfully",
        feedback: populatedFeedback,
      });
    } catch (error) {
      res.status(400).json({
        message: "Failed to create feedback",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ALL FEEDBACK
// =====================================================

app.get("/api/feedback", async (_req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("customer")
      .sort({
        createdAt: -1,
      });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message,
    });
  }
});

// =====================================================
// GET FEEDBACK BY ID
// =====================================================

app.get("/api/feedback/:id", async (req, res) => {
  try {
    const feedback =
      await Feedback.findById(
        req.params.id
      ).populate("customer");

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    res.status(200).json(feedback);
  } catch (error) {
    res.status(400).json({
      message: "Invalid feedback ID",
      error: error.message,
    });
  }
});

// =====================================================
// GET CUSTOMER FEEDBACK
// =====================================================

app.get(
  "/api/customers/:customerId/feedback",
  async (req, res) => {
    try {
      if (
        !mongoose.isValidObjectId(
          req.params.customerId
        )
      ) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      const feedback =
        await Feedback.find({
          customer:
            req.params.customerId,
        })
          .populate("customer")
          .sort({
            createdAt: -1,
          });

      res.status(200).json(feedback);
    } catch (error) {
      res.status(400).json({
        message:
          "Failed to fetch customer feedback",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE FEEDBACK
// =====================================================

app.put("/api/feedback/:id", async (req, res) => {
  try {
    const updateData = {};

    if (
      req.body.customerName ||
      req.body.name
    ) {
      updateData.customerName =
        req.body.customerName ||
        req.body.name;
    }

    if (
      req.body.rating !== undefined
    ) {
      updateData.rating =
        req.body.rating;
    }

    if (req.body.message) {
      updateData.message =
        req.body.message;
    }

    const feedback =
      await Feedback.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate("customer");

    if (!feedback) {
      return res.status(404).json({
        message: "Feedback not found",
      });
    }

    res.status(200).json({
      message:
        "Feedback updated successfully",
      feedback,
    });
  } catch (error) {
    res.status(400).json({
      message:
        "Failed to update feedback",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE FEEDBACK
// =====================================================

app.delete(
  "/api/feedback/:id",
  async (req, res) => {
    try {
      const feedback =
        await Feedback.findByIdAndDelete(
          req.params.id
        );

      if (!feedback) {
        return res.status(404).json({
          message: "Feedback not found",
        });
      }

      res.status(200).json({
        message:
          "Feedback deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        message:
          "Failed to delete feedback",
        error: error.message,
      });
    }
  }
);

// =====================================================
// MULTER / GENERAL ERROR HANDLER
// =====================================================

app.use(
  (error, _req, res, _next) => {
    if (
      error instanceof multer.MulterError ||
      error.message?.includes(
        "Only image"
      )
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message:
        "Unexpected server error",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});