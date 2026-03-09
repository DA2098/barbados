import type { ReactNode } from "react";

interface PageProps {
  children: ReactNode;
}

export function BarberPage({ children }: PageProps) {
  return (
    <section className="dashboard-grid" data-page="barber">
      {children}
    </section>
  );
}
