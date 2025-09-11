import GatesGrid from "@/components/GatesGrid";

export const metadata = {
  title: "展示の門 — MUSIAM",
  description: "全作品の展示一覧",
};

export default function GatesPage() {
  return (
    <main className="container mx-auto max-w-7xl px-3 md:px-6 py-6 md:py-10">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">展示の門</h1>
        <p className="text-gray-600 mt-1">全作品をタグ・検索で探索できます。</p>
      </header>
      <GatesGrid />
    </main>
  );
}
