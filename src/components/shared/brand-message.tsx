import Link from "next/link";
import { CroissantDoodle, Star, Wordmark } from "@/components/brand/logo";

/** Branded full-screen message for errors, empty states and missing pages. */
export function BrandMessage({
  eyebrow,
  title,
  body,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-orange px-6 text-cream">
      <CroissantDoodle className="absolute -left-10 top-10 w-48 -rotate-12 text-cream/15" />
      <CroissantDoodle className="absolute -right-12 bottom-16 w-56 rotate-12 text-cream/15" />
      <Star className="absolute right-16 top-24 h-5 w-5 text-powder" />
      <div className="relative max-w-md text-center">
        <Wordmark className="mx-auto h-12 text-powder" />
        <p className="mt-10 font-serif text-2xl italic text-cream/85">{eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight text-balance">{title}</h1>
        <p className="mt-3 text-lg leading-snug text-cream/90">{body}</p>
        {action && (
          <Link href={action.href} className="mt-8 inline-flex h-14 items-center rounded-full bg-cream px-7 font-bold text-orange-deep shadow-lift transition active:scale-95">
            {action.label}
          </Link>
        )}
        {children}
      </div>
    </main>
  );
}
