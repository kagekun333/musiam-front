import { useEffect, useState } from "react";
import styles from "@/pages/chat.module.css";
import type { MetalPrintAttribution } from "@/lib/metal-print-consultation";
import { METAL_PRINT_SIGNATURE_FORMAT, METAL_PRINT_VIP_PRICE_POLICY } from "@/lib/metal-print-policy";

type Props = { editionId: string; workTitle: string; lang: string; attribution?: MetalPrintAttribution; onQualified: (qualified: boolean) => void };

export default function MetalPrintConsultationForm({ editionId, workTitle, lang, attribution, onQualified }: Props) {
  const ja = lang === "ja";
  const isCatalogCandidate = editionId.startsWith("CATALOG-WORK:");
  const [email, setEmail] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [budgetBand, setBudgetBand] = useState("");
  const [purchaseTiming, setPurchaseTiming] = useState("");
  const [decisionRole, setDecisionRole] = useState("");
  const [dossierRequested, setDossierRequested] = useState(false);
  const [purchaseIntentIndicated, setPurchaseIntentIndicated] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [consultationToken, setConsultationToken] = useState("");
  const [qualified, setQualified] = useState(false);
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const isApprovedPublicOffer = true;
  const dossierFormat = METAL_PRINT_SIGNATURE_FORMAT;
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "opening" | "error">("idle");
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [verificationDeliveryFailed, setVerificationDeliveryFailed] = useState(false);
  const [postReviewDossierAccepted, setPostReviewDossierAccepted] = useState(false);
  const [postReviewPurchaseIntent, setPostReviewPurchaseIntent] = useState(false);
  const [postReviewProofDisclosureAccepted, setPostReviewProofDisclosureAccepted] = useState(false);
  const [postReviewMadeToOrderTermsAccepted, setPostReviewMadeToOrderTermsAccepted] = useState(false);
  const [acceptanceStatus, setAcceptanceStatus] = useState<"idle" | "saving" | "accepted" | "error">("idle");
  const qualificationComplete = Boolean(email.trim() && spaceType && budgetBand && purchaseTiming && decisionRole && dossierRequested && consent);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = fragment.get("editionId") === editionId ? fragment.get("consultationToken") : null;
    const storageKey = `metalPrintConsultationToken:${editionId}`;
    const resumeToken = fragmentToken || sessionStorage.getItem(storageKey);
    if (!resumeToken) return;
    if (fragmentToken) {
      sessionStorage.setItem(storageKey, fragmentToken);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    let active = true;
    void fetch("/api/metal-print/consultation/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationToken: resumeToken, editionId }),
    }).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => {
      if (!active) return;
      if (!response.ok || body?.qualified !== true) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      setConsultationToken(resumeToken);
      setQualified(true);
      setCheckoutAvailable(body.checkoutAvailable === true);
      setAcceptanceStatus(body.acceptanceComplete === true ? "accepted" : "idle");
      setStatus("done");
      onQualified(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [editionId, onQualified]);

  async function submit() {
    if (!qualificationComplete || status === "sending") return;
    setStatus("sending");
    try {
      const response = await fetch("/api/metal-print/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, editionId, workTitle, spaceType, budgetBand, purchaseTiming, decisionRole, dossierRequested: true, purchaseIntentIndicated, contactConsent: true, ...attribution }),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error(body?.error ?? "submit_failed");
      if (body.qualified === true && typeof body.consultationToken === "string") {
        sessionStorage.setItem(`metalPrintConsultationToken:${editionId}`, body.consultationToken);
        setConsultationToken(body.consultationToken);
      }
      setQualified(body.qualified === true);
      setCheckoutAvailable(body.checkoutAvailable === true);
      setVerificationEmailSent(body.verificationEmailSent === true);
      setVerificationDeliveryFailed(body.verificationRequired === true && body.verificationEmailSent !== true);
      setStatus("done");
      onQualified(body.qualified === true);
    } catch {
      setStatus("error");
    }
  }

  async function acceptDossier() {
    if (!consultationToken || !postReviewDossierAccepted || !postReviewPurchaseIntent || !postReviewProofDisclosureAccepted || !postReviewMadeToOrderTermsAccepted || acceptanceStatus === "saving") return;
    setAcceptanceStatus("saving");
    try {
      const response = await fetch("/api/metal-print/consultation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationToken, editionId, dossierAccepted: true, purchaseIntentConfirmed: true, proofDisclosureAccepted: true, madeToOrderTermsAccepted: true }),
      });
      const body = await response.json();
      if (!response.ok || body?.accepted !== true) throw new Error(body?.error ?? "acceptance_failed");
      setAcceptanceStatus("accepted");
    } catch {
      setAcceptanceStatus("error");
    }
  }

  async function openCheckout() {
    if (!consultationToken || checkoutStatus === "opening") return;
    setCheckoutStatus("opening");
    try {
      const response = await fetch("/api/metal-print/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId, consultationToken }),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok || typeof body.checkoutUrl !== "string") throw new Error(body?.error ?? "checkout_failed");
      window.location.assign(body.checkoutUrl);
    } catch {
      setCheckoutStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={styles.metalConsultation}>
        <p>{verificationDeliveryFailed
          ? ja ? "相談は安全に保存しましたが、確認メールを送信できませんでした。時間をおいて同じメールアドレスで再送信してください。この状態は需要・購入意向には集計されません。" : "Your consultation was stored safely, but the verification email could not be delivered. Please resubmit with the same address later. This does not count as demand or purchase intent."
          : verificationEmailSent
          ? ja ? "確認メールを送りました。メール内のリンクを開いた後だけ、この相談を需要・購入意向として集計します。" : "We sent a verification email. This consultation counts as demand and purchase intent only after you open its link."
          : qualified
          ? ja ? "メール確認が完了しました。Dossier確認後の明示承諾へ進んでください。" : "Your email is verified. Continue to explicit confirmation after reviewing the Dossier."
          : ja ? "承りました。条件が合うEditionが整い次第、館からご連絡します。" : "Received. The house will contact you when a suitable Edition is ready."}</p>
        {qualified && isCatalogCandidate && !checkoutAvailable ? (
          <div>
            <p className={styles.metalConsultationKicker}>CATALOG WORK · PREFLIGHT QUEUED</p>
            <h3>{workTitle}</h3>
            <p>{ja ? "購入希望を受け付けました。原画解像度、比率、推奨サイズ、地域別原価と配送条件を確認し、この作品専用の正式Dossierを作成します。承認済みOfferができるまで決済は開きません。" : "Your purchase request is recorded. We will verify the master file, aspect ratio, recommended size, regional cost and delivery terms, then prepare a formal Dossier for this work. Checkout remains closed until the Offer is approved."}</p>
          </div>
        ) : qualified && acceptanceStatus !== "accepted" ? (
          <div>
            <section aria-label={ja ? "選択作品のDossier条件" : "Selected work Dossier terms"}>
              <p className={styles.metalConsultationKicker}>SELECTED WORK DOSSIER</p>
              <h3>{workTitle}</h3>
              <dl>
                <div><dt>{ja ? "仕様" : "Format"}</dt><dd>{dossierFormat ? `${dossierFormat.widthMm} × ${dossierFormat.heightMm} mm · ${dossierFormat.medium} · ${dossierFormat.finish}` : "—"}</dd></div>
                <div><dt>Edition</dt><dd>{dossierFormat ? ja ? `${dossierFormat.editionSize}点限定` : `Edition of ${dossierFormat.editionSize}` : "—"}</dd></div>
                <div><dt>{ja ? "価格状態" : "Price status"}</dt><dd>{isApprovedPublicOffer ? `税込 ¥${METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()} · 正式Offer` : `候補価格 ¥${METAL_PRINT_VIP_PRICE_POLICY.anchorYen.toLocaleString()} · 現在は未販売`}</dd></div>
                <div><dt>{ja ? "制作" : "Production"}</dt><dd>{ja ? "Stripe入金確認後、1点ずつ受注生産。通常は製造開始から約12営業日＋配送期間。" : "Made one at a time after Stripe payment confirmation. Typical production is about 12 business days plus transit."}</dd></div>
                <div><dt>Proof</dt><dd>{ja ? "実物proofは未承認。画面表示と完成品の色・光沢には差が生じる可能性があります。" : "Physical proof is not yet approved. Color and gloss may differ from the screen preview."}</dd></div>
                <div><dt>{ja ? "配送条件" : "Delivery"}</dt><dd>{ja ? "配送先と利用可能地域を決済前に確認。輸入税・関税が発生する地域では購入者負担となる場合があります。" : "Destination and service availability are checked before payment. Local import taxes or duties may be payable by the buyer."}</dd></div>
                <div><dt>{ja ? "変更・取消" : "Changes / cancellation"}</dt><dd>{ja ? "受注生産品のため、製造開始後の変更・取消可否は進行状況により異なります。" : "Because each work is made to order, changes or cancellation after production starts depend on production status."}</dd></div>
              </dl>
            </section>
            <p>{ja ? "上のDossierを確認した後、次の四点を個別に明示してください。4項目すべてが保存された場合だけ正式Offerへ進めます。" : "After reviewing the Dossier above, explicitly confirm all four items. The formal offer opens only after all four are stored."}</p>
            <label className={styles.metalConsent}><input type="checkbox" checked={postReviewDossierAccepted} onChange={(event) => setPostReviewDossierAccepted(event.target.checked)} />{ja ? "この一点のDossierを実際に確認し、条件を理解しました。" : "I reviewed this work's Dossier and understand its terms."}</label>
            <label className={styles.metalConsent}><input type="checkbox" checked={postReviewPurchaseIntent} onChange={(event) => setPostReviewPurchaseIntent(event.target.checked)} />{ja ? "条件が合うため、選択した時期内の購入を具体的に検討します。" : "The terms fit and I intend to consider purchasing within my selected timing."}</label>
            <label className={styles.metalConsent}><input type="checkbox" checked={postReviewProofDisclosureAccepted} onChange={(event) => setPostReviewProofDisclosureAccepted(event.target.checked)} />{ja ? "実物proofが未承認であり、画面表示と完成品の色・光沢に差が生じ得ることを確認しました。" : "I acknowledge that the physical proof is not yet approved and that final color and gloss may differ from the screen preview."}</label>
            <label className={styles.metalConsent}><input type="checkbox" checked={postReviewMadeToOrderTermsAccepted} onChange={(event) => setPostReviewMadeToOrderTermsAccepted(event.target.checked)} />{ja ? "入金確認後の受注生産で、製造開始後の変更・取消可否は進行状況により異なることを確認しました。" : "I acknowledge that this is made to order after payment and that changes or cancellation after production starts depend on production status."}</label>
            <button className={styles.metalConsultationButton} onClick={() => void acceptDossier()} disabled={!postReviewDossierAccepted || !postReviewPurchaseIntent || !postReviewProofDisclosureAccepted || !postReviewMadeToOrderTermsAccepted || acceptanceStatus === "saving"}>{acceptanceStatus === "saving" ? "…" : ja ? "4項目を確認して正式Offerへ進む" : "Confirm all four items and continue"}</button>
            {acceptanceStatus === "error" ? <p className={styles.metalConsultationError}>{ja ? "承諾を保存できませんでした。時間をおいて再度お試しください。" : "Your acceptance could not be saved. Please try again later."}</p> : null}
          </div>
        ) : qualified && checkoutAvailable ? (
          <>
            <button className={styles.metalConsultationButton} onClick={() => void openCheckout()} disabled={checkoutStatus === "opening"}>
              {checkoutStatus === "opening" ? "…" : ja ? "Stripeで正式Offerを確認する" : "Review the formal offer in Stripe"}
            </button>
            <small>{ja ? "決済前に金額と条件を確認できます。" : "You can review the amount and terms before payment."}</small>
          </>
        ) : qualified && acceptanceStatus === "accepted" ? (
          <p>{ja ? "このEditionは現在準備中です。仕様・原価・配送条件の承認後、この相談からのみ正式Offerを開きます。" : "This Edition is being prepared. The formal offer opens here after its specification, cost and delivery terms are approved."}</p>
        ) : null}
        {checkoutStatus === "error" ? <p className={styles.metalConsultationError}>{ja ? "正式Offerを開けませんでした。時間をおいて再度お試しください。" : "The formal offer could not be opened. Please try again later."}</p> : null}
      </div>
    );
  }

  return (
    <section className={styles.metalConsultation} aria-label={ja ? "メタルプリント購入相談" : "Metal print consultation"}>
      <p className={styles.metalConsultationKicker}>PRIVATE CONSULTATION</p>
      <h3>{ja ? "この一点を、あなたの空間へ迎える相談" : "Discuss receiving this work into your space"}</h3>
      <p>{ja ? "購入義務のない事前相談です。正式Offerは受注生産条件を確認してから開きます。" : "This pre-offer consultation has no purchase obligation. A formal offer opens after the made-to-order terms are confirmed."}</p>
      <div className={styles.metalConsultationGrid}>
        <label className={styles.metalConsultationField}><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="collector@example.com" autoComplete="email" required /></label>
        <label className={styles.metalConsultationField}><span>{ja ? "設置する空間" : "Installation space"}</span><select value={spaceType} onChange={(event) => setSpaceType(event.target.value)} aria-label="Space" required>
          <option value="" disabled>{ja ? "選択してください" : "Choose one"}</option><option value="home">{ja ? "自宅・別荘" : "Home / second home"}</option><option value="office">{ja ? "オフィス" : "Office"}</option><option value="hotel">{ja ? "ホテル・店舗" : "Hotel / venue"}</option><option value="wellness">{ja ? "スパ・ウェルネス" : "Spa / wellness"}</option><option value="other">{ja ? "その他" : "Other"}</option>
        </select></label>
        <label className={styles.metalConsultationField}><span>{ja ? "一点の予算" : "Budget for one work"}</span><select value={budgetBand} onChange={(event) => setBudgetBand(event.target.value)} aria-label="Budget" required>
          <option value="" disabled>{ja ? "選択してください" : "Choose one"}</option><option value="330k_plus">¥330,000+</option><option value="150k_330k">¥150,000–329,999</option><option value="under_150k">{ja ? "15万円未満" : "Under ¥150,000"}</option><option value="undecided">{ja ? "予算は相談したい" : "Budget undecided"}</option>
        </select></label>
        <label className={styles.metalConsultationField}><span>{ja ? "迎えたい時期" : "Purchase timing"}</span><select value={purchaseTiming} onChange={(event) => setPurchaseTiming(event.target.value)} aria-label="Timing" required>
          <option value="" disabled>{ja ? "選択してください" : "Choose one"}</option><option value="within_30d">{ja ? "30日以内" : "Within 30 days"}</option><option value="within_90d">{ja ? "90日以内" : "Within 90 days"}</option><option value="later">{ja ? "それ以降" : "Later"}</option><option value="exploring">{ja ? "まず知りたい" : "Exploring"}</option>
        </select></label>
        <label className={styles.metalConsultationField}><span>{ja ? "購入の決定者" : "Decision role"}</span><select value={decisionRole} onChange={(event) => setDecisionRole(event.target.value)} aria-label="Decision role" required>
          <option value="" disabled>{ja ? "選択してください" : "Choose one"}</option><option value="decision_maker">{ja ? "私が購入を決める" : "I decide the purchase"}</option><option value="influencer">{ja ? "決定者へ提案する" : "I advise the decision maker"}</option><option value="researcher">{ja ? "情報収集中" : "Researching"}</option>
        </select></label>
      </div>
      <label className={styles.metalConsent}><input type="checkbox" checked={dossierRequested} onChange={(event) => setDossierRequested(event.target.checked)} />{ja ? "この一点の非公開Dossier（仕様・価格・配送条件）を受け取り、検討します。" : "I want to receive and review this work's private Dossier with specification, price, and delivery terms."}</label>
      <label className={styles.metalConsent}><input type="checkbox" checked={purchaseIntentIndicated} onChange={(event) => setPurchaseIntentIndicated(event.target.checked)} />{ja ? "条件が合えば、選択した時期内の購入を検討する意向があります（Dossier確認後に改めて確定します）。" : "If the terms fit, I intend to consider purchasing within my selected timing; I will confirm again after reviewing the Dossier."}</label>
      <label className={styles.metalConsent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />{ja ? "この相談への連絡を伯爵MUSIAMから受け取ることに同意します。" : "I consent to being contacted by Hakusyaku MUSIAM about this consultation."}</label>
      <button className={styles.metalConsultationButton} onClick={() => void submit()} disabled={!qualificationComplete || status === "sending"}>{status === "sending" ? "…" : ja ? "非公開相談を送る" : "Send private consultation"}</button>
      {status === "error" ? <p className={styles.metalConsultationError}>{ja ? "現在保存基盤の準備中です。少し後にもう一度お試しください。" : "The consultation store is not ready yet. Please try again later."}</p> : null}
    </section>
  );
}
