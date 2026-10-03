import { DetailPage, DetailPanel, DetailStat } from "@/components/detail-page";
import { Boxes, DollarSign, ShieldCheck, Tag } from "lucide-react";

export default function ProductDetailPage() {
  return (
    <DetailPage
      active="/products"
      eyebrow="Catalog Item Details"
      title="65W USB-C GaN Fast Charger"
      description="Multi-device compact fast charger with Power Delivery 3.0 and intelligent current allocation."
      action="Edit specifications"
    >
      <section className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-top">
            <span className="stat-icon"><Tag size={20} /></span>
            <span className="stat-change positive">Active</span>
          </div>
          <span className="stat-title">Retail Selling Price</span>
          <strong className="stat-value">GHS 185.00</strong>
        </div>
        <div className="stat-card green">
          <div className="stat-card-top">
            <span className="stat-icon"><Boxes size={20} /></span>
            <span className="stat-change positive">Healthy</span>
          </div>
          <span className="stat-title">Available Stock</span>
          <strong className="stat-value">48 units</strong>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-top">
            <span className="stat-icon"><DollarSign size={20} /></span>
            <span className="stat-change positive">35.1% margin</span>
          </div>
          <span className="stat-title">Unit Cost Basis</span>
          <strong className="stat-value">GHS 120.00</strong>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-top">
            <span className="stat-icon"><ShieldCheck size={20} /></span>
            <span className="stat-change positive">Safety buffer</span>
          </div>
          <span className="stat-title">Reorder Threshold</span>
          <strong className="stat-value">10 units</strong>
        </div>
      </section>

      <section className="detail-content-grid">
        <DetailPanel title="Product Specifications">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <DetailStat label="SKU Identification" value="CHG-65W-USBC-GAN" />
            <DetailStat label="Product Category" value="Mobile Electronics" />
            <DetailStat label="Brand / Manufacturer" value="Baseus Technology" />
            <DetailStat label="Barcode" value="6953156208149" />
            <DetailStat label="Location / Bin" value="Shelf B-04 · Accra Central" />
          </div>
        </DetailPanel>

        <DetailPanel title="Stock & Reorder Health">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <DetailStat label="Total Physical Count" value="48 units" />
            <DetailStat label="Allocated / Reserved" value="0 units" />
            <DetailStat label="Available for Sale" value="48 units" />
            <DetailStat label="Lead Time" value="3 business days" />
            <DetailStat label="Stock Valuation" value="GHS 5,760.00" />
          </div>
        </DetailPanel>

        <DetailPanel title="Recent Stock Movements">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="detail-stat">
              <div>
                <strong>+50 units received</strong>
                <span style={{ display: "block", fontSize: "11px", color: "var(--ink-muted)" }}>
                  PO-2026-09-01 · Accra Wholesale
                </span>
              </div>
              <span className="status-badge status-green">Completed</span>
            </div>
            <div className="detail-stat">
              <div>
                <strong>-2 units customer checkout</strong>
                <span style={{ display: "block", fontSize: "11px", color: "var(--ink-muted)" }}>
                  PT-98214 · Cash payment
                </span>
              </div>
              <span className="status-badge status-blue">Sale</span>
            </div>
          </div>
        </DetailPanel>

        <DetailPanel title="Pricing & Profitability">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <DetailStat label="Wholesale Acquisition Cost" value="GHS 120.00" />
            <DetailStat label="Target Selling Price" value="GHS 185.00" />
            <DetailStat label="Gross Profit Per Unit" value="GHS 65.00" />
            <DetailStat label="Gross Margin Rate" value="35.14%" />
          </div>
        </DetailPanel>
      </section>
    </DetailPage>
  );
}
