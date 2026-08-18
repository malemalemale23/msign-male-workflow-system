"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm({
  labels,
}: {
  labels: {
    title: string;
    subtitle: string;
    username: string;
    password: string;
    signIn: string;
    signingIn: string;
    invalidLogin: string;
    enterBoth: string;
  };
}) {
  const [state, formAction, pending] = useActionState(login, undefined);

  const errorText =
    state?.error === "invalid"
      ? labels.invalidLogin
      : state?.error === "missing"
        ? labels.enterBoth
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow dark:bg-slate-900">
        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {labels.title}
        </h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{labels.subtitle}</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {labels.username}
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {labels.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {errorText && <p className="text-sm text-red-600 dark:text-red-400">{errorText}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {pending ? labels.signingIn : labels.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
