import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Smartphone,
  FileCheck,
  Upload,
  Clock,
  LayoutDashboard,
  Plug,
  ArrowRight,
  Check,
  AlertTriangle,
  Star,
  ChevronDown,
} from "lucide-react";

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950" />
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <AlertTriangle className="h-3.5 w-3.5" />
          MTD ITSA launches April 2026 — your chasing burden is about to 4×
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
          Stop Chasing.{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Start Collecting.
          </span>
        </h1>
        <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          chase.md automatically chases your clients for tax documents — via email,
          SMS, and WhatsApp. AI verifies what they send. You just watch the
          dashboard turn green.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-600/25"
          >
            Start Your 14-Day Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl font-semibold text-lg transition border border-gray-700/50"
          >
            Watch It Work
            <span className="text-sm text-gray-500">2 min</span>
          </a>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          <span>No credit card required</span>
          <span className="h-1 w-1 rounded-full bg-gray-700" />
          <span>Setup in under an hour</span>
          <span className="h-1 w-1 rounded-full bg-gray-700" />
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Problem ─── */
function Problem() {
  const pains = [
    {
      title: "The Hours",
      stat: "750",
      unit: "hours/year",
      desc: "Your team spends 500–750 hours per year on document chasing. That's a full-time hire doing nothing but sending \"Have you got your P60?\" emails. At £35/hour, that's £26,000 in wages — on admin.",
    },
    {
      title: "The Bottleneck",
      stat: "200",
      unit: "clients waiting",
      desc: "One client who won't send their bank statements holds up their entire tax return. Multiply that by 200 clients, and you've got a practice running at half capacity from October to January.",
    },
    {
      title: "The Staff Problem",
      stat: "£15k",
      unit: "per replacement",
      desc: "Nobody trained as an accountant to spend their days nagging clients. Your best people leave because the work is tedious. Recruitment costs you another £8–15k per head.",
    },
  ];

  return (
    <section className="py-24 px-6" id="problem">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center leading-tight">
          You&rsquo;re spending{" "}
          <span className="text-red-400">750 hours a year</span> asking for the
          same documents.
        </h2>
        <p className="mt-4 text-center text-lg text-gray-400 max-w-2xl mx-auto">
          You know the drill. January hits. You send out document request lists.
          Half your clients ignore them. Your staff spend weeks sending
          follow-ups that get ignored too.
        </p>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {pains.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8"
            >
              <div className="text-4xl font-bold text-red-400">{p.stat}</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mt-1">
                {p.unit}
              </div>
              <h3 className="text-xl font-semibold mt-4">{p.title}</h3>
              <p className="text-gray-400 mt-3 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Solution / How it works ─── */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Import your client list",
      desc: "Connect your practice management system or upload a CSV. Tell chase.md what documents you need from each client, or use our pre-built templates for SA100, Corporation Tax, VAT returns, and MTD ITSA.",
      icon: Upload,
    },
    {
      num: "02",
      title: "chase.md does the chasing",
      desc: "Automated sequences go out via email first, then escalate to SMS, then WhatsApp. Each message is personalised and timed based on deadline proximity. Clients get a simple upload link — no login, no portal password, no friction.",
      icon: MessageSquare,
    },
    {
      num: "03",
      title: "AI checks what comes back",
      desc: "When a client uploads, our AI verifies it's the right document. P60? Bank statement? Dividend voucher? chase.md confirms it matches what was requested and updates your dashboard automatically.",
      icon: FileCheck,
    },
  ];

  return (
    <section className="py-24 px-6 bg-gray-900/30" id="how-it-works">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center">
          Three steps. Zero nagging.
        </h2>
        <div className="mt-16 space-y-12">
          {steps.map((s) => (
            <div
              key={s.num}
              className="flex flex-col md:flex-row gap-8 items-start"
            >
              <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-600/10 border border-blue-500/20">
                <s.icon className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-mono text-blue-400 mb-1">
                  Step {s.num}
                </div>
                <h3 className="text-2xl font-semibold">{s.title}</h3>
                <p className="text-gray-400 mt-2 leading-relaxed max-w-2xl">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    {
      icon: Mail,
      title: "Multi-channel escalation",
      desc: "Email → SMS → WhatsApp. Escalates automatically based on client responsiveness. WhatsApp gets 3× the response rate of email.",
    },
    {
      icon: FileCheck,
      title: "AI document recognition",
      desc: "Clients upload a blurry photo of their P60? Our AI reads it, classifies it, and confirms it matches the request. No more back-and-forth.",
    },
    {
      icon: Upload,
      title: "Zero-friction client portal",
      desc: "Your client gets a link. They click it. They upload. No account creation, no passwords, no \"I can't log in\" support tickets.",
    },
    {
      icon: Clock,
      title: "Intelligent scheduling",
      desc: "Messages increase in frequency and directness as the deadline approaches. Early birds get gentle reminders. Last-minute clients get firm nudges.",
    },
    {
      icon: LayoutDashboard,
      title: "Practice dashboard",
      desc: "See every client, every document, every status — at a glance. Filter by missing documents, overdue items, or deadline.",
    },
    {
      icon: Plug,
      title: "Integrations",
      desc: "Connects with Xero Practice Manager, Iris, TaxCalc, and more. Documents sync back to your existing workflow.",
    },
  ];

  return (
    <section className="py-24 px-6" id="features">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center">
          Built for how practices{" "}
          <span className="text-blue-400">actually work</span>.
        </h2>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 hover:border-gray-700 transition"
            >
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 mb-4">
                <f.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-gray-400 mt-2 leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof ─── */
function SocialProof() {
  const testimonials = [
    {
      quote:
        "We collected 90% of SA100 documents by November for the first time ever. chase.md paid for itself in the first week.",
      name: "Sarah Mitchell",
      role: "Practice Manager",
      practice: "Mitchell & Partners",
    },
    {
      quote:
        "The WhatsApp escalation is a game-changer. Clients who ignored 6 emails responded to 1 WhatsApp in an hour.",
      name: "David Chen",
      role: "Director",
      practice: "Chen Accountancy",
    },
    {
      quote:
        "My team used to dread October. Now they barely notice it. We saved over 400 hours last tax year.",
      name: "Rachel Thompson",
      role: "Managing Partner",
      practice: "Thompson Gray LLP",
    },
  ];

  const stats = [
    { value: "92%", label: "document collection rate" },
    { value: "73%", label: "respond within 24 hours" },
    { value: "400+", label: "hours saved per practice per year" },
  ];

  return (
    <section className="py-24 px-6 bg-gray-900/30">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center">
          Practices that stopped chasing.
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 flex flex-col"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-500 text-yellow-500"
                  />
                ))}
              </div>
              <p className="text-gray-300 leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 pt-4 border-t border-gray-800">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-500">
                  {t.role}, {t.practice}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-bold text-blue-400">
                {s.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── MTD ITSA Urgency ─── */
function MtdUrgency() {
  return (
    <section className="py-24 px-6" id="mtd">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 text-sm text-amber-400 mb-6">
            <AlertTriangle className="h-3.5 w-3.5" />
            Regulatory deadline
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            MTD ITSA launches April 2026.{" "}
            <span className="text-amber-400">You&rsquo;re not ready.</span>
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed text-lg">
            Making Tax Digital for Income Tax Self Assessment means quarterly
            submissions for your sole trader and landlord clients. That&rsquo;s
            not 1× per year chasing — it&rsquo;s 4×.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-6">
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5">
              <div className="text-2xl font-bold text-amber-400">800</div>
              <div className="text-sm text-gray-400 mt-1">
                chasing cycles per year
              </div>
              <div className="text-xs text-gray-600 mt-1">
                200 clients × 4 quarters
              </div>
            </div>
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5">
              <div className="text-2xl font-bold text-amber-400">600</div>
              <div className="text-sm text-gray-400 mt-1">
                hours of chasing
              </div>
              <div className="text-xs text-gray-600 mt-1">
                45 min per client per cycle
              </div>
            </div>
            <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5">
              <div className="text-2xl font-bold text-amber-400">1–2</div>
              <div className="text-sm text-gray-400 mt-1">
                extra staff needed
              </div>
              <div className="text-xs text-gray-600 mt-1">
                if you don&rsquo;t automate
              </div>
            </div>
          </div>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl font-semibold transition"
          >
            Get ahead of MTD ITSA
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "79",
      desc: "For smaller practices getting started.",
      features: [
        "Up to 100 clients",
        "Email + SMS chasing",
        "Document upload portal",
        "Practice dashboard",
        "Standard templates",
        "Email support",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "149",
      desc: "Everything you need. Most practices start here.",
      features: [
        "Up to 300 clients",
        "Email + SMS + WhatsApp",
        "AI document recognition",
        "Custom chase sequences",
        "Xero PM / Iris integration",
        "Priority support",
      ],
      popular: true,
    },
    {
      name: "Practice",
      price: "249",
      desc: "For larger practices with complex needs.",
      features: [
        "Unlimited clients",
        "Everything in Professional",
        "Multi-user access (up to 10)",
        "Custom branding on portal",
        "API access",
        "Dedicated onboarding + phone support",
      ],
      popular: false,
    },
  ];

  return (
    <section className="py-24 px-6 bg-gray-900/30" id="pricing">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center">
          Costs less than one day of your admin team&rsquo;s time.
        </h2>
        <p className="mt-4 text-center text-lg text-gray-400">
          The average practice saves £1,100/month in admin time. That&rsquo;s a{" "}
          <span className="text-blue-400 font-semibold">14× return</span> on
          our most popular plan.
        </p>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                p.popular
                  ? "border-blue-500/50 bg-blue-950/20 shadow-lg shadow-blue-500/10"
                  : "border-gray-800 bg-gray-900/50"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">£{p.price}</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{p.desc}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-sm text-gray-300"
                  >
                    <Check className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={`mt-8 block text-center py-3 rounded-xl font-semibold transition ${
                  p.popular
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                }`}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          All plans include a 14-day free trial. No credit card required. Cancel
          anytime.
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const faqs = [
    {
      q: "How long does setup take?",
      a: "Most practices are up and running in under an hour. Import your client list, pick your templates, and chase.md starts working the same day.",
    },
    {
      q: "Will my clients find this annoying?",
      a: "No. The messages are polite, professional, and spaced sensibly. Clients who've already submitted don't get chased. Most clients actually prefer it — they get a simple link instead of trying to find your email.",
    },
    {
      q: "What if a client uploads the wrong document?",
      a: "Our AI flags mismatches automatically. You can set it to auto-request the correct document or review it yourself first.",
    },
    {
      q: "Does it work with my practice management software?",
      a: "We integrate with Xero Practice Manager, Iris, TaxCalc, and more. If you use something else, our CSV import works with everything.",
    },
    {
      q: "Is client data secure?",
      a: "All uploads are encrypted in transit and at rest. We're ICO registered, GDPR compliant, and hosted on UK/EU servers. We never access client documents — only our AI classification model processes them.",
    },
    {
      q: "What happens after my trial?",
      a: "You pick a plan or your account pauses. We don't delete anything. No sneaky charges.",
    },
  ];

  return (
    <section className="py-24 px-6" id="faq">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-center">
          Questions? Sorted.
        </h2>
        <div className="mt-16 space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-gray-800 bg-gray-900/50"
            >
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-lg [&::-webkit-details-marker]:hidden list-none">
                {f.q}
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTA() {
  return (
    <section className="py-24 px-6 bg-gray-900/30">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
          Your team didn&rsquo;t train for 3 years to send{" "}
          <span className="text-blue-400">reminder emails</span>.
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Start your 14-day free trial. First campaign goes out today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-blue-600/25"
          >
            Start Free Trial — No Card Required
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/80 hover:bg-gray-700 rounded-xl font-semibold text-lg transition border border-gray-700/50"
          >
            Book a 15-Minute Demo
          </a>
        </div>
        <p className="mt-8 text-sm text-gray-600">
          Built by someone who watched an accountant chase documents for 20 years. We get it.
        </p>
      </div>
    </section>
  );
}

/* ─── Nav ─── */
function Nav() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          chase<span className="text-blue-400">.md</span>
        </Link>
        <div className="hidden sm:flex items-center gap-8 text-sm text-gray-400">
          <a href="#how-it-works" className="hover:text-white transition">
            How It Works
          </a>
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-gray-400 hover:text-white transition hidden sm:block"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-gray-800 py-12 px-6">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-500">
          © 2025 chase.md. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-white transition">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition">
            Terms
          </a>
          <a href="#" className="hover:text-white transition">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <SocialProof />
      <MtdUrgency />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
