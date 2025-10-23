'use client';

type Props = {
  url: string;
  label: 'top' | 'bottom' | 'main';
  className?: string;
} & React.ComponentPropsWithoutRef<'a'>;

export default function CtaCard({ url, label, className, ...rest }: Props) {
  // URLが未設定のときは誤クリック防止（押せない＆半透明）
  const disabled = !url || url === 'https://example.com';

  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    // 既存の計測を壊さない：window.va が存在する場合のみ発火（無ければ何もしない）
    try {
      if (typeof window !== 'undefined' && (window as any).va) {
        (window as any).va('cta_click', {
          page: 'lp/star-pass-001',
          method: 'credit',
          label,
        });
        (window as any).va('mint_start', {
          page: 'lp/star-pass-001',
          method: 'credit',
          price: 0.002,       // 表示に合わせて必要なら後で調整
          currency: 'ETH',    // stagingの通貨表示に合わせたのみ（計測用）
          chain: 'crossmint',
        });
      }
    } catch {
      // 計測に失敗しても購入導線には影響させない
    }
    // aタグの既定動作で新タブオープン（preventDefaultしない）
  };

  return (
    <a
      {...rest}
      href={disabled ? undefined : url}
      onClick={onClick}
      target="_blank"
      rel="noreferrer"
      aria-disabled={disabled}
      className={className || 'rounded-lg border px-4 py-2'}
      style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
    >
      Buy with card (Crossmint)
    </a>
  );
}
