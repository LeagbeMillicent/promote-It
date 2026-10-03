import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Edit3, Package, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export function DetailPage({ active, eyebrow, title, description, children, action = "Edit record" }: { active: string; eyebrow: string; title: string; description: string; children: React.ReactNode; action?: string }) {
  return <AppShell active={active}><div className="page-wrap detail-page"><Link href={active} className="back-link"><ArrowLeft size={15} /> Back to {active.slice(1)}</Link><section className="detail-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions"><button className="secondary-button"><Edit3 size={15} /> {action}</button><button className="primary-button"><Plus size={16} /> New transaction</button></div></section>{children}</div></AppShell>;
}

export function DetailStat({ label, value, accent = "blue" }: { label: string; value: string; accent?: string }) { return <div className={`detail-stat ${accent}`}><span>{label}</span><strong>{value}</strong></div>; }
export function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel detail-panel"><div className="panel-header"><h2>{title}</h2><button className="icon-button"><ArrowUpRight size={16} /></button></div>{children}</section>; }
export function DetailEmpty() { return <div className="detail-empty"><Package size={19} /><span>No records to display yet.</span></div>; }
