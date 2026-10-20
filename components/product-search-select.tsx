"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Package, Search, X } from "lucide-react";

export type ProductSearchOption = {
  variantId: string;
  name: string;
  sku?: string;
  sellingPrice: number;
  stock: number;
};

export type ProductSearchSelectProps = {
  products: ProductSearchOption[];
  value: string;
  onChange: (variantId: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = "Choose a product...",
  required = false,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 280,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.variantId === value),
    [products, value]
  );

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(term) : false;
      const priceMatch = p.sellingPrice.toString().includes(term);
      return nameMatch || skuMatch || priceMatch;
    });
  }, [products, searchTerm]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 320);

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }

    const estimatedDropdownHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight;

    setCoords({
      top: openUpward ? rect.top - estimatedDropdownHeight - 4 : rect.bottom + 4,
      left,
      width: dropdownWidth,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
    setSearchTerm("");
    setHighlightedIndex(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleSelect = (variantId: string) => {
    onChange(variantId);
    handleClose();
  };

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Short delay to ensure portal DOM is mounted
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle outside clicks and scroll/resize repositioning
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    }

    function handleScrollOrResize() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredProducts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex].variantId);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        className={`product-search-trigger ${isOpen ? "is-open" : ""} ${
          selectedProduct ? "has-value" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="product-search-trigger-content">
          {selectedProduct ? (
            <span className="product-trigger-selected">
              <strong className="product-trigger-name">{selectedProduct.name}</strong>
              <span className="product-trigger-sub">
                GHS {selectedProduct.sellingPrice.toFixed(2)} ({selectedProduct.stock} in stock)
              </span>
            </span>
          ) : (
            <span className="product-trigger-placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={`product-trigger-chevron ${isOpen ? "open" : ""}`}
        />
      </button>

      {required && (
        <input
          type="text"
          value={value}
          readOnly
          required
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="product-search-dropdown-menu"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            role="listbox"
          >
            {/* Search Input Bar */}
            <div className="product-search-header">
              <Search size={14} className="product-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="product-search-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type product name, SKU or price..."
                aria-label="Search products"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="product-search-clear-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setHighlightedIndex(0);
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Scrollable Products List */}
            <div className="product-search-list">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p, idx) => {
                  const isSelected = p.variantId === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={p.variantId}
                      role="option"
                      aria-selected={isSelected}
                      className={`product-search-option ${isSelected ? "selected" : ""} ${
                        isHighlighted ? "highlighted" : ""
                      }`}
                      onClick={() => handleSelect(p.variantId)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="product-option-info">
                        <span className="product-option-name">{p.name}</span>
                        {p.sku && <span className="product-option-sku">{p.sku}</span>}
                      </div>

                      <div className="product-option-meta">
                        <strong className="product-option-price">
                          GHS {p.sellingPrice.toFixed(2)}
                        </strong>
                        <span className="product-option-stock">{p.stock} units</span>
                        {isSelected && <Check size={14} className="product-option-check" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="product-search-empty">
                  <Package size={18} />
                  <span>No products found matching &ldquo;{searchTerm}&rdquo;</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
