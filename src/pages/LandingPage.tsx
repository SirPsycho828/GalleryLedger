import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronDown, ClipboardCheck, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Track Every Detail',
    description: 'Document intake, provenance, and location history for every work in your collection. Full timeline from arrival to sale.',
  },
  {
    icon: Shield,
    title: 'Document Condition',
    description: 'Detailed condition assessments with photo evidence, checklists, and digital signature capture at intake.',
  },
  {
    icon: Users,
    title: 'Manage Consignors',
    description: 'Track consignor relationships, commission structures, payouts, and outstanding balances in one place.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero — full viewport */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image with Ken Burns */}
        <div className="absolute inset-0">
          <img
            src="/images/hero.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40 animate-[ken-burns_20s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 px-4 text-center"
        >
          <h1 className="font-heading text-5xl font-medium tracking-tight md:text-7xl">
            Gallery<span className="text-gold">Ledger</span>
          </h1>
          <div className="mx-auto mt-4 h-px w-12 bg-gold/50" />
          <p className="mx-auto mt-6 max-w-md text-base text-muted-foreground md:text-lg">
            Provenance tracking for the modern gallery
          </p>
          <Link to="/signup">
            <Button className="mt-10 h-12 px-10 bg-gold text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90 hover:shadow-[0_0_30px_rgba(201,169,110,0.2)]">
              Get Started
            </Button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature sections */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="space-y-24 md:space-y-32">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`flex flex-col items-center gap-8 text-center md:flex-row md:text-left md:gap-16 ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Icon */}
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center border border-border/50 bg-card">
                <feature.icon className="h-8 w-8 text-gold" strokeWidth={1} />
              </div>

              {/* Text */}
              <div className="max-w-md">
                <h2 className="font-heading text-2xl font-medium md:text-3xl">{feature.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative border-t border-border/30 py-24 text-center">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="px-4"
        >
          <h2 className="font-heading text-3xl font-medium md:text-4xl">
            Gallery<span className="text-gold">Ledger</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Start managing your collection</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/signin">
              <Button variant="outline" className="h-11 px-8 border-gold/30 text-gold hover:bg-gold/10 text-sm font-medium uppercase tracking-widest">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="h-11 px-8 bg-gold text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90">
                Create Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
          &copy; 2026 GalleryLedger
        </p>
      </footer>
    </div>
  )
}
