// components/PayOptionsSection.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
  label: string; // left menu text
  title: string; // right big heading line 1 (can wrap)
  description: string; // right paragraph
  image: string; // image url (local/public or remote)
  imageAlt?: string;
};

const ITEMS: Item[] = [
  {
    label: "Aucuns frais si vous payez à temps",
    title: "Options de paiements flexibles",
    description:
      "Payez en plusieurs fois avec les options de paiements flexibles de Zaha, pour un meilleur contrôle de votre budget.",
    image: "/images/pay/3x.png",
    imageAlt: "Payer en 3 fois",
  },
  {
    label: "Caisse simplifiée",
    title: "Caisse simplifiée",
    description:
      "Un passage en caisse rapide, clair et sécurisé pour ne rien rater.",
    image: "/images/pay/checkout.png",
  },
  {
    label: "Sécurité & protection du consommateur",
    title: "Achetez en toute confiance",
    description:
      "Nous mettons en avant la protection des acheteurs et la sécurité des paiements.",
    image: "/images/pay/security.png",
  },
  {
    label: "Cashback et bons plans",
    title: "Économisez au passage",
    description:
      "Profitez d’offres, de remises et de cashback sélectionnés pour vous.",
    image: "/images/pay/cashback.png",
  },
  {
    label: "Ressources financières intelligentes",
    title: "Gérez mieux votre budget",
    description: "Des outils simples pour garder le contrôle sur vos dépenses.",
    image: "/images/pay/tools.png",
  },
];

// tune this to match your mock
const SLIDE_HEIGHT = 520; // px (height of the right content area)

export default function PayOptionsSection() {
  const [active, setActive] = useState(0);

  // single tall column we translate in Y
  const tallHeight = useMemo(() => SLIDE_HEIGHT * ITEMS.length, []);

  return (
    <section className="bg-[#F6F3EC]">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left menu */}
          <div className="lg:col-span-5">
            <h2 className="text-[28px] leading-tight font-semibold text-[#0B1020] mb-6">
              Options de paiements flexibles
            </h2>

            <ul className="space-y-6">
              {ITEMS.map((item, i) => {
                const isActive = i === active;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className={[
                        "w-full text-left rounded-2xl border transition-all",
                        isActive
                          ? "bg-white border-black/10 shadow-sm px-5 py-4"
                          : "border-transparent px-2 py-2",
                      ].join(" ")}
                    >
                      <span className="inline-flex items-center gap-3 text-[18px] md:text-[20px] font-medium text-[#0B1020]/80">
                        <span
                          className={[
                            "inline-block h-3 w-3 rounded-full",
                            isActive ? "bg-[#B9A8FF]" : "bg-[#0B1020]/20",
                          ].join(" ")}
                        />
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right sliding panel */}
          <div className="lg:col-span-7">
            <div
              className="relative overflow-hidden rounded-[28px] bg-white"
              style={{ height: SLIDE_HEIGHT }}
            >
              {/* The translator */}
              <motion.div
                className="absolute inset-0"
                style={{
                  height: tallHeight,
                }}
                animate={{ y: -active * SLIDE_HEIGHT }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              >
                {ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 lg:grid-cols-2 h-[520px]"
                  >
                    {/* mock phone / image */}
                    <div className="relative order-2 lg:order-1">
                      {/* Ensure parent is relative so Image with `fill` works on desktop */}
                      <div className="relative h-full w-full">
                        <Image
                          src={item.image}
                          alt={item.imageAlt || item.title}
                          fill
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          priority={i === 0}
                          className="object-cover object-center"
                        />
                      </div>
                    </div>

                    {/* text */}
                    <div className="order-1 lg:order-2 flex items-center px-6 py-10 lg:px-10">
                      <div>
                        <h3 className="text-[#0B1020] font-extrabold tracking-tight leading-[0.95] text-[40px] md:text-[56px]">
                          {item.title}
                        </h3>
                        <p className="mt-6 text-[18px] md:text-[20px] text-[#0B1020]/70 max-w-2xl">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* subtle masked edges (optional) */}
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-black/5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
