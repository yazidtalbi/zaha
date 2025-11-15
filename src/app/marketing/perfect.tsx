"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Star,
  MessageSquare,
  Shield,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// Simple container helper to keep max-width consistent
function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

// Generic placeholder box for images
function ImagePlaceholder({
  label = "Image placeholder",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 text-xs text-neutral-500 " +
        className
      }
    >
      {label}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] text-[#0B1020]">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white pt-16 pb-20">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Left: copy */}
            <div className="space-y-6">
              <Badge className="bg-neutral-100 text-neutral-700 shadow-none rounded-full px-4 py-2 text-xs font-medium tracking-tight">
                For lovers of things with soul
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
                The home for{" "}
                <span className="text-[#D96E43]">Moroccan creators</span> and
                handmade goods.
              </h1>

              <p className="max-w-xl text-base sm:text-lg text-neutral-600 leading-relaxed">
                Discover shops run by real artisans, not factories. Buy pieces
                with a story, support local makers, and keep Moroccan craft
                alive.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-6 text-sm font-medium"
                >
                  Start exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  Become a seller
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-[#D96E43] text-[#D96E43]" />
                  <span>Trusted Moroccan shops</span>
                </div>
                <div className="h-4 w-px bg-neutral-300 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#0D5D4D]" />
                  <span>Verified sellers only</span>
                </div>
              </div>
            </div>

            {/* Right: hero visual placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <ImagePlaceholder
                label="Hero image / phone mockups"
                className="aspect-[4/5] w-full"
              />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Section: “For all kinds of creators” (example) */}
      <section className="bg-[#F6F3EC] py-16 sm:py-20">
        <Container>
          <div className="flex flex-col gap-8 sm:gap-10">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                For all kinds of creators.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
                From tailors and ceramic artists to woodworkers and jewelry
                makers, Zaha gives every creator the tools to open a shop, get
                discovered, and sell without losing their identity.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                "Tailors & fashion makers",
                "Jewelry & accessories",
                "Wood, pottery & decor",
              ].map((title) => (
                <Card
                  key={title}
                  className="border-0 bg-white shadow-sm rounded-2xl"
                >
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <ImagePlaceholder
                      label="Creator image"
                      className="mb-3 aspect-[4/3] w-full"
                    />
                    <h3 className="text-sm sm:text-base font-semibold">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                      Describe how this type of creator uses Zaha. We’ll keep
                      the copy short and focused so it’s easy to scan.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Section: “Your shop dashboard” */}
      <section className="bg-white py-16 sm:py-20 border-y border-neutral-200">
        <Container>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 items-center">
            <div className="space-y-4 sm:space-y-6">
              <Badge className="bg-neutral-100 text-neutral-700 shadow-none rounded-full px-4 py-2 text-xs font-medium">
                Your shop
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-md">
                Add products, track orders, and manage your shop in one simple
                dashboard.
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-lg">
                A clean, focused dashboard designed for real artisans, not
                growth hackers. See new orders, update stock, and respond to
                buyers without getting lost.
              </p>

              <ul className="mt-4 space-y-2 text-sm sm:text-base text-neutral-700">
                {[
                  "Get notified instantly when a new order arrives.",
                  "Edit products, prices, and photos without breaking anything.",
                  "See what’s selling best so you can focus your craft.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0D5D4D]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <ImagePlaceholder
                label="Dashboard UI mockup"
                className="aspect-[4/3] w-full"
              />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0B1020] py-16 sm:py-20 text-white">
        <Container>
          <div className="flex flex-col gap-8">
            <div className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                Testimonials
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                What Moroccan sellers say about Zaha.
              </h2>
              <p className="mx-auto max-w-2xl text-sm sm:text-base text-neutral-300">
                Real stories from artisans who turned their craft into a shop
                people can find, trust, and come back to.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  className="border-0 bg-[#111629] text-white/90 rounded-2xl"
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                      <ImagePlaceholder
                        label="Avatar"
                        className="h-full w-full"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Seller name
                      </CardTitle>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                        Creator type · City
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-3.5 w-3.5 fill-[#D96E43] text-[#D96E43]"
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-200">
                      “Short quote about how Zaha helped them sell, keep control
                      of their brand, and reach people who care about handmade
                      work.”
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
            <div className="space-y-4 sm:space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Answers for curious buyers and sellers.
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Everything you need to know about opening a shop, ordering from
                local makers, and how Zaha protects both sides.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  How does Zaha verify shops?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  We review each seller before they go live, checking their
                  identity, product photos, and shop details. Verified shops
                  receive a badge so buyers know they’re dealing with a real
                  artisan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  Is Zaha only for Moroccan creators?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  Zaha is built first for Moroccan makers and shops rooted in
                  Moroccan craft. Over time, we may open to other regions, but
                  the heart of the platform stays here.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  How do payments and delivery work?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  You choose the delivery and payment options supported in your
                  area (like cash on delivery). Zaha helps keep everything
                  organized between buyers and sellers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Container>
      </section>

      {/* Become a seller CTA */}
      <section className="bg-[#0D5D4D] py-14 sm:py-16 text-white">
        <Container>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3 sm:space-y-4 max-w-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#B9E6D3]">
                Become a seller
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Turn your craft into a shop people can find.
              </h2>
              <p className="text-sm sm:text-base text-[#E4F3EC] leading-relaxed">
                Open your shop in a few simple steps, upload photos of your
                products, and start selling to people who actually care about
                handmade work.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Button
                size="lg"
                className="rounded-full bg-white text-[#0D5D4D] hover:bg-neutral-100 text-sm font-medium"
              >
                Open your shop
                <Store className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-[#C7E7D7]">
                No monthly fee for early creators.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer (simple placeholder) */}
      <footer className="bg-[#0B1020] py-10 text-sm text-neutral-400">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>Zaha · Built for Moroccan creators.</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-neutral-200">
                Privacy
              </Link>
              <Link href="#" className="hover:text-neutral-200">
                Terms
              </Link>
              <Link href="#" className="hover:text-neutral-200">
                Contact
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </main>
  );
}
