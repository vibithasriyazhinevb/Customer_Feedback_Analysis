const express = require("express");
const app = express();

app.use(require("./server/server").app);

module.exports = app;
