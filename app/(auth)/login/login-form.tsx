"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validation/schemas";

export function LoginForm({ setupError }: { setupError: boolean }) {
  const router = useRouter();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        form.setError("root", { message: "Sign-in failed. Check your email and password, then try again." });
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      form.setError("root", { message: "Sign-in is temporarily unavailable. Try again in a moment." });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {setupError ? (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Supabase is not configured. Add the project URL and public anon key to the application environment.
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={form.formState.errors.email ? "email-error" : undefined}
          {...form.register("email")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
        />
        {form.formState.errors.email ? <p id="email-error" className="mt-1 text-sm text-red-700">{form.formState.errors.email.message}</p> : null}
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          aria-describedby={form.formState.errors.password ? "password-error" : undefined}
          {...form.register("password")}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm"
        />
        {form.formState.errors.password ? <p id="password-error" className="mt-1 text-sm text-red-700">{form.formState.errors.password.message}</p> : null}
      </div>
      {form.formState.errors.root ? <p role="alert" className="text-sm text-red-700">{form.formState.errors.root.message}</p> : null}
      <button type="submit" disabled={form.formState.isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-wait disabled:opacity-70">
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
