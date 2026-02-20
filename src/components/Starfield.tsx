"use client";

import { useEffect, useRef } from "react";

/**
 * フルスクリーンの星空（3層の奥行き＋ランダム流れ星）
 * ・低負荷：デバイスピクセル比を2で上限
 * ・視差：層ごとにドリフト速度を微差
 * ・点滅：星ごとに周波数/位相/振幅をランダム
 * ・流れ星：20〜30秒に1回、同時1本まで、1秒以内のアニメ
 * ・低モーション対応：静的描画にフォールバック（流れ星OFF）
 */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, animId = 0;
    const start = performance.now();
    let running = true;

    type Star = {
      x: number; y: number; r: number;
      base: number; amp: number; spd: number; ph: number; // twinkle
      layer: 0 | 1 | 2; // 視差
    };
    const stars: Star[] = [];

    // 流れ星（20〜30秒に1回、同時1本まで）
    type Meteor = {
      x: number; y: number; vx: number; vy: number;
      life: number; ttl: number; width: number; hue: number;
    } | null;
    let meteor: Meteor = null;
    let nextMeteorAt = performance.now() + rand(20000, 30000);

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * DPR));
      canvas.height = Math.max(1, Math.floor(h * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function spawnStars() {
      stars.length = 0;
      const area = w * h;
      // 画面密度に比例（上限控えめ）
      const count = Math.min(1200, Math.floor(area / 3200));
      for (let i = 0; i < count; i++) {
        const layer = (Math.random() < 0.6 ? 0 : Math.random() < 0.8 ? 1 : 2) as 0|1|2;
        const r = layer === 0 ? rand(0.6, 1.2) : layer === 1 ? rand(0.9, 1.6) : rand(1.2, 2.0);
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          base: rand(0.25, 0.85),
          amp: rand(0.08, 0.35),
          spd: rand(0.6, 1.7),
          ph: Math.random() * Math.PI * 2,
          layer
        });
      }
    }

    function maybeSpawnMeteor(now: number) {
      if (meteor || now < nextMeteorAt) return;
      // 画面外から斜めに走る
      const fromTop = Math.random() < 0.5;
      const angle = (Math.random() * 18 - 9) * (Math.PI / 180); // -9°〜+9°
      const speed = rand(900, 1400) / 1000; // px/ms
      const width = rand(1.2, 2.0);
      const hue = rand(200, 220); // 青白〜薄金
      const y0 = fromTop ? rand(h * 0.05, h * 0.35) : rand(h * 0.15, h * 0.55);
      meteor = {
        x: -100, y: y0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        life: 0,
        ttl: rand(800, 1000), // 1秒以内
        width, hue
      };
      nextMeteorAt = now + rand(20000, 30000); // 20〜30秒に1回
    }

    function drawBackgroundVignette() {
      // わずかな周辺減光＋中心の淡い青い滲み
      const g1 = ctx.createRadialGradient(w*0.5, h*0.65, 0, w*0.5, h*0.65, Math.max(w,h)*0.8);
      g1.addColorStop(0, "rgba(20,30,55,0.18)");
      g1.addColorStop(1, "rgba(5,8,14,0.85)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
    }

    function render(now: number) {
      if (!running) return;
      const t = (now - start);

      ctx.clearRect(0, 0, w, h);
      drawBackgroundVignette();

      // 星：層ごとに極わずかな視差ドリフト
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const driftX = (s.layer === 0 ? -0.02 : s.layer === 1 ? -0.035 : -0.06) * (t / 16);
        const driftY = (s.layer === 0 ?  0.01 : s.layer === 1 ?  0.015 :  0.02) * (t / 16);
        let x = (s.x + driftX) % (w + 10); if (x < -5) x += w + 10;
        let y = (s.y + driftY) % (h + 10); if (y < -5) y += h + 10;

        const tw = s.base + Math.sin(s.ph + t * 0.001 * s.spd) * s.amp; // 0..1
        const a = Math.max(0, Math.min(1, tw));
        // 小さなグローを付けて丸を1発
        ctx.globalAlpha = a;
        ctx.fillStyle = "#dfe8ff";
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.2) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4);
          g.addColorStop(0, `rgba(220,235,255,${0.20*a})`);
          g.addColorStop(1, "rgba(220,235,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 流れ星
      maybeSpawnMeteor(now);
      if (meteor) {
        meteor.life += (now - (render as any)._prevNow || 16);
        const p = meteor.life / meteor.ttl;
        // 位置更新
        meteor.x += meteor.vx * (now - (render as any)._prevNow || 16);
        meteor.y += meteor.vy * (now - (render as any)._prevNow || 16);

        // 本体＋尾
        const len = 240;
        const tailX = meteor.x - meteor.vx * len;
        const tailY = meteor.y - meteor.vy * len;

        const grad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        grad.addColorStop(0, `hsla(${meteor.hue}, 100%, 80%, 0)`);
        grad.addColorStop(0.7, `hsla(${meteor.hue}, 100%, 74%, 0.30)`);
        grad.addColorStop(1, `hsla(${meteor.hue}, 100%, 92%, 0.90)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = meteor.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();

        if (p >= 1 || meteor.x > w + 300 || meteor.y > h + 300) meteor = null;
      }
      (render as any)._prevNow = now;
      animId = requestAnimationFrame(render);
    }

    function bootstrap() {
      resize();
      spawnStars();
      if (reduceMotion) {
        // 静止画：一度だけ描く
        render(performance.now());
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(render);
      }
    }

    const ro = new ResizeObserver(() => { resize(); spawnStars(); });
    ro.observe(canvas);

    bootstrap();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="star-canvas" aria-hidden />;
}
