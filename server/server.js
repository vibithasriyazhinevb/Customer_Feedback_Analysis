const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

require("dotenv").config();

const Feedback = require("./models/Feedback");
const Customer = require("./models/Customer");

const app = express();
const clientBuildDirectory = path.join(__dirname, "../client/vite-project/dist");
let mongoConnectionPromise;
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== "production") {
  const developmentSecretPath = path.join(__dirname, ".dev-jwt-secret");
  try {
    JWT_SECRET = fs.readFileSync(developmentSecretPath, "utf8").trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    JWT_SECRET = crypto.randomBytes(48).toString("hex");
    try {
      fs.writeFileSync(developmentSecretPath, JWT_SECRET, { flag: "wx", mode: 0o600 });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
      JWT_SECRET = fs.readFileSync(developmentSecretPath, "utf8").trim();
    }
  }
  if (!JWT_SECRET) throw new Error("The local development JWT secret is empty");
  console.warn("JWT_SECRET is not set; using a persistent local development secret.");
}
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const createToken = (customer) =>
  jwt.sign({ id: customer._id.toString() }, JWT_SECRET, { expiresIn: "7d" });

const authMiddleware = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Authentication is required" });

    const payload = jwt.verify(token, JWT_SECRET);
    const customer = await Customer.findById(payload.id);
    if (!customer) return res.status(401).json({ message: "Account not found" });

    req.customer = customer;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired session" });
  }
};

// ===============================
// Environment variables
// ===============================

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

const ensureMongoConnection = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to connect to the database");
  }
  if (mongoose.connection.readyState === 1) return;
  if (!mongoConnectionPromise || mongoose.connection.readyState === 0) {
    mongoConnectionPromise = mongoose.connect(process.env.MONGO_URI).catch((error) => {
      mongoConnectionPromise = null;
      throw error;
    });
  }
  await mongoConnectionPromise;
};

if (process.env.VERCEL) {
  app.use("/api", async (req, res, next) => {
    if (req.path === "/health") return next();
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is required by the server" });
    }

    try {
      await ensureMongoConnection();
      next();
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      res.status(503).json({ message: "The database is unavailable" });
    }
  });
}

// ===============================
// Upload configuration
// ===============================

const upload = multer({
  storage: multer.memoryStorage(),

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

app.get("/uploads/:fileId", async (req, res) => {
  try {
    const filePath = `/uploads/${path.basename(req.params.fileId)}`;
    const feedback = await Feedback.findOne({
      "attachment.filePath": filePath,
    }).select("+attachment.data");
    const attachment = feedback?.attachment;

    if (!attachment?.data) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    res.set("Content-Type", attachment.fileType);
    res.set("Content-Disposition", "inline");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(attachment.data);
  } catch (error) {
    console.error("Attachment retrieval failed:", error.message);
    res.status(500).json({ message: "Unable to retrieve attachment" });
  }
});

// ===============================
// HOME
// ===============================

app.get("/runtime-config.js", (_req, res) => {
  const config = JSON.stringify({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  }).replace(/</g, "\\u003c");
  res.type("application/javascript").send(`globalThis.__APP_CONFIG__ = ${config};`);
});

app.use(express.static(clientBuildDirectory));

app.get("/", (_req, res) => {
  const indexPath = path.join(clientBuildDirectory, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
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
  authMiddleware,
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
              filePath: `/uploads/${crypto.randomUUID()}`,
              fileType: req.file.mimetype,
              data: req.file.buffer,
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

app.get("/api/feedback", authMiddleware, async (_req, res) => {
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

app.get("/api/feedback/:id", authMiddleware, async (req, res) => {
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
  authMiddleware,
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

app.put("/api/feedback/:id", authMiddleware, async (req, res) => {
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
  authMiddleware,
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

app.use(express.static(path.join(__dirname, "../client/vite-project/dist")));

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
// AUTHENTICATION
// =====================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingCustomer = await Customer.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (existingCustomer?.passwordHash) {
      return res.status(409).json({ message: "An account already exists with this email" });
    }

    const customer = existingCustomer || new Customer({ name: name.trim(), email: normalizedEmail });
    customer.name = name.trim();
    customer.passwordHash = await bcrypt.hash(password, 12);
    await customer.save();
    res.status(201).json({
      message: "Account created successfully",
      token: createToken(customer),
      user: { id: customer._id, name: customer.name, email: customer.email },
    });
  } catch (error) {
    res.status(400).json({ message: "Unable to create account", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const customer = await Customer.findOne({ email: normalizedEmail }).select("+passwordHash");
    if (!customer || !customer.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }
    res.status(200).json({
      message: "Logged in successfully",
      token: createToken(customer),
      user: { id: customer._id, name: customer.name, email: customer.email },
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ message: "Unable to log in right now. Please try again later." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ message: "Google sign-in is not configured on the server" });
  }

  const { credential } = req.body;
  if (typeof credential !== "string" || !credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google token verification failed:", error.message);
    return res.status(401).json({
      message: "Google token is invalid or its client ID does not match the server. Confirm VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID use the same active OAuth client, then restart both servers.",
    });
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return res.status(401).json({
      message: "Google account must have a verified email address to sign in.",
    });
  }

  try {
    const normalizedEmail = payload.email.trim().toLowerCase();
    let customer = await Customer.findOne({ email: normalizedEmail });
    if (!customer) {
      customer = await Customer.create({
        name: payload.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: payload.sub,
      });
    } else if (!customer.googleId) {
      customer.googleId = payload.sub;
      await customer.save();
    }

    res.status(200).json({
      message: "Logged in with Google",
      token: createToken(customer),
      user: { id: customer._id, name: customer.name, email: customer.email },
    });
  } catch (error) {
    console.error("Google sign-in account lookup failed:", error.message);
    res.status(500).json({ message: "Google verified your account, but sign-in could not be completed. Please try again later." });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.status(200).json({ user: { id: req.customer._id, name: req.customer.name, email: req.customer.email } });
});

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to start the server");
  }
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required to start the server");
  }

  await ensureMongoConnection();
  console.log("MongoDB connected successfully");

  const port = process.env.PORT || 5000;
  return app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };