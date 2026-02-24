"use client";

import Link from "next/link";
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import { motion, useInView } from "motion/react";
import { useRef, useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  Smartphone,
  FileCheck,
  Link2,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// --- Animated Section Wrapper ---
function Section({
  children,
  className = "",
  bg = "transparent",
  id,
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  bg?: string;
  id?: string;
  dark?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: dark ? 40 : 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{ backgroundColor: bg }}
    >
      {children}
    </motion.section>
  );
}

// --- FAQ Item (Light Mode) ---
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e7e5e4]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-6 text-left cursor-pointer"
      >
        <span className="text-lg font-medium text-[#1c1917] pr-8">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#0d9488] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-6 text-[#78716c] leading-relaxed max-w-2xl">{a}</p>
      </motion.div>
    </div>
  );
}

// --- Pricing Card (Light Mode / Dashboard Style) ---
function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  delay = 0,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-[14px] p-8 flex flex-col transition-all duration-300 ${
        highlighted
          ? "bg-white border-2 border-[#0d9488] shadow-[0_4px_24px_rgba(13,148,136,0.10)] hover:shadow-[0_8px_32px_rgba(13,148,136,0.15)] order-first md:order-none"
          : "bg-white border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0d9488] text-white text-xs font-bold tracking-wider uppercase rounded-full">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[#1c1917] mb-1">{name}</h3>
        <p className="text-sm text-[#a8a29e]">{description}</p>
      </div>
      <div className="mb-8">
        <span className={`text-5xl font-bold tracking-tight text-[#1c1917] ${dmSans.className}`}>
          {price}
        </span>
        <span className="text-[#a8a29e] ml-2">/mo</span>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-[#44403c]">
            <Check className="w-4 h-4 text-[#0d9488] mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <a
        href="#waitlist"
        className={`block text-center py-3 px-6 rounded-[10px] font-medium text-sm transition-all duration-200 ${
          highlighted
            ? "bg-[#0d9488] text-white hover:bg-[#0f766e]"
            : "bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7e5e4]"
        }`}
      >
        Join Waitlist
      </a>
    </motion.div>
  );
}

// --- Main Page ---
export default function MarketingPage() {
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // IntersectionObserver for nav color swap
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolledPastHero(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Close mobile menu on anchor click
  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <div
      className={`${dmSans.variable} ${dmSerif.variable} ${jetbrains.variable} font-[family-name:var(--font-dm-sans)] min-h-screen`}
    >
      {/* Nav — adaptive dark/light */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-xl transition-colors duration-500 ${
          scrolledPastHero
            ? "bg-[#fafaf9]/80 border-b border-[#e7e5e4]"
            : "bg-zinc-950/70 border-b border-white/5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className={`${dmSerif.className} text-xl tracking-tight transition-colors duration-500 ${
              scrolledPastHero ? "text-[#1c1917]" : "text-white"
            }`}
          >
            Chase<span className="text-[#0d9488]">.md</span>
          </Link>

          {/* Desktop nav */}
          <div
            className={`hidden md:flex items-center gap-8 text-sm transition-colors duration-500 ${
              scrolledPastHero ? "text-[#78716c]" : "text-zinc-400"
            }`}
          >
            <a
              href="#how-it-works"
              className={`transition-colors ${scrolledPastHero ? "hover:text-[#1c1917]" : "hover:text-white"}`}
            >
              How It Works
            </a>
            <a
              href="#features"
              className={`transition-colors ${scrolledPastHero ? "hover:text-[#1c1917]" : "hover:text-white"}`}
            >
              Features
            </a>
            <a
              href="#pricing"
              className={`transition-colors ${scrolledPastHero ? "hover:text-[#1c1917]" : "hover:text-white"}`}
            >
              Pricing
            </a>
            <a
              href="#faq"
              className={`transition-colors ${scrolledPastHero ? "hover:text-[#1c1917]" : "hover:text-white"}`}
            >
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#waitlist"
              className="px-4 py-2 bg-[#0d9488] text-white text-sm font-medium rounded-[10px] hover:bg-[#0f766e] transition-colors"
            >
              Join Waitlist
            </a>

            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                scrolledPastHero
                  ? "text-[#1c1917] hover:bg-[#e7e5e4]"
                  : "text-white hover:bg-white/10"
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden border-t px-6 py-4 space-y-1 ${
              scrolledPastHero
                ? "bg-[#fafaf9]/95 border-[#e7e5e4]"
                : "bg-zinc-950/95 border-white/5"
            }`}
          >
            {[
              { href: "#how-it-works", label: "How It Works" },
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleNavClick}
                className={`block py-3 text-sm font-medium transition-colors ${
                  scrolledPastHero
                    ? "text-[#44403c] hover:text-[#1c1917]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </nav>

      {/* ========== HERO (Dark) ========== */}
      <header
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 bg-zinc-950 selection:bg-[#0d9488]/30 selection:text-white"
      >
        {/* Noise overlay — scoped to dark sections */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Radial glow — teal */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0d9488]/8 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-20 w-[300px] h-[300px] bg-[#2dd4bf]/5 rounded-full blur-[80px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-[#0d9488]/20 bg-[#0d9488]/5 text-[#2dd4bf] text-sm ${jetbrains.className}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Currently in private beta
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`${dmSerif.className} text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-[0.95] tracking-tight mb-8`}
          >
            Stop chasing
            <br />
            <span className="text-[#2dd4bf] italic">documents.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className={`text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed ${dmSans.className}`}
          >
            AI-powered multi-channel chasing that gets your clients to send their documents.
            Magic link portals. No logins. No friction. Your practice saves{" "}
            <span className="text-white font-medium">500–750 hours a year.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            id="waitlist"
          >
            <a
              href="#waitlist"
              className="group flex items-center gap-2 px-8 py-4 bg-[#0d9488] text-white font-semibold rounded-[10px] hover:bg-[#0f766e] transition-all duration-200 text-base"
            >
              Join the Waitlist
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-4 text-zinc-400 hover:text-white font-medium transition-colors text-base"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Floating stat pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-20 flex flex-wrap items-center justify-center gap-4 text-sm"
          >
            {[
              "Email → SMS → WhatsApp",
              "Xero Integration",
              "AI Document Classification",
              "GDPR Compliant",
            ].map((tag) => (
              <span
                key={tag}
                className={`px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 ${jetbrains.className} text-xs tracking-wide`}
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </header>

      {/* ========== GRADIENT BRIDGE ========== */}
      <div className="h-32 sm:h-48 bg-gradient-to-b from-zinc-950 to-[#fafaf9]" />

      {/* ========== PROBLEM (Light — #fafaf9) ========== */}
      <Section bg="#fafaf9" className="py-20 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
                The Problem
              </p>
              <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917] leading-tight mb-6`}>
                You&apos;re spending <span className="text-[#0d9488]">750 hours</span> a year
                asking for the same documents.
              </h2>
              <p className="text-[#78716c] leading-relaxed text-lg">
                Every tax season, the loop starts again. Email the client. Wait. Follow up. Wait.
                Call them. They promise to send it. They don&apos;t. Chase again. Multiply by every
                client. Multiply by every document. That&apos;s your practice — trapped in an
                endless loop of polite nagging.
              </p>
            </div>
            <div className="relative">
              {/* The chase loop visualization */}
              <div className="bg-white rounded-[14px] border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8 space-y-4">
                {[
                  { step: "Mon", text: "Send initial document request email", color: "text-[#a8a29e]" },
                  { step: "Wed", text: "No response. Send follow-up email", color: "text-[#a8a29e]" },
                  { step: "Fri", text: "Still nothing. Try calling — voicemail", color: "text-[#78716c]" },
                  { step: "Mon", text: "Another email. \"Just a gentle reminder...\"", color: "text-[#78716c]" },
                  { step: "Wed", text: "Client replies: \"I'll send it tonight\"", color: "text-amber-600" },
                  { step: "Fri", text: "They didn't. Start again from the top.", color: "text-red-500" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-4"
                  >
                    <span className={`${jetbrains.className} text-xs w-10 shrink-0 pt-1 ${item.color}`}>
                      {item.step}
                    </span>
                    <span className={`text-sm ${item.color}`}>{item.text}</span>
                  </motion.div>
                ))}
                <div className="pt-4 border-t border-[#e7e5e4]">
                  <p className={`${jetbrains.className} text-xs text-red-400`}>
                    ↻ repeat × 200 clients × 12 document types
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ========== HOW IT WORKS (Light — #ffffff) ========== */}
      <Section bg="#ffffff" className="py-20 md:py-32 px-6" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
              How It Works
            </p>
            <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917]`}>
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                num: "01",
                title: "Set up a campaign",
                desc: "Select clients, choose documents you need, set your escalation schedule. chase.md handles the rest.",
                icon: Zap,
              },
              {
                num: "02",
                title: "Client gets a magic link",
                desc: "No login. No password. No app to download. Your client clicks one link and sees exactly what they need to upload.",
                icon: Link2,
              },
              {
                num: "03",
                title: "Documents flow in",
                desc: "AI classifies what's uploaded, matches it to your request, and syncs with Xero. You see progress in real-time.",
                icon: FileCheck,
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                <div className="bg-white rounded-[14px] border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8 h-full hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                  <span className={`${dmSans.className} text-6xl font-bold text-[#e7e5e4] block mb-4`}>
                    {step.num}
                  </span>
                  <div className="w-10 h-10 rounded-[10px] bg-[#f0fdfa] flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-[#0d9488]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1c1917] mb-3">{step.title}</h3>
                  <p className="text-[#78716c] leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ========== FEATURES (Light — #fafaf9) ========== */}
      <Section bg="#fafaf9" className="py-20 md:py-32 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
              Features
            </p>
            <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917]`}>
              Everything you need to<br />
              <span className="text-[#0d9488]">stop chasing.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Mail,
                title: "Multi-Channel Escalation",
                desc: "Start with email. Escalate to SMS. Then WhatsApp. Configurable schedules that feel personal, not robotic.",
              },
              {
                icon: Sparkles,
                title: "AI Document Classification",
                desc: "Uploaded a bank statement instead of a P60? chase.md knows the difference and tells your client.",
              },
              {
                icon: Link2,
                title: "Magic Link Portal",
                desc: "One click. No login. No password. Clients see what's needed and upload instantly from any device.",
              },
              {
                icon: BarChart3,
                title: "Live Progress Tracking",
                desc: "See which clients have responded, what's outstanding, and who needs a nudge — all in one dashboard.",
              },
              {
                icon: FileCheck,
                title: "Xero Integration",
                desc: "Documents sync directly to the right client record in Xero. No manual filing. No duplicates.",
              },
              {
                icon: Shield,
                title: "Bank-Grade Security",
                desc: "256-bit encryption. UK data residency. GDPR compliant. SOC 2 in progress. Your clients' data is safe.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white rounded-[14px] border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-7 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[#f0fdfa] flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-[#0d9488]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1c1917] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#78716c] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ========== PRICING (Light — #ffffff) ========== */}
      <Section bg="#ffffff" className="py-20 md:py-32 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
              Pricing
            </p>
            <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917] mb-4`}>
              Simple, transparent pricing.
            </h2>
            <p className="text-[#78716c] text-lg">No setup fees. No contracts. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Starter"
              price="£79"
              description="For solo practitioners"
              delay={0}
              features={[
                "1 user",
                "50 active clients",
                "Email chasing only",
                "Magic link portal",
                "AI document classification",
                "Email support",
              ]}
            />
            <PricingCard
              name="Professional"
              price="£149"
              description="For growing practices"
              highlighted
              delay={0.1}
              features={[
                "5 users",
                "200 active clients",
                "Email + SMS + WhatsApp",
                "Magic link portal",
                "AI document classification",
                "Xero integration",
                "Priority support",
              ]}
            />
            <PricingCard
              name="Enterprise"
              price="£249"
              description="For large practices"
              delay={0.2}
              features={[
                "Unlimited users",
                "Unlimited clients",
                "All channels",
                "Full API access",
                "Custom integrations",
                "Dedicated account manager",
                "Priority support & SLA",
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ========== SOCIAL PROOF (Light — #fafaf9) ========== */}
      <Section bg="#fafaf9" className="py-20 md:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
            Early Access
          </p>
          <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917] mb-16`}>
            Trusted by forward-thinking practices.
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                quote: "We used to spend two full days a week just chasing documents. This changes everything.",
                name: "Coming soon",
                role: "Beta participant",
              },
              {
                quote: "The magic link portal is genius. My clients actually upload things now.",
                name: "Coming soon",
                role: "Beta participant",
              },
              {
                quote: "Finally, someone built this. Every accountant in the UK needs chase.md.",
                name: "Coming soon",
                role: "Beta participant",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-white rounded-[14px] border border-[#e7e5e4] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-7 text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <p className="text-[#44403c] text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-[#1c1917] text-sm font-medium">{t.name}</p>
                  <p className="text-[#a8a29e] text-xs">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ========== FAQ (Light — #ffffff) ========== */}
      <Section bg="#ffffff" className="py-20 md:py-32 px-6" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className={`${jetbrains.className} text-[#0d9488] text-sm tracking-wider uppercase mb-4`}>
              FAQ
            </p>
            <h2 className={`${dmSans.className} text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1c1917]`}>
              Questions & answers.
            </h2>
          </div>

          <div>
            <FAQItem
              q="How does the client experience work?"
              a="Clients receive a message (email, SMS, or WhatsApp) with a magic link. One click opens a branded portal showing exactly which documents they need to upload. No login, no password, no app download. They drag and drop or take a photo from their phone. That's it."
            />
            <FAQItem
              q="Is my clients' data secure?"
              a="Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We use UK-based data centres, and all data processing complies with UK GDPR. We're also working towards SOC 2 Type II certification."
            />
            <FAQItem
              q="How does GDPR compliance work?"
              a="chase.md is designed with privacy by design. We act as a data processor under your instruction. We provide a full DPA, maintain processing records, and support data subject rights including deletion requests. Client data is never used for training or shared with third parties."
            />
            <FAQItem
              q="What if a client uploads the wrong document?"
              a="Our AI classification engine analyses each upload and checks it against what was requested. If someone uploads a bank statement when you asked for a P60, the system flags it and prompts the client to upload the correct document."
            />
            <FAQItem
              q="How does the Xero integration work?"
              a="Once connected, chase.md syncs uploaded documents directly to the matching client record in Xero. It also pulls your client list so you can set up campaigns without manual data entry. Available on Professional and Enterprise plans."
            />
            <FAQItem
              q="Can I customise the messages clients receive?"
              a="Yes. You can customise the tone, branding, and content of every message in the escalation sequence. Add your practice logo, adjust the copy, and set the schedule for each channel."
            />
            <FAQItem
              q="What happens after the beta?"
              a="Early waitlist members will receive priority access and a founding member discount. We're launching in phases — starting with email-only campaigns, then adding SMS, WhatsApp, and Xero integration."
            />
          </div>
        </div>
      </Section>

      {/* ========== FINAL CTA (Dark — bookend) ========== */}
      <section className="py-20 md:py-32 px-6 relative overflow-hidden bg-zinc-950">
        {/* Noise overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Teal glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#0d9488]/10 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 max-w-3xl mx-auto text-center"
        >
          <h2 className={`${dmSerif.className} text-4xl md:text-6xl text-white leading-tight mb-6`}>
            Reclaim <span className="text-[#2dd4bf] italic">750 hours</span>
            <br />a year.
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Join the waitlist for early access. Be the first to stop chasing and start collecting.
          </p>
          {waitlistSubmitted ? (
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-[#0d9488]/10 border border-[#0d9488]/30 rounded-[10px] text-[#2dd4bf] font-medium text-lg">
              <CheckCircle className="w-5 h-5" /> You&apos;re on the list!
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                if (email) {
                  console.log("Waitlist signup:", email);
                  setWaitlistSubmitted(true);
                }
              }}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@yourpractice.co.uk"
                className="w-full sm:flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-[10px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#0d9488]/50 focus:ring-1 focus:ring-[#0d9488]/30 transition-all"
              />
              <button
                type="submit"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0d9488] text-white font-semibold rounded-[10px] hover:bg-[#0f766e] transition-all duration-200 text-base whitespace-nowrap"
              >
                Join Waitlist
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}
        </motion.div>
      </section>

      {/* ========== FOOTER (Dark — matches sidebar) ========== */}
      <footer className="bg-[#1c1917] border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className={`${dmSerif.className} text-lg text-white`}>
            Chase<span className="text-[#0d9488]">.md</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="mailto:hello@chase.md" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} chase.md. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
