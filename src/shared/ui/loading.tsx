import type { ReactNode } from "react";

export function LoadingSpinner() {
  return <span aria-hidden="true" className="loading-spinner" />;
}

export function LoadingPlaceholder({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div role="status">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true">
        {children ?? (
          <div className="loading-lines">
            <span className="loading-skeleton" />
            <span className="loading-skeleton" />
          </div>
        )}
      </div>
    </div>
  );
}
