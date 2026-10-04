"use client";

import { useEffect, ReactNode, FormEvent } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, LogOut, Trash2, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary" | "success";

export interface ConfirmModalDetail {
  label: string;
  value: ReactNode;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  description?: ReactNode;
  itemDetails?: ConfirmModalDetail[];
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    variant?: "secondary" | "warning";
  };
  children?: ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  itemDetails,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  icon,
  isLoading = false,
  error = null,
  secondaryAction,
  children,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    await onConfirm();
  }

  function renderIcon() {
    if (icon) return icon;
    switch (variant) {
      case "danger":
        return <Trash2 size={20} />;
      case "warning":
        return <AlertTriangle size={20} />;
      case "success":
        return <CheckCircle2 size={20} />;
      case "primary":
      default:
        return <HelpCircle size={20} />;
    }
  }

  const iconClass =
    variant === "danger"
      ? "confirm-icon-danger"
      : variant === "warning"
      ? "confirm-icon-warning"
      : variant === "success"
      ? "confirm-icon-success"
      : "confirm-icon-primary";

  const buttonClass =
    variant === "danger"
      ? "danger-button"
      : variant === "warning"
      ? "warning-button"
      : "primary-button";

  return (
    <div
      className="modal-backdrop confirm-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <section
        className="modal-card confirm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="modal-header confirm-modal-header">
          <div className={`modal-icon ${iconClass}`}>{renderIcon()}</div>
          <div className="confirm-modal-heading">
            <h2 id="confirm-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="confirm-modal-form">
          <div className="confirm-modal-body">
            {description && (
              <div className="confirm-modal-description">{description}</div>
            )}

            {itemDetails && itemDetails.length > 0 && (
              <div className="confirm-details-box">
                {itemDetails.map((detail, index) => (
                  <div key={index} className="confirm-details-row">
                    <span className="confirm-details-label">{detail.label}</span>
                    <span className="confirm-details-value">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}

            {children}

            {error && (
              <div className="confirm-error-box">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer confirm-modal-footer">
            {secondaryAction && (
              <button
                type="button"
                className={secondaryAction.variant === "warning" ? "warning-button" : "secondary-button"}
                onClick={secondaryAction.onClick}
                disabled={isLoading}
              >
                {secondaryAction.label}
              </button>
            )}
            <span className="modal-footer-spacer" />
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={buttonClass}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="confirm-loading-wrap">
                  <Loader2 size={16} className="spin-icon" /> Processing...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
