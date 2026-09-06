const fetch = require("node-fetch");

const PROVIDERS = {
  claude: {
    label: "Claude Sonnet 5",
    enabled: () => !!process.env.ANTHROPIC_API_KEY,
    call: async ({ systemContext, history }) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: systemContext,
          messages: history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Claude API error");
      return data.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    },
  },

  openai: {
    label: "ChatGPT",
    enabled: () => !!process.env.OPENAI_API_KEY,
    call: async ({ systemContext, history }) => {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "system", content: systemContext }, ...history],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "OpenAI API error");
      return data.choices[0].message.content;
    },
  },

  grok: {
    label: "Grok",
    enabled: () => !!process.env.XAI_API_KEY,
    call: async ({ systemContext, history }) => {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-4",
          messages: [{ role: "system", content: systemContext }, ...history],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Grok API error");
      return data.choices[0].message.content;
    },
  },

  manus: {
    label: "Manus",
    enabled: () => !!process.env.MANUS_API_KEY,
    call: async ({ systemContext, history }) => {
      const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
      const prompt = `${systemContext}\n\n---\nTask: ${lastUserMsg?.content || ""}`;
      const res = await fetch("https://api.manus.im/v1/tasks", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.MANUS_API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Manus API error");
      return data.result || data.message || JSON.stringify(data);
    },
  },
};

function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    label: p.label,
    enabled: p.enabled(),
  }));
}

async function callProvider(providerId, args) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!provider.enabled()) {
    throw new Error(
      `${provider.label} has no API key set. Add it to .env and restart the server.`
    );
  }
  return provider.call(args);
}

module.exports = { listProviders, callProvider };
