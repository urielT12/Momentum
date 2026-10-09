import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Momentum</h1>
        <p className="mt-1 text-muted">Workouts, steps and meals in one place.</p>
      </div>
      <LoginForm />
    </main>
  );
}
