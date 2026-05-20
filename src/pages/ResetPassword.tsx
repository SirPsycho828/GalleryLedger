import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError('Failed to send reset link. Check your email address.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/20 bg-gold/5">
            <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-medium tracking-tight">Check Your Email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a password reset link to <span className="text-foreground">{email}</span>
          </p>
          <Link
            to="/signin"
            className="mt-8 inline-block text-sm text-gold transition-colors hover:text-gold/80"
          >
            Back to sign in
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-12 text-center">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">
            Reset Password
          </h1>
          <div className="mx-auto mt-3 h-px w-12 bg-gold/40" />
          <p className="mt-4 text-sm tracking-wide text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 border-border/60 bg-card px-4 text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-gold focus-visible:ring-gold/30"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground transition-all hover:bg-gold/90 hover:shadow-[0_0_20px_rgba(184,149,106,0.15)]"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </motion.form>

        <motion.p
          className="mt-8 text-center text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link to="/signin" className="text-gold transition-colors hover:text-gold/80">
            Back to sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
