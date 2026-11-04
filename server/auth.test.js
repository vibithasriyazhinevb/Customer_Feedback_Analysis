const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const Customer = require("./models/Customer");

process.env.JWT_SECRET = require("node:crypto").randomBytes(32).toString("hex");
process.env.GOOGLE_CLIENT_ID ||= "test-google-client.apps.googleusercontent.com";
const { app } = require("./server");
const originalFindOne = Customer.findOne;
const originalSave = Customer.prototype.save;
const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  Customer.findOne = originalFindOne;
  Customer.prototype.save = originalSave;
  OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("register creates a normalized account and returns an authenticated session", async () => {
  const password = "correct-password";
  let createdCustomer;
  Customer.findOne = (query) => {
    assert.deepEqual(query, { email: "customer@example.com" });
    return { select: async () => null };
  };
  Customer.prototype.save = async function save() {
    createdCustomer = this;
  };

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: " Test Customer ",
      email: " CUSTOMER@example.com ",
      password,
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.message, "Account created successfully");
  assert.equal(data.user.name, "Test Customer");
  assert.equal(data.user.email, "customer@example.com");
  assert.equal(await bcrypt.compare(password, createdCustomer.passwordHash), true);
  assert.equal(jwt.verify(data.token, process.env.JWT_SECRET).id, createdCustomer._id.toString());
});

test("register rejects an email that already has a password account", async () => {
  Customer.findOne = () => ({
    select: async () => ({ passwordHash: "existing-password-hash" }),
  });

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      email: "customer@example.com",
      password: "correct-password",
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.message, "An account already exists with this email");
});

test("login returns a JWT and user for valid credentials", async () => {
  const password = "correct-password";
  const customer = {
    _id: "507f1f77bcf86cd799439011",
    name: "Test Customer",
    email: "customer@example.com",
    passwordHash: bcrypt.hashSync(password, 4),
  };
  Customer.findOne = (query) => {
    assert.deepEqual(query, { email: customer.email });
    return { select: async () => customer };
  };

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ email: " CUSTOMER@example.com ", password }),
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(data.user.email, customer.email);
  assert.equal(jwt.verify(data.token, process.env.JWT_SECRET).id, customer._id);
});

test("login returns a meaningful unauthorized response for invalid credentials", async () => {
  Customer.findOne = () => ({ select: async () => null });

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "missing@example.com", password: "wrong-password" }),
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.equal(data.message, "Email or password is incorrect");
});

test("login returns a server error when the account lookup fails", async () => {
  Customer.findOne = () => {
    throw new Error("database unavailable");
  };

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@example.com", password: "password" }),
  });
  const data = await response.json();

  assert.equal(response.status, 500);
  assert.equal(data.message, "Unable to log in right now. Please try again later.");
});

test("Google sign-in explains when the credential cannot be verified", async () => {
  OAuth2Client.prototype.verifyIdToken = async () => {
    throw new Error("Wrong recipient");
  };

  const response = await fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "invalid-token" }),
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.match(data.message, /VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID/);
});

test("Google sign-in reports account storage errors as server failures", async () => {
  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: "google-account-id",
      email: "customer@example.com",
      email_verified: true,
    }),
  });
  Customer.findOne = () => {
    throw new Error("database unavailable");
  };

  const response = await fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "valid-token" }),
  });
  const data = await response.json();

  assert.equal(response.status, 500);
  assert.match(data.message, /Google verified your account/);
});
