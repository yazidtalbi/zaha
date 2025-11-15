"use client";

// app/(marketing)/page.tsx
// Zaha — Marketing Landing Page (App Router)
// TailwindCSS only (no external UI libs)

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ClickSlides from "./components/ClickSlides";
import SoulSection from "./components/SoulSection";

/**
 * Palette (feel free to tweak):
 *  - Ink: #0B1020
 *  - Deep Green: #0D5D4D (hero)
 *  - Sand: #F6F3EC
 *  - Terracotta: #D96E43
 *  - Olive: #66785F
 *  - Lilac: #B9A8FF
 */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

function SectionTitle({
  kicker,
  title,
  center = false,
}: {
  kicker?: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center max-w-3xl mx-auto" : ""}>
      {kicker ? (
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-2xl md:text-3xl font-semibold leading-tight text-neutral-900">
        {title}
      </h2>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <TopBar />
      <Hero />
      <Categories />
      <BecomeSeller />
      <WhyZahaFX />

      <SoulSection />
      {/* <Creators /> */}
      {/* <ShopWithoutDistractions /> */}
      <Testimonials />
      <DealsSearch />
      <AppBanner />
      <SiteFooter />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Zaha
        </Link>
        <nav className="ml-6 hidden md:flex items-center gap-5 text-sm text-neutral-700">
          <Link href="#" className="hover:text-neutral-900">
            Découvrir
          </Link>
          <Link href="#" className="hover:text-neutral-900">
            Catégories
          </Link>
          <Link href="#" className="hover:text-neutral-900">
            Aide
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-sm font-medium bg-neutral-100 hover:bg-neutral-200"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-full px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0D5D4D] text-white">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-[36px] rotate-6 bg-[rgba(255,175,125,0.2)] blur-2xl" />
      <div className="pointer-events-none absolute right-10 -bottom-16 h-72 w-72 rounded-[36px] -rotate-6 bg-[rgba(255,255,255,0.15)] blur-2xl" />

      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/70">
            Zaha — Marketplace
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl font-bold leading-tight">
            Placeholder tazdazext
            <br /> Placeholder tazdazdext
            <br /> Placeholder text
          </h1>
          <p className="mt-4 max-w-xl text-white/85">
            Secondary text placeholder ×Secondary text placeholder ×Secondary
            text placeholder.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="#"
              className="rounded-xl bg-white text-[#0D5D4D] px-4 py-2 font-semibold shadow"
            >
              Placeholder cta
            </Link>
            <Link
              href="#"
              className="rounded-xl border border-white/30 px-4 py-2 font-semibold text-white hover:bg-white/10"
            >
              Secondary cta
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/80">
            <Chip>✔️ placeholder</Chip>
            <Chip>✔️ placeholder</Chip>
            <Chip>✔️ placeholder</Chip>
          </div>
        </div>

        <div className="relative">
          {/* Person / product card */}
          <div className="relative mx-auto h-72 w-72 md:h-80 md:w-80 rounded-2xl bg-white/5 p-2 ring-1 ring-white/20">
            <img
              alt="Hero"
              className="h-full w-full rounded-xl object-cover"
              src="https://picsum.photos/seed/zaha-hero/640/640"
            />
            {/* floating tag */}
            <div className="absolute -right-6 top-6 rounded-xl bg-[#FFEDC9] px-3 py-2 text-xs font-semibold text-[#0B1020] shadow-lg">
              cute jellaba 🧵
            </div>
            <div className="absolute -left-6 bottom-6 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-[#0B1020] shadow-lg">
              order
              <span className="ml-1 inline-block rounded bg-black text-white px-1">
                placeholder
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const cats = new Array(8).fill(0).map((_, i) => ({
    id: i,
    name: "Jewelry & Accessories",
    img: `https://picsum.photos/seed/cat${i}/120/120`,
  }));

  return (
    <section className="bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <SectionTitle center title="Categories (custom text)" />
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {cats.map((c) => (
            <Link
              key={c.id}
              href="#"
              className="group rounded-2xl border p-3 hover:shadow-sm transition bg-white"
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-[#F6F3EC]">
                <img
                  src={c.img}
                  alt="cat"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-neutral-700 group-hover:text-neutral-900">
                {c.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- Pourquoi utiliser Zaha (animated) -------------------- */
function WhyZahaFX() {
  type Feature = {
    title: string;
    desc: string;
    img: string;
    tag?: string;
  };

  const FEATURES: Feature[] = [
    {
      title: "Options de paiement flexibles",
      desc: "Payez à votre rythme avec des options adaptées à votre budget.",
      img: "https://picsum.photos/seed/zaha-pay/800/1200",
      tag: "Paiement",
    },
    {
      title: "Caisse ultra-rapide",
      desc: "Un tunnel d’achat pensé pour aller droit au but.",
      img: "https://picsum.photos/seed/zaha-checkout/800/1200",
      tag: "Checkout",
    },
    {
      title: "Protection de l’acheteur",
      desc: "Remboursement et assistance si quelque chose ne va pas.",
      img: "https://picsum.photos/seed/zaha-protect/800/1200",
      tag: "Sécurité",
    },
    {
      title: "Livraison flexible",
      desc: "Choisissez le mode de livraison qui vous convient.",
      img: "https://picsum.photos/seed/zaha-ship/800/1200",
      tag: "Livraison",
    },
    {
      title: "Cashback & bons plans",
      desc: "Des offres récurrentes pour acheter plus malin.",
      img: "https://picsum.photos/seed/zaha-deals/800/1200",
      tag: "Avantages",
    },
  ];

  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const idx = Number(e.target.getAttribute("data-idx"));
          if (e.isIntersecting) {
            setActive((prev) => (idx !== prev ? idx : prev));
          }
        });
      },
      {
        root: null,
        threshold: 0.5,
        rootMargin: "-20% 0px -30% 0px",
      }
    );

    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const progressPct = useMemo(() => {
    const max = FEATURES.length - 1;
    return `${(active / max) * 100}%`;
  }, [active, FEATURES.length]);

  return (
    <section className="bg-[#F6F3EC]">
      <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 md:grid-cols-[1.1fr,1fr]">
        {/* Left — copy & scroll bullets */}
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Pourquoi utiliser Zaha
          </p>

          <ClickSlides />
        </div>
      </div>
    </section>
  );
}

function BecomeSeller() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-tr from-[#F6F3EC] to-white p-6 md:p-10">
          <div className="absolute -left-6 top-4 h-24 w-24 rotate-6 rounded-2xl bg-[rgba(217,110,67,0.2)] blur-xl" />
          <div className="grid md:grid-cols-[1.1fr,1fr] items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5">
                <img
                  src="https://picsum.photos/seed/seller/240/240"
                  alt="seller"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Become a seller</h3>
                <p className="mt-1 text-sm text-neutral-700 max-w-prose">
                  Secondary text placeholder ×Secondary text placeholder
                  ×Secondary text placeholder.
                </p>
                <Link
                  href="/onboarding/seller"
                  className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                  Placeholder cta
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="h-40 rounded-xl bg-[url('https://picsum.photos/seed/shape/800/300')] bg-cover bg-center" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Creators() {
  const tabs = [
    "Shoppers",
    "Artisans",
    "Collectors",
    "Gift Seekers",
    "Home Stylists",
    "Everyone",
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <SectionTitle center title="For lovers of things with soul." />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
          {tabs.map((t, i) => (
            <button
              key={t}
              className={`rounded-full px-3 py-1.5 border ${
                i === 0 ? "bg-black text-white" : "bg-white hover:bg-neutral-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShopWithoutDistractions() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Made for shoppers
          </p>
          <h3 className="mt-1 text-2xl font-semibold">
            Shop without distractions
          </h3>
          <p className="mt-3 text-sm text-neutral-700 max-w-prose">
            Secondary text placeholder ×Secondary text placeholder ×Secondary
            text placeholder.
          </p>
          <Link
            href="#"
            className="mt-5 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Placeholder cta
          </Link>
        </div>
        <div className="rounded-2xl border bg-[#F6F3EC] p-6">
          <div className="h-48 rounded-xl bg-[url('https://picsum.photos/seed/wide/900/400')] bg-cover bg-center" />
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-[#F6F3EC] border-y">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center gap-3">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/69/Trustpilot_Logo_%282022%29.svg"
            alt="Trustpilot"
            className="h-5 w-auto opacity-80"
          />
          <span className="text-xs text-neutral-600">4.9 ★ 49381 avis</span>
        </div>
        <h3 className="mt-2 text-2xl font-semibold">People adore Zaha</h3>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {["Lilac", "Deep", "Sand"].map((_, i) => (
            <article
              key={i}
              className={`rounded-2xl border p-4 shadow-sm ${
                i === 0
                  ? "bg-[#B9A8FF] text-[rgba(0,0,0,0.85)]"
                  : i === 1
                    ? "bg-[#2A2148] text-white"
                    : "bg-white"
              }`}
            >
              <div className="text-xs">★★★★★</div>
              <p className="mt-2 text-sm leading-relaxed">
                « J'aime trop, pas de stress… » — Lorem ipsum dolor sit amet,
                consectetur adipiscing elit. Vivamus at quam felis, et gravida
                lectus. (placeholder)
              </p>
              <div className="mt-3 text-xs opacity-80">Mira — 17 mai 2025</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DealsSearch() {
  return (
    <section className="relative bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h3 className="text-center text-2xl font-semibold">
          Trouvez un bon plan et étalez les <br className="hidden md:block" />
          coûts sur plus de 4,2 million d'articles
        </h3>
        <div className="mx-auto mt-6 max-w-xl rounded-full border bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <span className="px-3 text-neutral-400">🔍</span>
            <input
              className="w-full rounded-full px-2 py-2 text-sm outline-none placeholder:text-neutral-400"
              placeholder="Rechercher un produit ou une marque"
            />
          </div>
        </div>
        {/* Floating product thumbs */}
        <div className="pointer-events-none relative mt-10 grid grid-cols-6 gap-3 opacity-90">
          {new Array(12).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-neutral-100 overflow-hidden"
            >
              <img
                src={`https://picsum.photos/seed/deal${i}/200/200`}
                className="h-full w-full object-cover"
                alt=""
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppBanner() {
  return (
    <section className="bg-[#F6F3EC]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="relative overflow-hidden rounded-2xl border bg-white p-6 md:p-10">
          <div className="grid md:grid-cols-2 items-center gap-8">
            <div>
              <h3 className="text-xl md:text-2xl font-semibold">
                Prenez Zaha partout avec vous
              </h3>
              <p className="mt-2 text-sm text-neutral-700 max-w-prose">
                Explorez des boutiques, suivez vos commandes et payez en toute
                simplicité sur notre application mobile.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
                  Télécharger l'application
                </button>
                <button className="rounded-xl border px-4 py-2 text-sm font-semibold">
                  En savoir plus
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="h-52 rounded-xl bg-[url('https://picsum.photos/seed/app/800/500')] bg-cover bg-center" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-[#0B1020] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <div className="text-xl font-bold">zaha footer</div>
            <p className="mt-2 text-sm text-white/70">
              Copywrite © {new Date().getFullYear()} Zaha, Tous droits
              réservés.
            </p>
            <div className="mt-4 flex items-center gap-3 text-white/80">
              <a href="#" aria-label="facebook">
                📘
              </a>
              <a href="#" aria-label="x">
                𝕏
              </a>
              <a href="#" aria-label="instagram">
                📸
              </a>
              <a href="#" aria-label="youtube">
                ▶️
              </a>
            </div>
          </div>
          {["Link", "Link", "Link"].map((head, i) => (
            <div key={i}>
              <h4 className="font-semibold">{head}</h4>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                <li>
                  <a href="#" className="hover:text-white">
                    Link
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Link
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Link
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Link
                  </a>
                </li>
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-xs text-white/60">
          Fait avec ♥ au Maroc
        </div>
      </div>
    </footer>
  );
}
