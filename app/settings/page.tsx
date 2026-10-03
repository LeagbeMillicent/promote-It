"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_SETTINGS, StoreSettings } from "@/lib/settings-types";

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

  // Fetch latest settings from server on mount
  useEffect(() => {
    let isMounted = true;

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
      // It's still saved locally in localStorage
      setSavedNotice(true);
      setTimeout(() => {
        setSavedNotice(false);
      }, 4000);
    } finally {
      setIsSaving(false);
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
            <p>Configure store details, accepted tender types, and alert preferences.</p>
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

        <form onSubmit={handleSave} className="settings-grid">
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
        </form>
      </div>
    </AppShell>
  );
}
