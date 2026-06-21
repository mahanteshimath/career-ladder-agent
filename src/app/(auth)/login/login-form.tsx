"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AuthStep = "email" | "otp";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const { status } = useSession();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    errorParam === "CredentialsSignin" ? "Invalid or expired code. Please try again." :
    errorParam === "OAuthAccountNotLinked" ? "Email already used with a different sign-in method." :
    errorParam ? "Sign-in failed. Please try again." : ""
  );

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setStep("otp");
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error?.message || data.error || "Failed to send code.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and sign in
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      otp: code,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid or expired code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } else if (result?.url) {
      window.location.href = result.url;
    }
  };

  // OTP input handler with auto-focus
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // single digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every((d) => d !== "")) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  // Handle paste of full OTP
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-lg font-bold text-white">CL</span>
          </div>
        </div>
        <h1 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">
          {step === "email" ? "Welcome back" : "Enter verification code"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-8">
          {step === "email"
            ? "Sign in to access your dashboard"
            : `We sent a 6-digit code to ${email}`}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {step === "email" ? (
          <>
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            <form onSubmit={handleSendOtp}>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                required
                autoComplete="email"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full mt-3 bg-blue-600 text-white rounded-xl py-3 px-4 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending code...
                  </span>
                ) : (
                  "Continue with Email"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg font-bold border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-blue-600 text-white rounded-xl py-3 px-4 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/25"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← Use different email
              </button>
              <button
                onClick={handleSendOtp as unknown as () => void}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-8">
          By signing in, you agree to our{" "}
          <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Terms</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-gray-700 dark:hover:text-gray-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

function getSafeCallbackUrl(callbackUrl: string | null) {
  if (!callbackUrl) {
    return "/dashboard";
  }

  try {
    const parsed = new URL(callbackUrl, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return "/dashboard";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}
