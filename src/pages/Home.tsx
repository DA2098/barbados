import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Globe, MapPin, MessageCircle, Phone, Star, Mail } from 'lucide-react';
import { api, AppointmentReview, Product } from '../services/api';
import Card from '../components/Card';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, duplicatedSession } = useAuth();
  const [cuts, setCuts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<AppointmentReview[]>([]);

  const businessHours = [
    'Lunes a Viernes: 9:00 AM - 8:00 PM',
    'Sábado: 9:00 AM - 6:00 PM',
    'Domingo: 10:00 AM - 4:00 PM'
  ];

  const footerLinks = [
    { label: 'Inicio', to: '/' },
    { label: 'Servicios', to: '/store' },
    { label: 'Agendar', to: '/appointments' },
    { label: 'Chat', to: '/chat' }
  ];

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [serviceData, reviewData] = await Promise.all([
            api.getServices(),
            api.getAppointmentReviews(undefined, true)
          ]);
        setCuts(serviceData);
        setReviews(reviewData);
      } catch (error) {
        console.error(error);
      }
    };

    loadHomeData();
  }, []);

  useAutoRefresh(async () => {
    try {
      const [serviceData, reviewData] = await Promise.all([
        api.getServices(),
        api.getAppointmentReviews(undefined, true)
      ]);
      setCuts(serviceData);
      setReviews(reviewData);
    } catch (error) {
      console.error(error);
    }
  }, { intervalMs: 30000, enabled: !duplicatedSession });

  useRealtimeUserEvents(user?.id, async () => {
    try {
      const [serviceData, reviewData] = await Promise.all([
        api.getServices(),
        api.getAppointmentReviews(undefined, true)
      ]);
      setCuts(serviceData);
      setReviews(reviewData);
    } catch (error) {
      console.error(error);
    }
  }, !!user && !duplicatedSession);

  const featuredCuts = useMemo(() => cuts.slice(0, 4), [cuts]);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="hero-stage relative overflow-hidden">
        <div className="absolute inset-0">
          <video
            src="/hero-video.mp4"
            autoPlay
            loop
            muted
            className="h-full w-full object-cover"
          />
        </div>
        <div className="hero-overlay absolute inset-0" />
        <div className="hero-grid absolute inset-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl fade-in-up">
            <span className="hero-kicker">BARBADOS EXPERIENCE</span>
            <h1 className="hero-title mt-4 text-contrast">Barbados: Donde el estilo encuentra la perfección</h1>
            <p className="hero-lead mt-6">
              Más que un corte. Barbados es tu destino para cortes premium, arreglo de barba experto y un ambiente donde se mezclan la tradición del barbering con la modernidad. Cada cita es una experiencia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/appointments" className="accent-btn px-7 py-3 rounded-xl font-semibold">
                Reservar ahora
              </Link>
              <Link to="/store" className="glass-card px-7 py-3 rounded-xl font-semibold text-contrast">
                Ver servicios
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-[0.2em] muted uppercase mb-2">Servicios Destacados</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-contrast leading-tight">Cortes Profesionales</h2>
            </div>
            <p className="muted max-w-md text-sm leading-relaxed flex-1">
              Cada corte es diseñado con precisión, adaptado a tu estilo de vida. Barberos certificados, herramientas profesionales y protocolos de esterilización rigurosos garantizados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center cuts-grid">
        {featuredCuts.map((cut) => (
          <Card
            key={cut.id}
            variant="cut"
            interactive={false}
            title={cut.name}
            subtitle={`${cut.duration_minutes || 30} min`}
            image={cut.image_url || 'https://via.placeholder.com/320x320?text=Corte'}
            className="relative transition-all duration-300 w-full max-w-[320px] mx-auto"
            footer={
              <Link
                to="/appointments"
                className="w-full inline-block text-center accent-btn font-bold py-3 rounded-lg transition-all hover:shadow-lg hover:-translate-y-1"
              >
                Agendar corte
              </Link>
            }
          >
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl font-extrabold text-accent">{`$${cut.price.toFixed(0)}`}</span>
              </div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wider">USD</p>
            </div>

            <p className="text-sm leading-relaxed text-muted line-clamp-3 mb-3">{cut.description || 'Corte profesional personalizado.'}</p>
          </Card>
        ))}
      </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--surface)' }} className="py-20 md:py-28 px-4 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold tracking-[0.2em] muted uppercase mb-3">Por Qué Elegirnos</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-contrast leading-tight mb-4">La Experiencia Barbados</h2>
            <p className="muted max-w-2xl mx-auto text-sm leading-relaxed">
              Cada detalle está diseñado para garantizar una experiencia excepcional. Desde el primer contacto hasta el acabado final, nos comprometemos con la excelencia y tu satisfacción.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="glass-card rounded-2xl p-8 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <Clock3 className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Citas Sin Espera</h3>
              <p className="muted text-sm leading-relaxed">Sistema de reservas inteligente que respeta tu tiempo. Llegabas puntual, comienza puntual. Nos organizamos para mantener tu agenda sin interrupciones.</p>
            </article>
            <article className="glass-card rounded-2xl p-8 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <Check className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Calidad Garantizada</h3>
              <p className="muted text-sm leading-relaxed">Barberos certificados, herramientas de grado profesional y protocolos de esterilización rigurosos. Tu salud y satisfacción son nuestra prioridad número uno.</p>
            </article>
            <article className="glass-card rounded-2xl p-8 transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <MapPin className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Ubicación Premium</h3>
              <p className="muted text-sm leading-relaxed">Plaza Tineca, San Martín. Acceso fácil desde cualquier parte de la ciudad. Estacionamiento disponible y ambiente exclusivo para ti.</p>
            </article>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--bg)' }} className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.2em] muted uppercase mb-3">Testimonios</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-contrast">Lo que Dicen Nuestros Clientes</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 muted">Aun no hay opiniones publicadas por el administrador.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="glass-card rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-contrast text-base">{review.userName}</h3>
                      <p className="text-xs uppercase tracking-wide text-accent font-semibold mt-1">{review.serviceName}</p>
                    </div>
                      <div className="flex items-center gap-0.5 badge-note px-2.5 py-1.5 rounded-lg">
                        <Star className="w-4 h-4" style={{ color: 'var(--note)' }} />
                        <span className="text-sm font-bold text-note">{review.rating}</span>
                      </div>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-4" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto glass-card rounded-3xl p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-bold mb-3">Únete al Equipo</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-contrast leading-tight mb-4">¿Eres Barbero Profesional?</h2>
            <p className="muted leading-relaxed max-w-2xl">
              Si tienes pasión por el barbering y buscas crecer profesionalmente, te invitamos a formar parte de nuestro equipo. Completa tu perfil con tu experiencia, especialidades y horarios disponibles. Nuestro equipo revisará tu solicitud y te contactará pronto.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 ">
            <Link to={user ? '/profile' : '/register'} className="px-7 py-3.5 rounded-xl accent-btn font-bold transition-all hover:shadow-lg hover:-translate-y-1">
              {user ? 'Ir a mi postulación' : 'Unirse como Barbero'}
            </Link>
            {user && (
              <Link to="/appointments" className="px-7 py-3.5 rounded-xl nav-btn font-bold transition-all hover:shadow-lg hover:-translate-y-1">
                Reservar Cita
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-white/10" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 text-contrast">
          <div>
            <h3 className="text-xl font-bold mb-3 tracking-wide text-contrast">Barbados</h3>
            <p className="text-sm leading-6 muted">
              Barberia y bar en un solo lugar. Reserva online, atencion rapida y una experiencia moderna de principio a fin.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Contacto</h4>
            <div className="space-y-3 text-sm muted">
              <a href="tel:+50367654321" className="flex items-center gap-2 hover:opacity-85 transition-colors">
                <Phone className="w-4 h-4 text-contrast" /> (503) 67654321
              </a>
              <a href="mailto:barbados@gmail.com" className="flex items-center gap-2 hover:opacity-85 transition-colors">
                <Mail className="w-4 h-4 text-contrast" /> barbados@gmail.com
              </a>
              <a href="https://www.google.com/maps/search/?api=1&query=Plaza+Tineca,+San+Mart%C3%ADn,+Barbados" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-85 transition-colors">
                <MapPin className="w-4 h-4 text-contrast" /> Plaza Tineca, San Martin, Barbados
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Horario</h4>
            <div className="space-y-3 text-sm muted">
              {businessHours.map((hour) => (
                <div key={hour} className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-contrast" /> {hour}</div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Navegacion</h4>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold muted">
              {footerLinks.map((link) => (
                <Link key={link.label} to={link.to} className="hover:text-contrast transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 text-contrast">
              <a href="#" className="nav-icon-btn"><Globe className="w-5 h-5" /></a>
              <a href="#" className="nav-icon-btn"><MessageCircle className="w-5 h-5" /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-4">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3 text-contrast text-sm">
            <div className="font-semibold text-center md:text-left">BARBADOS - TODOS LOS DERECHOS RESERVADOS</div>
            <div className="flex gap-6 uppercase text-xs muted">
              <span>Contacto</span>
              <span>Ubicacion</span>
              <span>Reservas</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
