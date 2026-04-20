import { LoginForm } from "@/components/auth/LoginForm"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
      <LoginForm />
    </div>
  )
}
