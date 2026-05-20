import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'

export default function SignUp() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (err?.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters')
      } else {
        setError('Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Ambient background glow */}
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
        {/* Brand */}
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-foreground">
            Gallery<span className="text-gold">Ledger</span>
          </h1>
          <div className="mx-auto mt-3 h-px w-12 bg-gold/40" />
          <p className="mt-4 text-sm tracking-wide text-muted-foreground">
            Create your gallery account
          </p>
        </div>

        {/* Form */}
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-12 border-border/60 bg-card px-4 text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-gold focus-visible:ring-gold/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest text-muted-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-12 border-border/60 bg-card px-4 text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-gold focus-visible:ring-gold/30"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground transition-all hover:bg-gold/90 hover:shadow-[0_0_20px_rgba(184,149,106,0.15)]"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </motion.form>

        <motion.p
          className="mt-8 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Already have an account?{' '}
          <Link to="/signin" className="text-gold transition-colors hover:text-gold/80">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
