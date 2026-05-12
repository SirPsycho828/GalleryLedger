import { Link } from 'react-router'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-medium">
          Gallery<span className="text-gold">Ledger</span>
        </h1>
        <p className="mt-4 text-muted-foreground">Coming soon</p>
        <Link to="/signin" className="mt-8 inline-block text-gold underline">Sign In</Link>
      </div>
    </div>
  )
}
