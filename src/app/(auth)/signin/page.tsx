import { SignInForm } from "@/features/auth/components/signin-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Catat Duit</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your personal finance tracker.
        </p>
      </div>
      <SignInForm />
    </main>
  );
}
