"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const INK = "#0B1020";
const SAND = "#F6F3EC";
const PEACH = "#FFE9D1";
const LAVENDER = "#F3ECFE";
const DEEP_PURPLE = "#1E1235";

const features = [
  {
    id: 1,
    title: "Browse the market in one go",
    description:
      "Step into Morocco’s creative world — discover handcrafted treasures, from silver jewelry to woven sweaters.",
    cta: "Learn more",
    gradient: "from-[#FF95B3] to-[#FFB9E3]",
  },
  {
    id: 2,
    title: "Product & Collections management",
    description:
      "Bring order to your creativity. Manage your pieces, create collections, and keep your shop organized.",
    cta: "Learn more",
    gradient: "from-[#C6B5FF] to-[#F5C7FF]",
  },
  {
    id: 3,
    title: "Build trust that lasts",
    description:
      "Let your work speak for itself. Earn glowing reviews and grow your reputation in a community built on care.",
    cta: "Learn more",
    gradient: "from-[#E4E2F3] to-[#F5F5FB]",
  },
];

const useCaseTabs = [
  "Artisans",
  "Vintage Collectors",
  "Artists",
  "Makers",
  "Small Business Owners",
  "Everyone",
] as const;

const useCaseContent: Record<(typeof useCaseTabs)[number], string> = {
  Artisans:
    "Showcase handcrafted pieces, tell the story behind each creation, and reach buyers who value the work of your hands.",
  "Vintage Collectors":
    "Curate one-of-a-kind finds and give them a second life in homes that appreciate their history and character.",
  Artists:
    "Turn your art into a living. Sell prints, originals, and limited series while keeping full control of your brand.",
  Makers:
    "From ceramics to candles, manage inventory, orders, and promotions in one simple dashboard built for makers.",
  "Small Business Owners":
    "Create a storefront that feels like you. Manage products, orders, and customer messages without complex tools.",
  Everyone:
    "Whether you’re just starting or already established, Ishtar gives you space to grow, experiment, and be seen.",
};

const testimonials = [
  {
    name: "Amal",
    role: "Textile artist, Rabat",
    quote:
      "Before Ishtar, my work lived in a small studio. Now my pieces travel to homes I’ve never seen — but somehow feel familiar.",
  },
  {
    name: "Yassine",
    role: "Ceramics maker, Casablanca",
    quote:
      "It feels like a marketplace built by people who actually understand handmade. Orders are easy, clients are kind.",
  },
  {
    name: "Sara",
    role: "Vintage curator, Marrakech",
    quote:
      "I finally found a place where each object’s story matters as much as its price. That changed everything for me.",
  },
];

const faqs = [
  {
    question: "How does buying on Ishtar work?",
    answer:
      "Browse creations, choose what you love, and buy directly from Moroccan artisans and small businesses. Your order is prepared and shipped by the seller.",
  },
  {
    question: "How do I start selling on Ishtar?",
    answer:
      "Create an account, set up your shop, add your products, and you’re ready. We guide you step by step so you never feel lost.",
  },
  {
    question: "Is Ishtar only for Moroccan sellers?",
    answer:
      "Ishtar is rooted in Morocco’s creative scene, with a focus on local artisans and brands, but buyers can discover and shop from anywhere.",
  },
];

// Simple reveal wrapper for sections
function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    >
      {children}
    </motion.section>
  );
}

function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

export default function MarketingPage() {
  const [activeUseCase, setActiveUseCase] =
    useState<(typeof useCaseTabs)[number]>("Artisans");
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0].question);

  return (
    <main className="bg-white text-[15px] text-neutral-900">
      {/* HERO */}
      <Reveal>
        <section
          className="relative overflow-hidden pb-16 pt-12 sm:pt-20"
          style={{
            background:
              "linear-gradient(180deg, #FFECD9 0%, #FFF7EE 40%, #FFFFFF 100%)",
          }}
        >
          <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-neutral-700">
                ISHTAR • ZAHA
              </p>
              <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-[#1C1326] sm:text-4xl">
                Discover products{" "}
                <span className="italic">made with soul.</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] text-neutral-700">
                Connect with real creators across Morocco and beyond. Explore
                handmade, vintage, and one-of-a-kind pieces that carry a story.
              </p>
              <button className="mt-6 inline-flex items-center rounded-full bg-[#1E1235] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#251545]">
                Get early access
              </button>
            </div>

            <div className="relative flex justify-center">
              {/* Replace src with your real phone mockup */}
              <div className="relative h-[360px] w-[180px] sm:h-[420px] sm:w-[210px]">
                <div className="absolute inset-[-18%] -z-10 rounded-4xl bg-linear-to-tr from-[#E6BEFF] via-[#FAD4FF] to-[#FFE2C6]" />
                <Image
                  src="/ishtar-phone.png"
                  alt="Ishtar app preview"
                  fill
                  className="rounded-4xl object-cover shadow-xl"
                />
              </div>
            </div>
          </Container>
        </section>
      </Reveal>

      {/* STORY */}
      <Reveal>
        <section className="bg-white py-16 sm:py-20">
          <Container className="space-y-6 text-center sm:max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
              OUR STORY
            </p>
            <p className="text-[15px] leading-relaxed text-neutral-800">
              In a time when everything is mass-produced, when speed replaces
              care, when creators are hidden behind algorithms and noise, our
              craft loses the space to live.
              <br />
              <br />
              Our streets are scattered across marketplaces, stripped of
              meaning. What should have never been lost is now yours again.
            </p>
            <p className="text-sm font-medium text-neutral-700">
              Welcome to Zaha.
            </p>

            <div className="mt-4 flex items-center justify-center gap-6">
              {/* 3 small icons – replace with your images */}
              <div className="h-14 w-14 rounded-full bg-[#F2E3FF]" />
              <div className="h-10 w-10 rotate-12 rounded-xl bg-[#FAD4FF]" />
              <div className="h-14 w-14 rounded-full bg-[#FFE0C0]" />
            </div>
          </Container>
        </section>
      </Reveal>

      {/* MARKETPLACE LIKE NEVER BEFORE */}
      <Reveal>
        <section className="bg-white pb-12 sm:pb-16">
          <Container>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
                SAMPLE
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#1C1326] sm:text-2xl">
                Marketplace like never before
              </h2>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-linear-to-b from-[#F8F4FF] to-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                >
                  <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-neutral-200">
                    {/* Replace with screenshots */}
                    <Image
                      src={`/screens/screen-${i}.png`}
                      alt="Ishtar screen"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-neutral-900">
                    Discover the market in one go
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    25+ categories of handmade, vintage, and unique goods.
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </Reveal>

      {/* FEATURES */}
      <Reveal>
        <section className="bg-white py-16 sm:py-20">
          <Container>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
                FEATURES
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#1C1326] sm:text-2xl">
                More reasons to love Ishtar
              </h2>
            </div>

            <div className="mt-12 space-y-16">
              {/* 1st row */}
              <div className="grid gap-10 md:grid-cols-2 md:items-center">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1C1326]">
                    {features[0].title}
                  </h3>
                  <p className="text-sm text-neutral-700">
                    {features[0].description}
                  </p>
                  <button className="mt-2 text-xs font-medium text-neutral-900 underline underline-offset-4">
                    {features[0].cta}
                  </button>
                </div>
                <div className="flex justify-center">
                  <div
                    className={`h-64 w-64 rounded-4xl bg-linear-to-b ${features[0].gradient}`}
                  />
                </div>
              </div>

              {/* 2nd row */}
              <div className="grid gap-10 md:grid-cols-2 md:items-center">
                <div className="order-2 space-y-3 md:order-1">
                  <h3 className="text-lg font-semibold text-[#1C1326]">
                    {features[1].title}
                  </h3>
                  <p className="text-sm text-neutral-700">
                    {features[1].description}
                  </p>
                  <button className="mt-2 text-xs font-medium text-neutral-900 underline underline-offset-4">
                    {features[1].cta}
                  </button>
                </div>
                <div className="order-1 flex justify-center md:order-2">
                  <div
                    className={`h-64 w-64 rounded-4xl bg-linear-to-b ${features[1].gradient}`}
                  />
                </div>
              </div>

              {/* 3rd row */}
              <div className="grid gap-10 md:grid-cols-2 md:items-center">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1C1326]">
                    {features[2].title}
                  </h3>
                  <p className="text-sm text-neutral-700">
                    {features[2].description}
                  </p>
                  <button className="mt-2 text-xs font-medium text-neutral-900 underline underline-offset-4">
                    {features[2].cta}
                  </button>
                </div>
                <div className="flex justify-center">
                  <div
                    className={`h-64 w-64 rounded-4xl bg-linear-to-b ${features[2].gradient}`}
                  />
                </div>
              </div>
            </div>
          </Container>
        </section>
      </Reveal>

      {/* BECOME A SELLER – lavender CTA */}
      <Reveal>
        <section
          className="py-16 sm:py-20"
          style={{ backgroundColor: LAVENDER }}
        >
          <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="relative flex justify-center">
              {/* Replace with your real image */}
              <div className="relative h-52 w-52">
                <div className="absolute inset-[-18%] -z-10 rotate-6 rounded-4xl bg-[#E1C3FF]" />
                <Image
                  src="/seller-portrait.png"
                  alt="Ishtar seller"
                  fill
                  className="rounded-[26px] object-cover shadow-lg"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-700">
                SELLER
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#1C1326] sm:text-2xl">
                Become a seller
              </h2>
              <p className="mt-3 max-w-md text-sm text-neutral-700">
                Turn your craft into income. Create your storefront in minutes,
                manage products and orders, and meet buyers who value the story
                behind what you make.
              </p>
              <button className="mt-5 inline-flex items-center rounded-full bg-[#201338] px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#29194a]">
                Start selling on Ishtar
              </button>
            </div>
          </Container>
        </section>
      </Reveal>

      {/* USE CASES */}
      <Reveal>
        <section className="py-16 sm:py-20" style={{ backgroundColor: SAND }}>
          <Container>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
                USE CASES
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#1C1326] sm:text-2xl">
                For creative spirits of all kinds.
              </h2>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
              {useCaseTabs.map((tab) => {
                const active = tab === activeUseCase;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveUseCase(tab)}
                    className={`rounded-full border px-4 py-1.5 transition-colors ${
                      active
                        ? "border-[#1E1235] bg-[#1E1235] text-white"
                        : "border-black/5 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
              <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <p className="text-sm text-neutral-800">
                  {useCaseContent[activeUseCase]}
                </p>
              </div>
              <div className="flex justify-center">
                {/* Replace with custom illustration per tab if you want */}
                <div className="h-52 w-full max-w-sm rounded-3xl bg-linear-to-br from-[#FFE1C4] via-[#F9D9FF] to-[#E1F0FF]" />
              </div>
            </div>
          </Container>
        </section>
      </Reveal>

      {/* TESTIMONIALS */}
      <Reveal>
        <section className="bg-white py-16 sm:py-20">
          <Container>
            <h2 className="text-center text-xl font-semibold text-[#1C1326] sm:text-2xl">
              Stories from our Community
            </h2>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Makers, artists, and small brands sharing what changed when they
              found a home for their work.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="flex h-full flex-col rounded-3xl bg-linear-to-b from-[#F5EDFF] to-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)]"
                >
                  <p className="text-sm leading-relaxed text-neutral-800">
                    “{t.quote}”
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#E0C5FF]" />
                    <div>
                      <p className="text-xs font-medium text-neutral-900">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-neutral-600">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </Reveal>

      {/* FAQ */}
      <Reveal>
        <section className="bg-white py-16 sm:py-20">
          <Container>
            <h2 className="text-center text-xl font-semibold text-[#1C1326] sm:text-2xl">
              Frequently Asked Question
            </h2>

            <div className="mx-auto mt-8 max-w-2xl divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
              {faqs.map((f) => {
                const open = openFaq === f.question;
                return (
                  <button
                    key={f.question}
                    className="flex w-full flex-col items-stretch px-5 py-4 text-left text-sm"
                    onClick={() =>
                      setOpenFaq((prev) =>
                        prev === f.question ? null : f.question
                      )
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-neutral-900">
                        {f.question}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-neutral-500 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {open && (
                      <p className="mt-3 text-xs leading-relaxed text-neutral-700">
                        {f.answer}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </Container>
        </section>
      </Reveal>

      {/* FINAL CTA */}
      <Reveal>
        <section
          className="py-16 sm:py-20"
          style={{
            background:
              "linear-gradient(135deg, #3B215E 0%, #1C102F 35%, #12091F 100%)",
          }}
        >
          <Container className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] text-white">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Dive into the world of shopping
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/80">
                Save your favourite pieces, follow your favourite shops, and be
                the first to know when something special drops.
              </p>
              <button className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-2.5 text-xs font-medium text-[#1E1235] shadow-sm hover:bg-neutral-100">
                Join the early shoppers
              </button>
            </div>
            <div className="relative flex justify-center">
              <div className="relative h-60 w-60">
                <div className="absolute inset-[-16%] -z-10 rounded-[40px] bg-[#5C3AAE]" />
                <Image
                  src="/ishtar-phone-cta.png"
                  alt="Ishtar app preview"
                  fill
                  className="rounded-4xl object-cover shadow-xl"
                />
              </div>
            </div>
          </Container>
        </section>
      </Reveal>
    </main>
  );
}
