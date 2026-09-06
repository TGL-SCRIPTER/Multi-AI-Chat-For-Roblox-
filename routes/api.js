const express = require("express");
const db = require("../lib/db");
const { buildContext, maybeSummarize } = require("../lib/context");
const { listProviders, callProvider } = require("../lib/providers");

const router = express.Router();

router.get("/providers", (req, res) => {
  res.json(listProviders());
});

router.get("/threads", (req, res) => {
  res.json(db.listThreads());
});
router.post("/threads", (req, res) => {
  const thread = db.createThread(req.body?.title || "New project");
  res.json(thread);
});

router.get("/threads/:id/messages", (req, res) => {
  res.json(db.getMessages(req.params.id));
});

router.get("/threads/:id/files", (req, res) => {
  res.json(db.listFiles(req.params.id));
});
router.put("/threads/:id/files", (req, res) => {
  const { path, content, aiProvider } = req.body;
  if (!path || content === undefined) {
    return res.status(400).json({ error: "path and content required" });
  }
  db.upsertFile(req.params.id, path, content, aiProvider || null);
  res.json({ ok: true });
});

router.post("/threads/:id/send", async (req, res) => {
  const threadId = req.params.id;
  const { message, provider } = req.body;

  if (!message || !provider) {
    return res.status(400).json({ error: "message and provider are required" });
  }

  try {
    db.addMessage(threadId, "user", null, message);

    const { systemContext, history } = buildContext(threadId);
    const reply = await callProvider(provider, { systemContext, history });

    const saved = db.addMessage(threadId, "assistant", provider, reply);

    maybeSummarize(threadId, (args) => callProvider(provider, args)).catch((err) =>
      console.error("Summarization failed:", err.message)
    );

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
