"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
};

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemName = "records",
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (safePage > 3) {
      pages.push("ellipsis-start");
    }

    const startWindow = Math.max(2, safePage - 1);
    const endWindow = Math.min(totalPages - 1, safePage + 1);

    for (let i = startWindow; i <= endWindow; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push("ellipsis-end");
    }

    pages.push(totalPages);
    return pages;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className={`pagination-bar ${className}`}>
      <div className="pagination-info">
        {totalItems === 0 ? (
          <span>No {itemName} to display</span>
        ) : (
          <span>
            Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of{" "}
            <strong>{totalItems}</strong> {itemName}
          </span>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls" role="navigation" aria-label="Pagination">
          <button
            type="button"
            className="pagination-nav-btn"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  &hellip;
                </span>
              );
            }

            const isCurrent = p === safePage;
            return (
              <button
                key={p}
                type="button"
                className={`pagination-btn ${isCurrent ? "active" : ""}`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            className="pagination-nav-btn"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
