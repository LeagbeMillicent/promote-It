"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  Bell,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  FolderTree,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_SETTINGS, StoreSettings } from "@/lib/settings-types";

type TeamUser = {
  id: string;
  userId?: string;
  values: string[];
  status?: string;
  tone?: string;
};

type CurrentUserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function getInitialSettings(): StoreSettings {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("promoteit_store_settings");
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      // fallback to DEFAULT_SETTINGS
    }
  }
  return DEFAULT_SETTINGS;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(getInitialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Password reset state
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("pos_current_user");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");

  // Fetch latest settings, current user, and team users on mount
  useEffect(() => {
    let isMounted = true;

    // Load store settings
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StoreSettings | null) => {
        if (!isMounted || !data) return;
        setSettings((prev) => ({ ...prev, ...data }));
        try {
          localStorage.setItem("promoteit_store_settings", JSON.stringify(data));
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.warn("Could not load server settings, using local copy:", err);
      });

    // Load current authenticated user profile
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((userData: CurrentUserProfile | null) => {
        if (!isMounted || !userData) return;
        setCurrentUser(userData);
        try {
          localStorage.setItem("pos_current_user", JSON.stringify(userData));
        } catch {
          // ignore
        }
      })
      .catch(() => {});

    // Load team users list for password management
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((usersData: TeamUser[]) => {
        if (!isMounted || !Array.isArray(usersData)) return;
        setTeamUsers(usersData);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    const payload: StoreSettings = {
      ...settings,
      storeName: settings.storeName.trim() || DEFAULT_SETTINGS.storeName,
      storeLocation: settings.storeLocation.trim() || DEFAULT_SETTINGS.storeLocation,
      phone: settings.phone.trim() || DEFAULT_SETTINGS.phone,
      receiptFooter: settings.receiptFooter.trim(),
      reorderThreshold: String(settings.reorderThreshold).trim() || "5",
    };

    // 1. Immediate local persistence
    try {
      localStorage.setItem("promoteit_store_settings", JSON.stringify(payload));
      localStorage.setItem("pos_store_name", payload.storeName);
      localStorage.setItem("pos_store_location", payload.storeLocation);
      localStorage.setItem("pos_store_phone", payload.phone);
      localStorage.setItem("pos_store_currency", payload.currency);
      localStorage.setItem("pos_receipt_footer", payload.receiptFooter);
      window.dispatchEvent(new CustomEvent("promoteit_settings_updated", { detail: payload }));
    } catch (storageErr) {
      console.warn("LocalStorage save warning:", storageErr);
    }

    // 2. Remote backend persistence
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || "Failed to update settings on server");
      }

      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
      }, 4000);
    } catch (err) {
      console.error("Failed to save settings to server:", err);
      // Still saved locally
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
      }, 4000);
    } finally {
      setIsSaving(false);
    }
  }

  // Password reset logic
  const isSelfAccount =
    selectedUserId === "me" || (currentUser && selectedUserId === currentUser.id);

  const selectedStaff = teamUsers.find(
    (u) => (u.userId || u.id) === selectedUserId
  );
  const selectedStaffName = selectedStaff?.values?.[0] || "staff member";

  // Calculate password strength indicator
  const strengthScore = (() => {
    if (!newPassword) return 0;
    if (newPassword.length < 6) return 1;
    let score = 2;
    if (
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[0-9!@#$%^&*]/.test(newPassword)
    ) {
      score = 3;
    }
    return score;
  })();

  const strengthLabel = (() => {
    if (strengthScore === 1) return "Too short (min 6 chars)";
    if (strengthScore === 2) return "Good password";
    if (strengthScore === 3) return "Strong password";
    return "";
  })();

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  function handleClearPasswordFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordResetError("");
  }

  async function handleResetPassword(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPasswordResetError("");
    setPasswordResetSuccess("");

    if (!newPassword) {
      setPasswordResetError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordResetError("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordResetError("Passwords do not match");
      return;
    }

    setIsResettingPassword(true);

    try {
      const targetId = selectedUserId === "me" ? "me" : selectedUserId;
      const payload: { password: string; currentPassword?: string } = {
        password: newPassword,
      };

      if (isSelfAccount && currentPassword.trim()) {
        payload.currentPassword = currentPassword.trim();
      }

      const res = await fetch(`/api/users/${targetId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      const displayName = isSelfAccount
        ? currentUser?.name || "your account"
        : selectedStaffName;

      setPasswordResetSuccess(`Password for ${displayName} was updated successfully!`);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setPasswordResetSuccess("");
      }, 6000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      setPasswordResetError(message);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <AppShell active="/settings">
      <div className="page-wrap settings-page">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <ShieldCheck size={14} /> Workspace controls
            </div>
            <h1>Store Settings</h1>
            <p>Configure store details, security credentials, accepted tenders, and alerts.</p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </section>

        {savedNotice && (
          <div className="inline-notice">
            <Check size={16} /> Store configuration and preferences saved successfully!
          </div>
        )}

        {errorMessage && (
          <div
            className="inline-notice"
            style={{
              background: "var(--status-red-bg)",
              color: "var(--status-red)",
              borderColor: "var(--status-red)",
            }}
          >
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        <div className="settings-grid">
          {/* Store Profile Card */}
          <section className="panel settings-card">
            <div className="settings-icon blue">
              <Building2 size={20} />
            </div>
            <div>
              <h2>Store Profile & Receipt Info</h2>
              <p>Details printed on customer receipts and audit trails.</p>
            </div>
            <label>
              Store legal name
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                required
              />
            </label>
            <label>
              Operating location / Branch
              <input
                type="text"
                value={settings.storeLocation}
                onChange={(e) => updateField("storeLocation", e.target.value)}
                required
              />
            </label>
            <label>
              Support phone number
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </label>
            <label>
              Store operating currency
              <select
                value={settings.currency}
                onChange={(e) => updateField("currency", e.target.value)}
              >
                <option value="GHS">GHS · Ghanaian Cedi (₵)</option>
                <option value="USD">USD · US Dollar ($)</option>
                <option value="EUR">EUR · Euro (€)</option>
                <option value="GBP">GBP · British Pound (£)</option>
              </select>
            </label>
            <label>
              Receipt footer message
              <input
                type="text"
                value={settings.receiptFooter}
                onChange={(e) => updateField("receiptFooter", e.target.value)}
              />
            </label>
          </section>

          {/* Account Security & Password Reset Card */}
          <section className="panel settings-card" id="security-reset-password">
            <div className="settings-icon purple">
              <KeyRound size={20} />
            </div>
            <div>
              <h2>Account Security & Password Reset</h2>
              <p>Update your login password or reset access credentials for staff.</p>
            </div>

            {passwordResetSuccess && (
              <div
                className="inline-notice"
                style={{
                  background: "var(--status-green-bg)",
                  color: "var(--status-green)",
                  borderColor: "var(--status-green-border)",
                  margin: 0,
                }}
              >
                <Check size={16} /> {passwordResetSuccess}
              </div>
            )}

            {passwordResetError && (
              <div
                className="inline-notice"
                style={{
                  background: "var(--status-red-bg)",
                  color: "var(--status-red)",
                  borderColor: "var(--status-red-border)",
                  margin: 0,
                }}
              >
                <AlertCircle size={16} /> {passwordResetError}
              </div>
            )}

            <label>
              Target account
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPasswordResetError("");
                  setPasswordResetSuccess("");
                }}
              >
                <option value="me">
                  My Account ({currentUser?.name || "Active Session"} · {currentUser?.role || "Owner"})
                </option>
                {teamUsers.map((u) => {
                  const uid = u.userId || u.id;
                  if (currentUser && uid === currentUser.id) return null;
                  return (
                    <option key={uid} value={uid}>
                      {u.values[0]} ({u.values[2]} · {u.values[1]})
                    </option>
                  );
                })}
              </select>
            </label>

            <div>
              <span className={`account-context-badge ${isSelfAccount ? "blue" : "purple"}`}>
                {isSelfAccount ? <ShieldCheck size={13} /> : <Users size={13} />}
                {isSelfAccount
                  ? "Updating your active session password"
                  : `Admin credential reset for ${selectedStaffName}`}
              </span>
            </div>

            {isSelfAccount && (
              <label>
                Current password (optional verification)
                <div className="settings-password-field">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password if known"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="settings-password-toggle"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}

            <label>
              New password
              <div className="settings-password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-password-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  title={showNewPassword ? "Hide password" : "Show password"}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword && (
                <div style={{ marginTop: "4px" }}>
                  <div className="password-strength-bar">
                    <div
                      className={`strength-segment ${
                        strengthScore >= 1
                          ? strengthScore === 1
                            ? "active-weak"
                            : strengthScore === 2
                            ? "active-medium"
                            : "active-strong"
                          : ""
                      }`}
                    />
                    <div
                      className={`strength-segment ${
                        strengthScore >= 2
                          ? strengthScore === 2
                            ? "active-medium"
                            : "active-strong"
                          : ""
                      }`}
                    />
                    <div
                      className={`strength-segment ${
                        strengthScore >= 3 ? "active-strong" : ""
                      }`}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    <span>{strengthLabel}</span>
                    <span>{newPassword.length} characters</span>
                  </div>
                </div>
              )}
            </label>

            <label>
              Confirm new password
              <div className="settings-password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                    fontSize: "11.5px",
                  }}
                >
                  {passwordsMatch ? (
                    <span
                      style={{
                        color: "var(--status-green)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Check size={13} /> Passwords match
                    </span>
                  ) : (
                    <span
                      style={{
                        color: "var(--status-red)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <AlertCircle size={13} /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </label>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleResetPassword}
                disabled={
                  isResettingPassword ||
                  !newPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                style={{ flex: 1, justifyContent: "center" }}
              >
                {isResettingPassword ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                {isResettingPassword ? "Updating password..." : "Reset password"}
              </button>
              {(newPassword || confirmPassword || currentPassword) && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleClearPasswordFields}
                  disabled={isResettingPassword}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ paddingTop: "8px", borderTop: "1px solid var(--border-subtle)" }}>
              <Link
                href="/team"
                className="text-link"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--brand-primary)",
                  textDecoration: "none",
                }}
              >
                <Users size={14} /> Manage staff access & roles in Team & Permissions &rarr;
              </Link>
            </div>
          </section>

          {/* Catalog Taxonomy & Brand Configuration Card */}
          <section className="panel settings-card">
            <div className="settings-icon blue">
              <FolderTree size={20} />
            </div>
            <div>
              <h2>Catalog Taxonomy & Brand Configuration</h2>
              <p>Configure product categories, department hierarchies, and brand designations.</p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--bg-subtle)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "13.5px" }}>
                    Product Categories
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    Organize catalog departments, subcategories, and stock groups
                  </span>
                </div>
                <Link
                  href="/categories"
                  className="secondary-button"
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FolderTree size={14} /> Configure Categories
                </Link>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--bg-subtle)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "13.5px" }}>Brands & Labels</strong>
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    Maintain manufacturer labels and brand designations
                  </span>
                </div>
                <Link
                  href="/brands"
                  className="secondary-button"
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Award size={14} /> Configure Brands
                </Link>
              </div>
            </div>
          </section>

          {/* Payment Methods Card */}
          <section className="panel settings-card">
            <div className="settings-icon orange">
              <CreditCard size={20} />
            </div>
            <div>
              <h2>Payment Acceptance</h2>
              <p>Choose the payment types available at checkout.</p>
            </div>
            <label className="toggle-row">
              <span>
                <strong>Cash Payment</strong>
                <small>Accept physical Ghanaian Cedi tender</small>
              </span>
              <input
                type="checkbox"
                checked={settings.acceptCash}
                onChange={(e) => updateField("acceptCash", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Mobile Money (MoMo)</strong>
                <small>Accept MTN, Telecel, and AT cash transfers</small>
              </span>
              <input
                type="checkbox"
                checked={settings.acceptMoMo}
                onChange={(e) => updateField("acceptMoMo", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Debit / Credit Cards</strong>
                <small>Accept Visa, Mastercard, and Gh-Link cards</small>
              </span>
              <input
                type="checkbox"
                checked={settings.acceptCard}
                onChange={(e) => updateField("acceptCard", e.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Bank Transfer / Cheque</strong>
                <small>Record BOG instant payments and company cheques</small>
              </span>
              <input
                type="checkbox"
                checked={settings.acceptTransfer}
                onChange={(e) => updateField("acceptTransfer", e.target.checked)}
              />
            </label>
          </section>

          {/* Notifications & Thresholds Card */}
          <section className="panel settings-card">
            <div className="settings-icon red">
              <Bell size={20} />
            </div>
            <div>
              <h2>Inventory Alerts & Notifications</h2>
              <p>Keep your cashiers and store managers informed.</p>
            </div>
            <label className="toggle-row">
              <span>
                <strong>Low stock alerts</strong>
                <small>Highlight items reaching minimum quantity</small>
              </span>
              <input
                type="checkbox"
                checked={settings.lowStockAlerts}
                onChange={(e) => updateField("lowStockAlerts", e.target.checked)}
              />
            </label>
            <label>
              Default reorder safety stock
              <input
                type="number"
                min="1"
                value={settings.reorderThreshold}
                onChange={(e) => updateField("reorderThreshold", e.target.value)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>End of day summary</strong>
                <small>Generate automated daily sales & expense totals</small>
              </span>
              <input
                type="checkbox"
                checked={settings.dailySummary}
                onChange={(e) => updateField("dailySummary", e.target.checked)}
              />
            </label>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
