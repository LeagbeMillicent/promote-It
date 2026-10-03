import { DetailPage, DetailPanel, DetailStat } from "@/components/detail-page";
import { Boxes, DollarSign, ShieldCheck, Tag } from "lucide-react";
import { db } from "@/lib/db";

export default async function DynamicProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try to find variant by id or sku
  let variant = null;
  try {
    variant = await db.productVariant.findFirst({
      where: {
        OR: [
          { id: id.length === 36 ? id : undefined },
          { sku: id },
        ],
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
    });
  } catch {}

  const productName = variant?.name || decodeURIComponent(id).replaceAll("-", " ");
  const categoryName = variant?.product?.category?.name || "General Merchandise";
  const brandName = variant?.product?.brand?.name || "Store Brand";
  const sku = variant?.sku || `SKU-${id.slice(0, 8).toUpperCase()}`;
  const sellingPrice = Number(variant?.sellingPrice || 150);
  const costPrice = Number(variant?.costPrice || 90);
  const stock = variant?.stock ?? 25;
  const reorder = variant?.reorderLevel ?? 5;
  const margin = sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : "0";

  return (
    <DetailPage
      active="/products"
      eyebrow="Product Inventory Detail"
      title={productName}
      description={`Catalog item in ${categoryName} under brand ${brandName}.`}
      action="Edit product"
    >
      <section className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-top">
            <span className="stat-icon">
              <Tag size={20} />
            </span>
            <span className="stat-change positive">Selling price</span>
          </div>
          <span className="stat-title">Retail unit price</span>
          <strong className="stat-value">GHS {sellingPrice.toFixed(2)}</strong>
        </div>

        <div className="stat-card green">
          <div className="stat-card-top">
            <span className="stat-icon">
              <Boxes size={20} />
            </span>
            <span className="stat-change positive">In stock</span>
          </div>
          <span className="stat-title">Available balance</span>
          <strong className="stat-value">{stock} units</strong>
        </div>

        <div className="stat-card purple">
          <div className="stat-card-top">
            <span className="stat-icon">
              <DollarSign size={20} />
            </span>
            <span className="stat-change positive">{margin}% margin</span>
          </div>
          <span className="stat-title">Cost basis</span>
          <strong className="stat-value">GHS {costPrice.toFixed(2)}</strong>
        </div>

        <div className="stat-card amber">
          <div className="stat-card-top">
            <span className="stat-icon">
              <ShieldCheck size={20} />
            </span>
            <span className="stat-change positive">Reorder point</span>
          </div>
          <span className="stat-title">Min safety stock</span>
          <strong className="stat-value">{reorder} units</strong>
        </div>
      </section>

      <section className="detail-content-grid">
        <DetailPanel title="Product Specifications">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <DetailStat label="Product Name" value={productName} />
            <DetailStat label="SKU Identifier" value={sku} />
            <DetailStat label="Assigned Category" value={categoryName} />
            <DetailStat label="Brand / Vendor" value={brandName} />
            <DetailStat label="Inventory Unit" value={variant?.unit || "piece"} />
          </div>
        </DetailPanel>

        <DetailPanel title="Valuation & Margins">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <DetailStat label="Total Stock Valuation" value={`GHS ${(stock * sellingPrice).toFixed(2)}`} />
            <DetailStat label="Cost Asset Value" value={`GHS ${(stock * costPrice).toFixed(2)}`} />
            <DetailStat label="Profit Per Piece" value={`GHS ${(sellingPrice - costPrice).toFixed(2)}`} />
            <DetailStat label="Gross Margin Percentage" value={`${margin}%`} />
          </div>
        </DetailPanel>
      </section>
    </DetailPage>
  );
}
