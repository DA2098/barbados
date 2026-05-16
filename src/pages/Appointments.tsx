import { Fragment, useEffect, useMemo, useState } from 'react';
import { api, Appointment, AppointmentReview, Product, User } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';

export default function Appointments() {
  const { user } = useAuth();
  const [services, setServices] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<AppointmentReview[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [reviewingAppointmentId, setReviewingAppointmentId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const canSchedule = user?.role === 'user';

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId]
  );

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === barberId),
    [barbers, barberId]
  );

  const reviewedAppointmentIds = useMemo(() => new Set(reviews.map((r) => r.appointmentId)), [reviews]);

  const loadData = async (background = false) => {
    if (!user) return;
    if (!background || !loadedOnce) {
      setLoading(true);
    }
    try {
      const [serviceData, userData, appointmentData] = await Promise.all([
        api.getServices(),
        api.getUsers(),
        api.getAppointments(user.id)
      ]);

      const reviewData = user.role === 'user' ? await api.getAppointmentReviews(user.id) : [];

      const approvedBarbers = userData.filter((u) => u.role === 'barber' && u.barber_approved);
      setServices(serviceData);
      setBarbers(approvedBarbers);
      setAppointments(appointmentData);
      setReviews(reviewData);
      setLoadedOnce(true);

      if (!serviceId && serviceData.length > 0) setServiceId(serviceData[0].id);
      if (!barberId && approvedBarbers.length > 0) setBarberId(approvedBarbers[0].id);
    } catch (error: any) {
      alert(error.message);
    } finally {
      if (!background || !loadedOnce) {
        setLoading(false);
      }
    }
  };

  useAutoRefresh(() => loadData(true), { intervalMs: 20000, enabled: !!user });

  useRealtimeUserEvents(user?.id, async () => {
    await loadData(true);
  }, !!user);

  const handleSubmitReview = async (appointmentId: string) => {
    if (!user || user.role !== 'user') return;
    if (reviewComment.trim() === '') {
      alert('Escribe tu opinión del corte.');
      return;
    }

    setSavingReview(true);
    try {
      await api.createAppointmentReview({
        appointmentId,
        userId: user.id,
        rating: reviewRating,
        comment: reviewComment.trim()
      });
      setReviewingAppointmentId(null);
      setReviewComment('');
      setReviewRating(5);
      await loadData();
      alert('Gracias por calificar. El admin podrá publicarla en la página principal.');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSavingReview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSchedule) return;
    if (!serviceId || !barberId || !appointmentDate || !selectedService) {
      alert('Completa todos los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      const checkout = await api.createPaymentSession({
        userId: user.id,
        kind: 'appointment',
        method: paymentMethod,
        appointment: {
          barberId,
          barberName: selectedBarber?.name || '',
          serviceId,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          appointmentDate,
          notes
        }
      });
      window.location.href = checkout.checkoutUrl;
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!user) return;
    if (!confirm('¿Eliminar esta cita? Se borrará completamente.')) return;

    setDeletingAppointmentId(appointmentId);
    try {
      await api.deleteAppointment(appointmentId, user.id);
      await loadData();
      alert('Cita eliminada correctamente.');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeletingAppointmentId(null);
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Debes iniciar sesión para agendar.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <section className="lg:col-span-1 glass-card p-4 sm:p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4 text-contrast">Agendar Cita</h1>
        {!canSchedule && (
          <div className="mb-4 p-3 rounded alert-note text-sm">
            Solo los clientes pueden agendar citas.
          </div>
        )}
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Servicio</label>
              {services.length === 0 ? (
                <p className="text-sm text-gray-500">No hay servicios publicados por el admin.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {services.map((service) => {
                    const active = service.id === serviceId;
                    return (
                      <button
                        type="button"
                        key={service.id}
                        disabled={!canSchedule}
                        onClick={() => setServiceId(service.id)}
                        className={`w-full text-left rounded-lg p-2 transition ${
                          active ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border border-gray-200 hover:border-indigo-300 bg-white/5'
                        }`}
                      >
                        <div className="flex gap-3">
                          <img
                            src={service.image_url || 'https://via.placeholder.com/120?text=Servicio'}
                            alt={service.name}
                            className="w-20 h-20 rounded object-cover border"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{service.name}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{service.description || 'Sin descripción'}</p>
                            <p className="text-sm font-bold text-indigo-700 mt-1">${service.price.toFixed(2)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Barbero</label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="w-full form-input"
                disabled={!canSchedule}
              >
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha y hora</label>
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full form-input"
                disabled={!canSchedule}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full form-input"
                rows={3}
                disabled={!canSchedule}
              />
            </div>

            {selectedService && (
              <div className="glass-card p-3 text-sm border border-white/20">
                Precio estimado: <b className="text-contrast">${selectedService.price.toFixed(2)}</b>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Método de pago</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`px-4 py-2 rounded-lg font-semibold ${paymentMethod === 'card' ? 'accent-btn' : 'glass-card border border-white/10 text-contrast'}`}
                >
                  Tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`px-4 py-2 rounded-lg font-semibold ${paymentMethod === 'paypal' ? 'accent-btn' : 'glass-card border border-white/10 text-contrast'}`}
                >
                  PayPal
                </button>
              </div>
            </div>

            <button
              disabled={!canSchedule || saving}
              className="w-full accent-btn py-2 rounded font-semibold disabled:opacity-50"
            >
              {saving ? 'Redirigiendo al pago...' : 'Pagar y agendar cita'}
            </button>
          </form>
        )}
      </section>

      <section className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-contrast">Mis Citas</h2>
        </div>
        {loading ? (
          <p className="p-4 text-gray-500">Cargando citas...</p>
        ) : appointments.length === 0 ? (
          <p className="p-4 text-gray-500">No tienes citas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Servicio</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Barbero</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Calificación</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appointment) => (
                  <Fragment key={appointment.id}>
                    <tr>
                      <td className="p-3 text-sm">{new Date(appointment.appointmentDate).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {appointment.serviceImageUrl ? (
                            <img
                              src={appointment.serviceImageUrl}
                              alt={appointment.serviceName}
                              className="w-10 h-10 rounded object-cover border"
                            />
                          ) : null}
                          <div>
                            <p className="font-medium">{appointment.serviceName}</p>
                            {appointment.serviceDescription ? (
                              <p className="text-xs muted line-clamp-1">{appointment.serviceDescription}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{appointment.clientName}</td>
                      <td className="p-3">{appointment.barberName}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs font-semibold uppercase glass-card border border-white/20 text-contrast">
                          {appointment.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.role === 'user' && appointment.status === 'completed' ? (
                          reviewedAppointmentIds.has(appointment.id) ? (
                            <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-2 py-1 rounded border border-green-500/30">Calificada</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingAppointmentId(appointment.id);
                                setReviewRating(5);
                                setReviewComment('');
                              }}
                              className="text-xs px-2 py-1 rounded bg-indigo-600 text-white"
                            >
                              Calificar
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {user.role === 'user' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            disabled={deletingAppointmentId === appointment.id}
                            className="px-3 py-2 rounded btn-danger text-xs font-semibold disabled:opacity-50"
                          >
                            {deletingAppointmentId === appointment.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                    {reviewingAppointmentId === appointment.id && (
                      <tr>
                        <td className="p-3 bg-indigo-50" colSpan={7}>
                          <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Puntuación</label>
                              <select
                                value={reviewRating}
                                onChange={(e) => setReviewRating(Number(e.target.value))}
                                className="p-2 border rounded"
                              >
                                <option value={5}>5 estrellas</option>
                                <option value={4}>4 estrellas</option>
                                <option value={3}>3 estrellas</option>
                                <option value={2}>2 estrellas</option>
                                <option value={1}>1 estrella</option>
                              </select>
                            </div>
                            <div className="grow w-full">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Tu opinión</label>
                              <input
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="¿Qué te pareció el corte y la atención?"
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={savingReview}
                                onClick={() => handleSubmitReview(appointment.id)}
                                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
                              >
                                {savingReview ? 'Enviando...' : 'Enviar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setReviewingAppointmentId(null)}
                                className="px-3 py-2 rounded bg-slate-200 text-sm"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
