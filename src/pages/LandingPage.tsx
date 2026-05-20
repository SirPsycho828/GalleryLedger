import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ClipboardCheck,
  Shield,
  Users,
  FileText,
  Camera,
  Clock,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Camera,
    image: '/images/feature-provenance.jpg',
    title: 'Photograph & Record Every Detail',
    description:
      'Capture high-resolution photos at intake, document condition with a 12-point checklist, and collect digital signatures — all in one seamless flow. Every detail is timestamped and stored permanently.',
    alt: 'Person viewing framed gallery photographs',
  },
  {
    icon: Shield,
    image: '/images/feature-condition.jpg',
    title: 'Dispute-Proof Documentation',
    description:
      'Every condition update, location move, and status change is recorded in an append-only timeline. No edits, no deletions — just an unalterable record that protects everyone involved.',
    alt: 'Detailed street art mural close-up',
  },
  {
    icon: Users,
    image: '/images/feature-gallery.jpg',
    title: 'Manage Consignors with Clarity',
    description:
      'Track consignor relationships, commission structures, payouts, and outstanding balances in one place. Know exactly what you owe and what\'s been paid — always.',
    alt: 'Classical oil painting',
  },
  {
    icon: FileText,
    image: '/images/feature-export.jpg',
    title: 'Export Provenance Packs Instantly',
    description:
      'Generate comprehensive PDF provenance reports with cover photo, condition history, timeline events, financial summary, and signatures. Share via link or download — ready for buyers, insurers, or legal review.',
    alt: 'Warm-toned library archive with curved shelves',
  },
]

const steps = [
  {
    num: '01',
    title: 'Create Your Gallery',
    description: 'Sign up and name your gallery. Your private vault is ready in seconds.',
  },
  {
    num: '02',
    title: 'Intake Your First Work',
    description: 'Photograph the artwork, assess condition, capture the consignor\'s signature, and create a complete record.',
  },
  {
    num: '03',
    title: 'Track Everything After',
    description: 'Log condition changes, location moves, sales, and payouts. Export provenance packs whenever you need them.',
  },
]

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const spotlightReveal = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/40'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="font-heading text-2xl font-medium tracking-tight">
          Gallery<span className="text-gold">Ledger</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/signin">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-sm tracking-wide"
            >
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground hover:bg-gold/90 hover:shadow-[0_0_24px_rgba(184,149,106,0.15)]">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-foreground md:hidden"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-border/40 bg-background/95 backdrop-blur-xl px-6 pb-6 md:hidden"
        >
          <div className="flex flex-col gap-3 pt-2">
            <Link to="/signin" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full border-border/50 text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/signup" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground">
                Get Started
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background image with Ken Burns */}
      <div className="absolute inset-0">
        <img
          src="/images/hero.jpg"
          alt=""
          className="h-full w-full object-cover opacity-35 animate-[ken-burns_25s_ease-in-out_infinite_alternate]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/20 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl"
        >
          <motion.div variants={spotlightReveal}>
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-gold/80">
              Provenance Tracking for the Modern Gallery
            </p>
          </motion.div>

          <motion.h1
            variants={spotlightReveal}
            className="font-heading text-5xl font-semibold leading-[1.1] tracking-tight md:text-7xl lg:text-[5.5rem]"
          >
            Every Artwork
            <br />
            <span className="text-gold">Deserves a Record</span>
          </motion.h1>

          <motion.div variants={spotlightReveal} className="mx-auto mt-5 h-px w-16 bg-gold/40" />

          <motion.p
            variants={spotlightReveal}
            className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Document intake, track condition, manage consignors, and export
            provenance packs — all from your phone. An unalterable record that
            protects your gallery.
          </motion.p>

          <motion.div
            variants={spotlightReveal}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link to="/signup">
              <Button className="h-13 px-10 bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground hover:bg-gold/90 hover:shadow-[0_0_30px_rgba(184,149,106,0.2)] transition-all duration-300">
                Start Free
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="ghost"
                className="h-13 px-8 text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
              >
                See How It Works
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground/40" strokeWidth={1} />
        </motion.div>
      </motion.div>
    </section>
  )
}

function FeatureSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mb-20 text-center md:mb-28"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold/70">
          Built for Galleries
        </p>
        <h2 className="mt-4 font-heading text-3xl font-medium md:text-5xl">
          Everything You Need to Protect Your Collection
        </h2>
      </motion.div>

      <div className="space-y-28 md:space-y-36">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className={`flex flex-col items-center gap-10 md:gap-16 ${
              i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* Visual */}
            <div className="w-full flex-shrink-0 md:w-1/2">
              {feature.image ? (
                <div className="group relative aspect-[4/3] overflow-hidden border border-border/30 bg-card">
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center border border-border/30 bg-card">
                  <feature.icon className="h-20 w-20 text-gold/30" strokeWidth={0.75} />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="w-full md:w-1/2">
              <div className="flex h-10 w-10 items-center justify-center border border-gold/20 bg-accent">
                <feature.icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-medium md:text-3xl">
                {feature.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {feature.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/20 bg-card/50 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16 text-center md:mb-20"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold/70">
            How It Works
          </p>
          <h2 className="mt-4 font-heading text-3xl font-medium md:text-5xl">
            Up and Running in Minutes
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-10 md:grid-cols-3 md:gap-8"
        >
          {steps.map((step) => (
            <motion.div key={step.num} variants={fadeUp} className="relative text-center md:text-left">
              <span className="font-heading text-5xl font-semibold text-gold/15">{step.num}</span>
              <h3 className="mt-2 font-heading text-xl font-medium">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function StatsStrip() {
  const stats = [
    { value: 'Offline-First', label: 'Works without internet' },
    { value: 'Append-Only', label: 'Tamper-proof timeline' },
    { value: 'PDF Export', label: 'Provenance packs on demand' },
  ]

  return (
    <section className="border-y border-border/20 py-16">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-10 px-6 md:flex-row md:gap-20"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="text-center">
            <div className="font-heading text-2xl font-medium text-gold">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="relative py-28 md:py-36">
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.03] blur-[100px]" />
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="font-heading text-3xl font-medium md:text-5xl">
          Ready to Protect
          <br />
          <span className="text-gold">Your Collection?</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          Join galleries who document every artwork with confidence.
          Free to start — no credit card required.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/signup">
            <Button className="h-13 px-12 bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground hover:bg-gold/90 hover:shadow-[0_0_30px_rgba(184,149,106,0.2)] transition-all duration-300">
              Create Your Gallery
            </Button>
          </Link>
          <Link to="/signin">
            <Button
              variant="outline"
              className="h-13 px-8 border-gold/25 text-[13px] font-medium uppercase tracking-[0.08em] text-gold hover:bg-gold/10"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/20 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <span className="font-heading text-lg font-medium tracking-tight">
          Gallery<span className="text-gold">Ledger</span>
        </span>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
          &copy; {new Date().getFullYear()} GalleryLedger
        </p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <LandingNav />
      <HeroSection />
      <StatsStrip />
      <FeatureSection />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  )
}
