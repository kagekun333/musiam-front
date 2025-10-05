import Link from "next/link";

export default function OracleGate() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Oracle 門</h1>
      <p className="opacity-80 mb-6">占いの入り口を選んでください。</p>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/oracle/tarot1"
          className="border rounded-xl p-4 hover:shadow transition flex flex-col"
        >
          <div className="text-xl font-semibold mb-1">タロット（1枚引き）</div>
          <p className="text-sm opacity-70">
            裏面のカードから直感で1枚。今日の神託が作品として現れます。
          </p>
        </Link>

        {/* 将来ここに他モードを追加（八卦／誕生日／3枚引き など） */}
        <div className="border rounded-xl p-4 opacity-60">
          <div className="text-xl font-semibold mb-1">八卦（準備中）</div>
          <p className="text-sm opacity-70">方位で選ぶ、東洋の神託。</p>
        </div>
        <div className="border rounded-xl p-4 opacity-60">
          <div className="text-xl font-semibold mb-1">誕生日（準備中）</div>
          <p className="text-sm opacity-70">生年月日seedで守護作品を。</p>
        </div>
      </section>
    </main>
  );
}
