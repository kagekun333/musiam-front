import { useState } from "react";
type Role = "user" | "assistant";
type Msg  = { role: Role; content: string };

export default function Chat() {
  const [log, setLog] = useState<Msg[]>([
    { role: "assistant", content: "ようこそ、MUSIAMへ。伯爵が拝聴しよう。" },
  ]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", content: input };
    setLog(prev => [...prev, userMsg]);
    setInput("");

    const r = await fetch("/api/chat-groq", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [...log, userMsg] }),
    });
    const j = await r.json();
    const content = j?.message?.content as string | undefined;
    if (content) setLog(prev => [...prev, { role: "assistant", content }]);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>伯爵と会話</h1>
      <div style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, padding: 12, minHeight: 160, background: "rgba(255,255,255,.05)" }}>
        {log.map((m,i)=>(
          <div key={i} style={{ textAlign: m.role==="user" ? "left":"right", margin: "6px 0" }}>
            <span style={{ fontSize: 12, opacity: .6, marginRight: 8 }}>{m.role}</span>{m.content}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="話しかける…" style={{ flex:1, padding:"10px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.15)" }}/>
        <button onClick={send} style={{ padding:"10px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,.2)", background:"transparent", color:"inherit" }}>
          送る
        </button>
      </div>
    </main>
  );
}
