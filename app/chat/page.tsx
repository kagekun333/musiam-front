'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Role = 'system' | 'user' | 'assistant';
type Msg = { role: Role; content: string; id: string };
type Provider = 'auto' | 'groq' | 'openai';

const LS_KEYS = {
  provider: 'abi.provider',
  model: 'abi.model',
  nostream: 'abi.nostream',
  system: 'abi.system',
};

function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(' ');
}

function uid() {
  // 簡易ID（UI用なので十分）
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  // ---- preferences ----
  const [provider, setProvider] = useState<Provider>('auto');
  const [model, setModel] = useState<string>('');
  const [nostream, setNostream] = useState<boolean>(false);
  const [system, setSystem] = useState<string>('短く返して');

  // ---- chat state ----
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([{ role: 'system', content: '短く返して', id: uid() }]);
  const [loading, setLoading] = useState(false);
  const [serverProvider, setServerProvider] = useState<string>('');
  const [fallbackFrom, setFallbackFrom] = useState<string>('');

  // ---- refs ----
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ---- effects: load & persist prefs ----
  useEffect(() => {
    try {
      const p = (localStorage.getItem(LS_KEYS.provider) as Provider) || 'auto';
      const m = localStorage.getItem(LS_KEYS.model) || '';
      const n = localStorage.getItem(LS_KEYS.nostream);
      const s = localStorage.getItem(LS_KEYS.system) || '短く返して';
      setProvider(['auto', 'groq', 'openai'].includes(p) ? p : 'auto');
      setModel(m);
      setNostream(n === '1');
      setSystem(s);
      setMessages([{ role: 'system', content: s, id: uid() }]);
    } catch {}
    return () => abortRef.current?.abort();
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.provider, provider); } catch {} }, [provider]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.model, model); } catch {} }, [model]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.nostream, nostream ? '1' : '0'); } catch {} }, [nostream]);
  useEffect(() => { try { localStorage.setItem(LS_KEYS.system, system); } catch {} }, [system]);

  // ---- auto scroll ----
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ---- textarea autoresize ----
  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, [input]);

  function clampHistory(list: Msg[]): Msg[] {
    // system先頭固定＋直近30メッセージ（約15往復）
    const isSystemFirst = list[0]?.role === 'system';
    const sys = isSystemFirst ? [list[0]] : [];
    const rest = isSystemFirst ? list.slice(1) : list;
    const MAX = 30;
    return sys.concat(rest.slice(-MAX));
  }

  async function send() {
    if (!input.trim() || loading) return;

    const history = clampHistory([
      // 先頭systemをUIの最新値で上書き
      { role: 'system' as const, content: system, id: messages[0]?.id || uid() },
      ...messages.slice(1),
      { role: 'user' as const, content: input.trim(), id: uid() },
    ]);

    setMessages(history);
    setInput('');
    setLoading(true);
    setServerProvider('');
    setFallbackFrom('');

    const body = JSON.stringify({
      provider,
      model: model || undefined,
      messages: history.map(({ id, ...rest }) => rest), // APIには id を送らない
    });

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const url = `/api/abi-chat${nostream ? '?nostream=1' : ''}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: ac.signal,
      });

      const used = res.headers.get('X-Provider') || '';
      const fb = res.headers.get('X-Fallback') || '';
      setServerProvider(used);
      setFallbackFrom(fb);

      if (!res.ok) {
        const text = await res.text();
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error ${res.status}\n${text}`, id: uid() }]);
        setLoading(false);
        return;
      }

      if (nostream) {
        const json = await res.json();
        const content =
          json?.choices?.[0]?.message?.content ??
          json?.choices?.[0]?.delta?.content ??
          JSON.stringify(json);
        setMessages(prev => [...prev, { role: 'assistant', content, id: uid() }]);
        setLoading(false);
        return;
      }

      // ---- SSE parse ----
      const reader = res.body!.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantContent = '';
      const assistantId = uid();
      setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const raw of chunk.split('\n')) {
          if (!raw.startsWith('data:')) continue;
          const payload = raw.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const data = JSON.parse(payload);
            const delta = data?.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const copy = prev.slice();
                const idx = copy.findIndex(m => m.id === assistantId);
                if (idx >= 0) copy[idx] = { ...copy[idx], content: assistantContent };
                return copy;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${String(e?.message || e)}`, id: uid() }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    const sys = system.trim() || '短く返して';
    setMessages([{ role: 'system', content: sys, id: uid() }]);
    setServerProvider('');
    setFallbackFrom('');
    setInput('');
    abortRef.current?.abort();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function deleteMsg(id: string) {
    setMessages(prev => {
      const next = prev.filter(m => m.id !== id);
      // system は消さない（もし消えたら補充）
      if (next.length === 0 || next[0].role !== 'system') {
        next.unshift({ role: 'system', content: system, id: uid() });
      }
      return next;
    });
  }

  const headerBadge = useMemo(() => {
    const prov = serverProvider || provider.toUpperCase();
    return prov ? prov : '-';
  }, [serverProvider, provider]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-5 text-gray-900 dark:text-gray-100">
      {/* header */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">
            伯爵 MUSIAM
          </span>{' '}
          <span className="opacity-80">— ABI Chat</span>
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border px-2 py-1">
            Server: <b>{headerBadge}</b>
          </span>
          {fallbackFrom && (
            <span className="rounded-full border px-2 py-1">
              Fallback: <b>{fallbackFrom}</b>
            </span>
          )}
        </div>
      </header>

      {/* controls */}
      <section className="grid gap-3 md:grid-cols-12">
        {/* Provider pills */}
        <div className="md:col-span-4">
          <div className="text-xs mb-1 opacity-70">Provider</div>
          <div className="flex gap-2">
            {(['auto', 'groq', 'openai'] as Provider[]).map(p => (
              <button
                key={p}
                disabled={loading}
                onClick={() => setProvider(p)}
                className={cx(
                  'px-3 py-1.5 rounded-full border transition',
                  provider === p
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <label className="md:col-span-4">
          <div className="text-xs mb-1 opacity-70">Model</div>
          <input
            className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
            placeholder="空でAPI既定: gpt-4o-mini / llama-3.1-8b-instant"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={loading}
          />
        </label>

        {/* toggles */}
        <div className="md:col-span-4 flex items-end gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={nostream}
              onChange={(e) => setNostream(e.target.checked)}
              disabled={loading}
            />
            <span className="text-sm">nostream（JSON一発）</span>
          </label>
          <button
            className="ml-auto rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={resetChat}
            disabled={loading}
            title="履歴をクリアします"
          >
            リセット
          </button>
        </div>

        {/* system prompt */}
        <label className="md:col-span-12">
          <div className="text-xs mb-1 opacity-70">System</div>
          <input
            className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            disabled={loading}
          />
        </label>
      </section>

      {/* log */}
      <section
        ref={logRef}
        className="border rounded-xl p-4 h-[520px] overflow-auto bg-white dark:bg-gray-900 shadow-sm"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isAssistant = m.role === 'assistant';
          const alignCls = isUser ? 'justify-end' : 'justify-start';
          const bubbleCls = isUser
            ? 'bg-indigo-600 text-white'
            : isAssistant
            ? 'bg-gray-100 dark:bg-gray-800'
            : 'bg-amber-50 dark:bg-yellow-900/30';
          const label =
            m.role === 'user' ? 'You' : m.role === 'assistant' ? 'AI' : 'System';

          return (
            <div key={m.id} className={cx('mb-3 flex', alignCls)}>
              <div className="max-w-[85%]">
                <div className="text-xs opacity-60 mb-1">{label}</div>
                <div className={cx('rounded-2xl px-4 py-3 whitespace-pre-wrap', bubbleCls)}>
                  {m.content}
                </div>
                <div className={cx('flex gap-2 mt-1', isUser ? 'justify-end' : 'justify-start')}>
                  <button
                    className="text-xs opacity-70 hover:opacity-100 underline"
                    onClick={() => copyText(m.content)}
                    title="コピー"
                  >
                    コピー
                  </button>
                  {m.role !== 'system' && (
                    <button
                      className="text-xs opacity-70 hover:opacity-100 underline"
                      onClick={() => deleteMsg(m.id)}
                      title="削除"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="mt-2 text-sm opacity-60">…応答待ち</div>
        )}
      </section>

      {/* composer */}
      <section className="flex items-end gap-3">
        <div className="flex-1">
          <div className="rounded-xl border bg-white dark:bg-gray-900 px-3 py-2 shadow-sm">
            <textarea
              ref={textareaRef}
              className="w-full resize-none bg-transparent outline-none leading-6"
              placeholder="メッセージを入力…（Enterで送信 / Shift+Enterで改行）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={8000}
              disabled={loading}
            />
          </div>
          <div className="mt-1 text-xs opacity-60">
            {input.length}/8000
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={cx(
              'rounded-xl px-4 py-2 text-white transition',
              loading || !input.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-900 hover:opacity-90'
            )}
            disabled={loading || !input.trim()}
            onClick={send}
            title="Enterでも送信できます"
          >
            送信
          </button>
          <button
            className={cx(
              'rounded-xl border px-3 py-2',
              loading ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : 'opacity-50 cursor-not-allowed'
            )}
            disabled={!loading}
            onClick={() => abortRef.current?.abort()}
            title="SSEを中断"
          >
            停止
          </button>
        </div>
      </section>
    </div>
  );
}
