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
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
        <path d="M3 2h33l-4 32H0z" fill="currentColor" />
        <path
          d="M8 26V11l10 9 10-9v15M18 20v9"
          fill="none"
          stroke="var(--logo-line,#f4f0e7)"
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      {!compact && (
        <span>
          manin<span className="logo-dot">.</span>
        </span>
      )}
    </span>
  );
}
