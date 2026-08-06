import Link from "next/link";
import "./metal-print-letter-cta.css";

type Props = { placement: "letters_index" | "letter_end" };

export default function MetalPrintLetterCta({ placement }: Props) {
  const dossierHref = `/metal-print/deus-sive-natura-wall-art?utm_source=letters&utm_medium=owned&utm_campaign=editorial_to_metal&utm_content=${placement}&space=home`;
  const chatHref = `/chat?intent=metal-print&work=${encodeURIComponent("Deus sive Natura")}&utm_source=letters&utm_medium=owned&utm_campaign=editorial_to_metal&utm_content=${placement}_chat&space=home`;

  return (
    <aside className="letter-metal-cta" aria-label="ジャケット・メタルプリントの案内">
      <p className="letter-metal-cta__eyebrow">FROM SOUND TO SPACE · 60CM SQUARE</p>
      <h2>この世界観を、読むだけでなく部屋に残す。</h2>
      <p>
        『Deus sive Natura』の正方形ジャケットを、3点限定のChromaLuxeメタルプリントとして受注制作します。
        書斎や静養空間との相性を、伯爵が一問から見立てます。
      </p>
      <div className="letter-metal-cta__actions">
        <Link href={dossierHref}>作品Dossierを見る</Link>
        <Link href={chatHref}>伯爵に一枚を選んでもらう</Link>
      </div>
      <small>相談に購入義務はありません。正式Offerは仕様・価格・配送条件の確認後にのみ開きます。</small>
    </aside>
  );
}
