import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, Invoice } from '../services/api';

export default function PaymentReturn() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const provider = params.get('provider') as 'stripe' | 'paypal' | null;
  const referenceId = params.get('session_id') || params.get('token');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!provider || !referenceId) {
      setError('No se encontró el pago a confirmar.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.confirmPayment({ provider, referenceId, userId: user.id })
      .then((data) => {
        if (!cancelled) setInvoice(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'No se pudo confirmar el pago');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider, referenceId, user?.id, navigate]);

  if (!user) {
    return <div className="p-8 text-center">Redirigiendo al login...</div>;
  }

  const downloadInvoice = () => {
    if (!invoice) return;
    window.open(api.getInvoiceDownloadUrl(invoice.id, user.id), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-contrast mb-3">Pago confirmado</h1>
        <p className="muted mb-6">Aquí tienes el comprobante profesional de Barbados. Puedes descargarlo cuando quieras.</p>

        {loading && <p className="text-sm text-gray-500">Confirmando pago y generando factura...</p>}
        {error && <div className="alert-danger mb-4">{error}</div>}

        {invoice && (
          <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
    api.confirmPayment({ provider, referenceId, userId: user.id })
      .then((data) => {
        if (!cancelled) setInvoice(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          const msg = String(err?.message || '').toLowerCase();
          if (msg.includes('session_conflict') || msg.includes('session conflict')) {
            console.warn('Ignored session_conflict in PaymentReturn');
          } else {
            setError(err.message || 'No se pudo confirmar el pago');
          }
        }
      })
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                <div><span className="muted">Método:</span> {invoice.paymentMethod === 'card' ? 'Tarjeta' : 'PayPal'}</div>
                <div><span className="muted">Proveedor:</span> {invoice.paymentProvider.toUpperCase()}</div>
                <div><span className="muted">Cliente:</span> {invoice.billingName}</div>
                <div><span className="muted">Correo:</span> {invoice.billingEmail}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={downloadInvoice} className="accent-btn px-5 py-3 rounded-xl font-semibold">
                Descargar factura PDF
              </button>
              <button onClick={() => navigate('/invoices')} className="glass-card px-5 py-3 rounded-xl font-semibold text-contrast border border-white/10">
                Ver todas mis facturas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
