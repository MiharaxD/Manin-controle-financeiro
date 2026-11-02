import {
  BookOpen,
  Car,
  Circle,
  Cloud,
  Gamepad2,
  Heart,
  House,
  Laptop,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { CSSProperties } from "react";
const icons = {
  utensils: Utensils,
  cart: ShoppingCart,
  car: Car,
  home: House,
  heart: Heart,
  sparkles: Sparkles,
  game: Gamepad2,
  laptop: Laptop,
  bag: ShoppingBag,
  book: BookOpen,
  cloud: Cloud,
  circle: Circle,
};
export function CategoryIcon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const Icon = icons[name as keyof typeof icons] ?? Circle;
  return <Icon size={size} strokeWidth={1.7} />;
}
// Ransom-note letters: each one cut from a different "newspaper".
const cuts = ["l1", "l3", "l6", "l2", "l4", "l5"];
export function Ransom({ text, seed = 0 }: { text: string; seed?: number }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="rn" aria-hidden="true">
        {[...text].map((char, i) =>
          char === " " ? (
            <i key={i} className="rn-gap" />
          ) : (
            <b
              key={i}
              className={cuts[(i + seed) % cuts.length]}
              style={{ "--i": i } as CSSProperties}
            >
              {char}
            </b>
          ),
        )}
      </span>
    </>
  );
}
export function Burst() {
  return (
    <svg className="burst" viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        className="burst-star"
        points="50,2 61,31 93,20 74,47 98,62 67,67 77,97 50,76 26,96 33,66 3,60 27,45 9,17 40,30"
      />
      <path className="burst-plus" d="M50 36V64M36 50H64" />
    </svg>
  );
}
// Art lives in docs/brand (make_logo.py copies it to public/brand).
const wordmark = { src: "/brand/manin-logo.svg", width: 707, height: 405 };
const symbol = { src: "/brand/manin-simbolo.svg", width: 232, height: 217 };
/* eslint-disable @next/next/no-img-element -- static SVGs, no optimizer in `output: export` */
export function Logo({
  compact = false,
  collapsible = false,
}: {
  compact?: boolean;
  // Swaps to the symbol where the sidebar narrows (≤960px).
  collapsible?: boolean;
}) {
  if (compact)
    return <img className="logo compact" alt="Manin" {...symbol} />;
  return (
    <picture className="logo">
      {collapsible && (
        <source media="(max-width: 960px)" srcSet={symbol.src} />
      )}
      <img alt="Manin" {...wordmark} />
    </picture>
  );
}
/* eslint-enable @next/next/no-img-element */
