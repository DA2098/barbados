import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

export function AdminPage({ children }: PageProps) {
  return (
    <section className="dashboard-grid" data-page="admin">
      {children}
    </section>
  );
}
