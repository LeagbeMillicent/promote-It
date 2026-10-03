"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Sign-in failed");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network or server connection failed");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Full-page Watermark Logo */}
      <div className="auth-watermark" aria-hidden="true">
        <Image
          src="/img/PromoteItLogo2.png"
          alt=""
          fill
          priority
          className="auth-watermark-img"
        />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-brand-eyebrow">promoteIt Ventures</span>
          <h1>Sign in to your store</h1>
          <p>Access your sales, inventory, and operations management dashboard.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email address</span>
            <div className="input-with-icon">
              <User size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@promoteit.ventures"
                required
              />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="input-with-icon">
              <Lock size={17} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            type="submit"
            className="primary-button"
            style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in to Store"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-footer">
          Need an account? <Link href="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}