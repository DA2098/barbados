import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

export function ApiPage({ children }: PageProps) {
  return (
    <section className="dashboard-grid" data-page="api">
      {children}
    </section>
  );
}
