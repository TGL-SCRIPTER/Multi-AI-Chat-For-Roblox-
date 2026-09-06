const db = require("./db");

const RECENT_MESSAGE_LIMIT = 20;
const SUMMARIZE_EVERY = 30;

function labelFor(msg) {
  if (msg.role === "user") return "User";
  const names = { claude: "Claude", openai: "ChatGPT", grok: "Grok", manus: "Manus" };
  return names[msg.ai_provider] || "Assistant";
}

function buildContext(threadId) {
  const summary = db.getLatestSummary(threadId);
  const allMessages = db.getMessages(threadId);
  const recent = allMessages.slice(-RECENT_MESSAGE_LIMIT);
  const files = db.listFiles(threadId);

  let systemContext = `You are one of several AI models (Claude, ChatGPT, Grok, Manus) collaborating with the user in one shared conversation on a Roblox game project. Different AIs may have replied before you in this same thread — treat their prior messages as your own earlier work, stay consistent with decisions already made, and continue the project rather than restarting it.`;

  if (summary) {
    systemContext += `\n\n## Project summary so far\n${summary.summary_text}`;
  }

  if (files.length) {
    systemContext += `\n\n## Current project files\n`;
    for (const f of files) {
      systemContext += `\n### ${f.path} (last updated by ${f.updated_by_ai || "user"})\n\`\`\`\n${f.content}\n\`\`\`\n`;
    }
  }

  const history = recent.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.role === "assistant" ? `[${labelFor(m)}]: ${m.content}` : m.content,
  }));

  return { systemContext, history };
}

async function maybeSummarize(threadId, callProviderFn) {
  const summary = db.getLatestSummary(threadId);
  const sinceId = summary ? summary.covers_up_to_message_id : 0;
  const newMessages = db.getMessagesSince(threadId, sinceId);

  if (newMessages.length < SUMMARIZE_EVERY) return;

  const transcript = newMessages
    .map((m) => `${labelFor(m)}: ${m.content}`)
    .join("\n");

  const prompt = `${summary ? `Previous summary:\n${summary.summary_text}\n\n` : ""}New conversation since then:\n${transcript}\n\nCompress all of this into an updated project-status summary: decisions made, features built, current state, open issues. Be concise.`;

  const summaryText = await callProviderFn({
    systemContext: "You summarize project progress concisely for reuse as context in future AI calls.",
    history: [{ role: "user", content: prompt }],
  });

  const lastId = newMessages[newMessages.length - 1].id;
  db.saveSummary(threadId, lastId, summaryText);
}

module.exports = { buildContext, maybeSummarize };
