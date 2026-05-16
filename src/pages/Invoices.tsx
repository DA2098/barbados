import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, Invoice } from '../services/api';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    api.getInvoices(user.id)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'No se pudieron cargar las facturas');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!user) {
    return <div className="p-8 text-center">Debes iniciar sesión para ver tus facturas.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-contrast">Mis facturas</h1>
          <p className="muted text-sm mt-1">Comprobantes profesionales emitidos por Barbados.</p>
        </div>
      </div>

      {loading && <p className="muted">Cargando facturas...</p>}
      {error && <div className="alert-danger mb-4">{error}</div>}

      {!loading && invoices.length === 0 && (
        <div className="glass-card p-10 rounded-2xl text-center">
          <p className="text-contrast font-semibold">Todavía no tienes facturas.</p>
          <p className="muted mt-2">Cuando pagues una compra o una cita, aparecerá aquí para verla y descargarla.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="glass-card p-5 rounded-2xl border border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-sm muted">{invoice.invoiceNumber}</p>
                <h2 className="text-xl font-bold text-contrast">{invoice.kind === 'appointment' ? 'Factura de cita' : 'Factura de compra'}</h2>
                <p className="text-sm muted mt-1">{new Date(invoice.paidAt || invoice.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-sm muted">Total</p>
                <p className="text-2xl font-bold text-contrast">${invoice.total.toFixed(2)}</p>
                <p className="text-xs muted mt-1">{invoice.paymentMethod === 'card' ? 'Tarjeta' : 'PayPal'} · {invoice.paymentProvider.toUpperCase()}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <a
                href={api.getInvoiceDownloadUrl(invoice.id, user.id)}
                target="_blank"
                rel="noreferrer"
                className="accent-btn px-4 py-2 rounded-lg font-semibold text-center"
              >
                Descargar PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
