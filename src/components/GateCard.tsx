"use client";
import type { GateItem } from "@/types/gates";

function LinkButton({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-2xl px-3 py-1 text-sm border hover:shadow transition"
      target="_blank" rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

export default function GateCard({ item }: { item: GateItem }) {
  return (
    <div className="rounded-2xl border p-3 md:p-4 shadow-sm hover:shadow-lg transition bg-white/70 backdrop-blur">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        <img
          src={`/gates/${item.file}`}
          alt={item.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="mt-3 space-y-2">
        <h3 className="text-base md:text-lg font-semibold leading-tight">{item.title}</h3>
        {item.description ? (
          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        ) : null}
        {item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        ) : null}

        {item.links ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <LinkButton href={item.links?.nft} label="NFT" />
            <LinkButton href={item.links?.listen} label="Listen" />
            <LinkButton href={item.links?.read} label="Read" />
            <LinkButton href={item.links?.watch} label="Watch" />
            <LinkButton href={item.links?.buy} label="Buy" />
            <LinkButton href={item.links?.donate} label="Donate" />
          </div>
        ) : null}
      </div>
    </div>
  );
}


