"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  Contact2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart, badge: "sales" },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes, alert: true },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/customers", label: "Customers", icon: Contact2 },
  { href: "/expenses", label: "Expenses", icon: WalletCards },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminItems = [
  { href: "/team", label: "Team & permissions", icon: ShieldCheck },
  { href: "/audit-logs", label: "Audit logs", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, active = "" }: { children: React.ReactNode; active?: string }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salesCount, setSalesCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sales")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setSalesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setSalesCount(0));
  }, []);

  function closeAllDropdowns() {
    setNotificationsOpen(false);
    setWorkspaceOpen(false);
    setProfileOpen(false);
  }

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogout() {
    closeAllDropdowns();
    setLogoutModalOpen(true);
  }

  async function confirmLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell" onClick={closeAllDropdowns}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-logo-wrap">
            <Image
              src="/img/PromoteItLogo2.png"
              alt="promoteIt Ventures"
              width={148}
              height={56}
              className="brand-logo-img-large"
              priority
            />
          </div>
          <button
            className="icon-button sidebar-collapse"
            aria-label="Collapse sidebar"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen(false);
            }}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div
          className="workspace-switcher"
          onClick={(event) => {
            event.stopPropagation();
            setWorkspaceOpen((current) => !current);
          }}
          role="button"
          tabIndex={0}
          aria-expanded={workspaceOpen}
        >
          <div className="store-avatar">P</div>
          <div>
            <span>Current store</span>
            <strong>Adenta-Accountancy, Accra</strong>
          </div>
          <ChevronDown size={15} />
          {workspaceOpen && (
            <div className="dropdown-menu" onClick={(event) => event.stopPropagation()}>
              <div className="dropdown-item">
                <Store size={16} /> Adenta-Accountancy, Accra
              </div>
              <div className="dropdown-item muted">
                <span>Switch store</span>
              </div>
            </div>
          )}
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={active === item.href}
              salesCount={salesCount}
            />
          ))}
          <div className="nav-section-label">Administration</div>
          {adminItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={active === item.href}
              salesCount={salesCount}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">KO</div>
          <div>
            <strong>Kofi Owusu</strong>
            <span>Owner account</span>
          </div>
          <button className="icon-button" onClick={handleLogout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              className="mobile-menu icon-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div className="breadcrumbs">
              <span>Store operations</span>
              <span>/</span>
              <strong>
                {active === "/"
                  ? "Dashboard"
                  : active.slice(1).replaceAll("-", " ")}
              </strong>
            </div>
          </div>

          <div className="topbar-actions">
            <ThemeToggle />
            <Link href="/settings" className="help-link">
              <span className="help-dot">?</span> Settings & Help
            </Link>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={(event) => {
                event.stopPropagation();
                setNotificationsOpen((current) => !current);
              }}
              aria-expanded={notificationsOpen}
            >
              <Bell size={19} />
              <i />
              {notificationsOpen && (
                <div
                  className="dropdown-menu notification-dropdown"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dropdown-header">
                    <strong>Notifications</strong>
                    <span>{salesCount} active transactions</span>
                  </div>
                  <Link href="/inventory" className="dropdown-item">
                    <Boxes size={16} /> Stock alerts
                  </Link>
                  <Link href="/purchases" className="dropdown-item">
                    <Truck size={16} /> Purchase orders
                  </Link>
                  <div className="dropdown-divider" />
                  <div className="dropdown-item muted">
                    <span>System is operating normally</span>
                  </div>
                </div>
              )}
            </button>
            <div
              className="topbar-user"
              onClick={(event) => {
                event.stopPropagation();
                setProfileOpen((current) => !current);
              }}
              role="button"
              tabIndex={0}
              aria-expanded={profileOpen}
            >
              <div className="user-avatar small">KO</div>
              <ChevronDown size={14} />
              {profileOpen && (
                <div
                  className="dropdown-menu profile-dropdown"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="dropdown-header">
                    <strong>Kofi Owusu</strong>
                    <span>Owner account · Accra</span>
                  </div>
                  <Link href="/team" className="dropdown-item">
                    <Users size={16} /> Team & permissions
                  </Link>
                  <Link href="/audit-logs" className="dropdown-item">
                    <FileText size={16} /> Audit logs
                  </Link>
                  <Link href="/settings" className="dropdown-item">
                    <Settings size={16} /> Store settings
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {children}
      </main>
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Sign Out of promoteIt"
        subtitle="Active Session"
        icon={<LogOut size={20} />}
        variant="danger"
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        description="Are you sure you want to end your current session? Make sure you have completed any in-progress register transactions."
        isLoading={isLoggingOut}
        onConfirm={confirmLogout}
        onClose={() => {
          if (!isLoggingOut) setLogoutModalOpen(false);
        }}
      />
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  count,
  alert,
  badge,
  salesCount,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  count?: string;
  alert?: boolean;
  badge?: string;
  salesCount?: number;
}) {
  const displayCount = badge && salesCount !== undefined && salesCount > 0 ? String(salesCount) : count;
  return (
    <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
      <span>
        <Icon size={18} />
        {label}
      </span>
      {displayCount && <b>{displayCount}</b>}
      {alert && <i className="nav-alert" />}
    </Link>
  );
}
