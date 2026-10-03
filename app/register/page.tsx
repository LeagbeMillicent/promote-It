"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Lock, Mail, Store, User } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Create user via staff endpoint or register endpoint
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          status: "ACTIVE",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Registration could not be completed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Could not connect to store server");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand-center">
          <div className="auth-logo-frame">
            <Image
              src="/img/PromoteItLogo2.png"
              alt="promoteIt Ventures"
              width={200}
              height={200}
              className="auth-logo-hero"
              priority
            />
          </div>
        </div>
        <div className="auth-header">
          <h1>Create store account</h1>
          <p>Set up your PromoteIt store profile and credentials.</p>
        </div>

        {success ? (
          <div className="inline-notice" style={{ marginBottom: "16px" }}>
            Account created successfully! Redirecting to sign in...
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label>
              <span>Store or business name</span>
              <div className="input-with-icon">
                <Store size={17} />
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Accra Central Outlet"
                  required
                />
              </div>
            </label>

            <label>
              <span>Owner full name</span>
              <div className="input-with-icon">
                <User size={17} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kofi Owusu"
                  required
                />
              </div>
            </label>

            <label>
              <span>Work email address</span>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kofi@promoteit.ventures"
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="input-with-icon">
                <Lock size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="primary-button"
              style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Register store account"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
