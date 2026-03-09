import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

export function ClientPage({ children }: PageProps) {
  return (
    <section className="dashboard-grid" data-page="client">
      {children}
    </section>
  );
}
