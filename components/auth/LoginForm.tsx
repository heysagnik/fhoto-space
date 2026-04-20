"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { authClient } from "@/lib/auth-client"

function PasswordField({
  value, onChange, error, autoComplete,
}: { value: string; onChange: (v: string) => void; error?: boolean; autoComplete: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="password">Password</Label>
        <button type="button" tabIndex={-1} onClick={() => setVisible((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <Input
        id="password"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        autoComplete={autoComplete}
        required
        className={error ? "border-red-400 focus-visible:ring-red-400" : ""}
      />
    </div>
  )
}

function SignInPanel() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    const result = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      callbackURL: "/dashboard",
    })
    if (result.error) {
      setError(result.error.message ?? "Invalid email or password")
      setIsLoading(false)
      return
    }
    router.push("/dashboard")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signin-email">Email address</Label>
        <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" required />
      </div>
      <PasswordField value={password} onChange={setPassword} error={!!error} autoComplete="current-password" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading} className="mt-1 w-full">
        {isLoading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}

function SignUpPanel() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setIsLoading(true)
    const result = await authClient.signUp.email({ name: name.trim(), email: email.trim().toLowerCase(), password })
    if (result.error) {
      setError(result.error.message ?? "Could not create account")
      setIsLoading(false)
      return
    }
    router.push("/dashboard")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">Email address</Label>
        <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" autoComplete="email" required />
      </div>
      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading} className="mt-1 w-full">
        {isLoading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}

export function LoginForm() {
  return (
    <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-lg p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">FotoSpace</h1>
        <p className="text-sm text-slate-500 mt-0.5">Photographer client delivery</p>
      </div>
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="signin"><SignInPanel /></TabsContent>
        <TabsContent value="signup"><SignUpPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
