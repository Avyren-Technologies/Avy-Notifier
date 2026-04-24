'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input, PasswordInput } from '../components/ui/input';
import { cn } from '../lib/utils';

// ─── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const MIN_PASSWORD_LENGTH = 6;

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const {
    authState,
    login,
    clearError,
    hasSeenOnboarding,
    selectedAppType,
  } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authState.isLoading && authState.isAuthenticated) {
      if (hasSeenOnboarding && selectedAppType) {
        router.replace('/dashboard');
      } else {
        router.replace('/select-app');
      }
    }
  }, [
    authState.isLoading,
    authState.isAuthenticated,
    hasSeenOnboarding,
    selectedAppType,
    router,
  ]);

  // Clear auth errors when user starts typing
  useEffect(() => {
    if (authState.error) {
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateEmail = useCallback(
    (value: string) => {
      if (!emailTouched && value === '') return;
      if (value.trim() === '') {
        setEmailError('Email is required');
      } else if (!EMAIL_REGEX.test(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    },
    [emailTouched]
  );

  const validatePassword = useCallback(
    (value: string) => {
      if (!passwordTouched && value === '') return;
      if (value.trim() === '') {
        setPasswordError('Password is required');
      } else if (value.length < MIN_PASSWORD_LENGTH) {
        setPasswordError('Password must be at least 6 characters');
      } else {
        setPasswordError('');
      }
    },
    [passwordTouched]
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) validateEmail(val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordTouched) validatePassword(val);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Force-touch both fields so errors appear
    setEmailTouched(true);
    setPasswordTouched(true);
    validateEmail(email);
    validatePassword(password);

    // Check if valid
    const hasEmailError =
      email.trim() === '' || !EMAIL_REGEX.test(email);
    const hasPasswordError =
      password.trim() === '' || password.length < MIN_PASSWORD_LENGTH;

    if (hasEmailError || hasPasswordError) return;

    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch {
      // Auth context handles the error state
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Error banner helper ─────────────────────────────────────────────────────

  const errorBannerStyles = () => {
    if (!authState.error) return {};
    switch (authState.errorType) {
      case 'warning':
        return {
          wrapper:
            'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700',
          icon: 'text-amber-500 dark:text-amber-400',
          text: 'text-amber-800 dark:text-amber-200',
        };
      case 'info':
        return {
          wrapper:
            'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700',
          icon: 'text-blue-500 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-200',
        };
      default:
        return {
          wrapper:
            'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700',
          icon: 'text-red-500 dark:text-red-400',
          text: 'text-red-800 dark:text-red-200',
        };
    }
  };

  const errorIcon = () => {
    switch (authState.errorType) {
      case 'warning':
        return (
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      default:
        return (
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
    }
  };

  // ── Loading gate ────────────────────────────────────────────────────────────

  if (authState.isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <svg
          className="h-6 w-6 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const styles = errorBannerStyles();

  return (
    <div className="flex min-h-screen">
      {/* ─── Left: Branding Panel ──────────────────────────────────────── */}
      <div className="login-brand-panel relative hidden w-[45%] min-w-[420px] overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0 login-gradient-bg" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Floating orbs */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl login-float-1" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/8 blur-3xl login-float-2" />
        <div className="absolute top-1/3 left-1/4 h-40 w-40 rounded-full bg-white/6 blur-2xl login-float-3" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          {/* Logo */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 shadow-2xl shadow-black/20 ring-1 ring-white/20 backdrop-blur-sm">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              AV
            </span>
          </div>

          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white">
            Avy Notifier
          </h1>

          <div className="mb-8 inline-flex rounded-full bg-white/15 px-5 py-2 backdrop-blur-sm">
            <p className="text-sm font-semibold text-white/90">
              SCADA Monitoring Platform
            </p>
          </div>

          <p className="max-w-sm text-base leading-relaxed text-white/70">
            Real-time industrial monitoring for furnace operations and
            electrical meter parameters. Enterprise-grade reliability.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {['Real-time Alerts', 'Analytics', 'Multi-tenant'].map(
              (feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm"
                >
                  {feature}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* ─── Right: Login Form ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 sm:px-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile branding (visible on smaller screens) */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-[hsl(var(--info))] to-primary shadow-lg shadow-primary/25">
              <span className="text-2xl font-extrabold text-white">AV</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Avy Notifier
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              SCADA Monitoring Platform
            </p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to access your monitoring dashboard
            </p>
          </div>

          {/* Auth error banner */}
          {authState.error && (
            <div
              className={cn(
                'mb-6 flex items-start gap-3 rounded-xl border p-4',
                styles.wrapper
              )}
              role="alert"
            >
              <span className={styles.icon}>{errorIcon()}</span>
              <p className={cn('text-sm font-medium leading-relaxed', styles.text)}>
                {authState.error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                setEmailTouched(true);
                validateEmail(email);
              }}
              error={emailTouched ? emailError : undefined}
              autoComplete="email"
              autoFocus
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>
              <PasswordInput
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => {
                  setPasswordTouched(true);
                  validatePassword(password);
                }}
                autoComplete="current-password"
              />
              {passwordTouched && passwordError && (
                <p className="text-xs text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe((v) => !v)}
                className={cn(
                  'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors duration-150',
                  'h-[18px] w-[18px]',
                  rememberMe
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:border-primary/60'
                )}
              >
                {rememberMe && (
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-muted-foreground select-none">
                Remember me
              </span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full text-[15px] font-semibold"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Secure connection indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-xs font-medium">
              Secure encrypted connection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
