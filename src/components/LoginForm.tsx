"use client";

import { useActionState } from "react";
import { signIn } from "@/app/login/actions";
import { button, field } from "./ui";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      {/* Lets a password manager file the passcode under a name. */}
      <input type="text" name="username" autoComplete="username" defaultValue="household" readOnly hidden />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Passcode
        <input
          type="password"
          name="passcode"
          required
          autoFocus
          autoComplete="current-password"
          aria-describedby={error ? "login-error" : undefined}
          className={field}
        />
      </label>
      {error && (
        <p id="login-error" role="alert" className="text-sm">
          {error}
        </p>
      )}
      <button disabled={pending} className={button}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
