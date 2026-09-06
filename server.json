require("dotenv").config();
const express = require("express");
const path = require("path");
const apiRoutes = require("./routes/api");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multi-AI chat running at http://localhost:${PORT}`);
});
