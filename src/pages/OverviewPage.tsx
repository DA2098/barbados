import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

export function OverviewPage({ children }: PageProps) {
  return (
    <section className="dashboard-grid" data-page="overview">
      {children}
    </section>
  );
}
