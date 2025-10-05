// src/pages/oracle/index.tsx
import Link from "next/link";

export default function OracleIndex() {
  return (
    <main style={{padding: 24, fontFamily: "system-ui"}}>
      <h1 style={{fontSize: 24, fontWeight: 600, marginBottom: 12}}>Omikuji / Oracle</h1>
      <p style={{color:"#555", marginBottom: 16}}>言語を選んでください / Choose your language</p>
      <div style={{display:"flex", gap:12}}>
        <Link href="/oracle/ja" className="btn">日本語</Link>
        <Link href="/oracle/en" className="btn">English</Link>
      </div>
      <style jsx>{`
        .btn {
          padding: 10px 14px; border:1px solid #ddd; border-radius:12px;
          background:#fff; text-decoration:none; color:#111;
        }
        .btn:hover { background:#f7f7f7; }
      `}</style>
    </main>
  );
}
