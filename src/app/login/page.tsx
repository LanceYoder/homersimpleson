import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in · Homer" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Homer</h1>
        <p className="mt-1 text-muted">Enter the household passcode to open it on this device.</p>
      </header>
      <LoginForm />
    </main>
  );
}
