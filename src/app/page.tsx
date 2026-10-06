import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ChefHat, QrCode, Smartphone } from "lucide-react";
import { CroissantDoodle, Star, Wave, Wordmark } from "@/components/brand/logo";
import { ProductArt } from "@/components/brand/product-art";

const FLOW = ["Customer", "Ordering", "Kitchen", "Payment", "Service", "Operations", "Analytics", "Owner"];

const SIDES = [
  {
    href: "/order/table-07",
    eyebrow: "Customer",
    title: "Experience as a guest",
    body: "Scan Table 07, browse the real Deluj menu, get a perfect pairing, pay and watch your order come to life.",
    cta: "Experience as Customer",
    icon: Smartphone,
    tone: "bg-orange text-white",
    art: { kind: "iced-cup", tone: "powder", accent: "#8DB255" } as const,
  },
  {
    href: "/staff",
    eyebrow: "Staff",
    title: "The kitchen display",
    body: "Orders land instantly with timers, modifiers and notes. One tap moves them on — and the guest's phone follows.",
    cta: "Open Staff System",
    icon: ChefHat,
    tone: "bg-powder text-ink",
    art: { kind: "pancakes", tone: "orange", accent: "#D8902F" } as const,
  },
  {
    href: "/owner",
    eyebrow: "Owner",
    title: "Hosny's command center",
    body: "Revenue, orders, tables and the menu — live. Smart insights from today's activity, not a spreadsheet tomorrow.",
    cta: "Open Owner Dashboard",
    icon: BarChart3,
    tone: "bg-ink text-cream",
    art: { kind: "hot-cup", tone: "cream", accent: "#C99A6E" } as const,
  },
];

const POSTCARDS = [
  { src: "/brand/social/baked-fresh-daily.webp", alt: "Pain Suisse — Baked Fresh Daily", rotate: "-rotate-6", left: "0%", top: "8%" },
  { src: "/brand/social/coffee-best-friend.webp", alt: "Deluj iced coffee and bag — Your Coffee's Best Friend", rotate: "rotate-3", left: "36%", top: "0%" },
  { src: "/brand/social/counter.webp", alt: "The Deluj counter", rotate: "-rotate-2", left: "14%", top: "46%" },
  { src: "/brand/social/gift-boxes.webp", alt: "Deluj boxes", rotate: "rotate-6", left: "54%", top: "40%" },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-cream">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-orange text-cream">
        <CroissantDoodle className="absolute -left-10 top-24 w-56 -rotate-12 text-cream/15" />
        <CroissantDoodle className="absolute -right-16 top-10 w-72 rotate-12 text-cream/10" />
        <Star className="absolute left-[46%] top-40 h-5 w-5 text-powder" />
        <Star className="absolute bottom-24 right-[22%] h-4 w-4 text-powder" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
          <div className="flex items-center justify-between">
            <Wordmark className="h-10 text-powder sm:h-12" />
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur">Digital operating system</span>
          </div>
          <div className="mt-14 grid items-center gap-10 lg:mt-20 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <h1 className="font-display text-[3.1rem] font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.4rem]">
                One Deluj.
                <br />
                Every order.
                <br />
                <span className="font-serif font-normal italic text-powder">Connected.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-snug text-cream/90 sm:text-xl">
                The guest orders from the table. The kitchen hears it instantly. Hosny sees it all — live, on any device.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/order/table-07" className="flex h-14 items-center gap-2 rounded-full bg-cream px-6 font-bold text-orange-deep shadow-lift transition active:scale-95">
                  Experience as Customer <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/print/table-07" className="flex h-14 items-center gap-2 rounded-full bg-white/15 px-6 font-bold backdrop-blur transition active:scale-95">
                  <QrCode className="h-5 w-5" /> Table 07 QR card
                </Link>
              </div>
            </div>
            <div className="relative hidden h-[22rem] lg:block">
              {POSTCARDS.map((p, i) => (
                <figure key={p.src} className={`absolute w-44 rounded-2xl bg-cream p-2 pb-6 shadow-lift ${p.rotate}`} style={{ left: p.left, top: p.top }}>
                  <Image src={p.src} alt={p.alt} width={230} height={288} className="aspect-[4/5] w-full rounded-xl object-cover" priority={i < 2} />
                </figure>
              ))}
              <p className="absolute -top-10 right-2 font-serif text-xl italic text-cream/85">Postcards from Deluj</p>
            </div>
          </div>
        </div>
        <Wave className="block h-5 w-full text-cream" flip />
      </section>

      {/* ── Flow ── */}
      <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8">
        <ol className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2" aria-label="How the system connects">
          {FLOW.map((f, i) => (
            <li key={f} className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-4 py-2 text-sm font-bold ${i === 0 || i === FLOW.length - 1 ? "bg-orange text-white" : "bg-white text-ink shadow-soft"}`}>{f}</span>
              {i < FLOW.length - 1 && <ArrowRight className="h-4 w-4 text-orange" />}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Three sides ── */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-8 sm:px-8 lg:grid-cols-3">
        {SIDES.map((s) => (
          <Link key={s.href} href={s.href} className="group flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
            <div className={`relative flex items-center justify-between p-6 ${s.tone}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">{s.eyebrow}</p>
                <s.icon className="mt-3 h-8 w-8" />
              </div>
              <ProductArt art={s.art} className="h-24 w-24 rounded-3xl shadow-soft" />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{s.title}</h2>
              <p className="mt-2 flex-1 text-ink-soft">{s.body}</p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-orange-deep">
                {s.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Promise ── */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        <div className="terrazzo grid gap-6 rounded-[2rem] bg-stone p-7 sm:grid-cols-3 sm:p-10">
          {[
            ["Freshly made, freshly synced", "Every screen updates the moment something happens — no refresh, no re-keying."],
            ["The real Deluj menu", "Every item, price and description from today's menu, with the real add-ons."],
            ["Built to grow", "Loyalty, delivery, payments, inventory and more branches plug into the same core."],
          ].map(([t, b]) => (
            <div key={t}>
              <Star className="h-5 w-5 text-orange" />
              <p className="mt-2 font-display text-lg font-extrabold">{t}</p>
              <p className="mt-1 text-ink-soft">{b}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink-mute">A working demonstration for Deluj. Dashboard figures are illustrative demo data. Photos from @deluj.eg.</p>
      </section>
    </main>
  );
}
