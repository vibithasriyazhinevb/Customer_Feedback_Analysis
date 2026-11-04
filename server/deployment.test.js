const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const crypto = require("node:crypto");
const Feedback = require("./models/Feedback");

process.env.JWT_SECRET ||= crypto.randomBytes(32).toString("hex");
process.env.GOOGLE_CLIENT_ID = "deployment-test-client.apps.googleusercontent.com";

const { app } = require("./server");
const originalFindOne = Feedback.findOne;
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
  Feedback.findOne = originalFindOne;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("runtime config exposes the optional Google client ID", async () => {
  const response = await fetch(`${baseUrl}/runtime-config.js`);
  const script = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /javascript/);
  assert.match(script, /deployment-test-client\.apps\.googleusercontent\.com/);
});

test("attachment endpoint reads durable file data from MongoDB", async () => {
  const fileData = Buffer.from("%PDF-test");
  Feedback.findOne = (query) => {
    assert.deepEqual(query, { "attachment.filePath": "/uploads/file-id" });
    return {
      select: async (selection) => {
        assert.equal(selection, "+attachment.data");
        return { attachment: { data: fileData, fileType: "application/pdf" } };
      },
    };
  };

  const response = await fetch(`${baseUrl}/uploads/file-id`);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/pdf/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), fileData);
});
