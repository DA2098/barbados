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

  const featuredCuts = useMemo(() => cuts.slice(0, 5), [cuts]);
  const serviceCount = cuts.length;
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;
  const averageCutPrice = serviceCount > 0 ? cuts.reduce((sum, cut) => sum + Number(cut.price || 0), 0) / serviceCount : 0;
  const visibleCuts = cuts.filter((cut) => cut.is_visible).length;
  const coverage = serviceCount > 0 ? Math.round((visibleCuts / serviceCount) * 100) : 0;
  const topReview = reviews[0];

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
        <div className="hero-orb one" style={{ top: '10%', right: '16%' }} />
        <div className="hero-orb two" style={{ bottom: '16%', left: '8%' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-center">
            <div className="max-w-3xl fade-in-up">
              <span className="hero-kicker">BARBADOS</span>
              <h1 className="hero-title mt-4 text-contrast">
                <span className="text-gradient">Diseño serio, datos útiles</span> y una barbería con presencia real
              </h1>
              <p className="hero-lead mt-6">
                DONDE ERES EL LORD QUE MERECES
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/appointments" className="accent-btn px-7 py-3 rounded-xl font-semibold">
                  Reservar ahora
                </Link>
                <Link to="/store" className="glass-card px-7 py-3 rounded-xl font-semibold text-contrast border border-white/10">
                  Ver servicios
                </Link>
              </div>
              //cuadritos de home 
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
                <div className="glass-card p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] muted">Servicios</p>
                  <p className="mt-2 text-3xl font-extrabold text-contrast">{serviceCount}</p>
                  <p className="text-xs muted mt-1">publicados</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] muted">Valoración</p>
                  <p className="mt-2 text-3xl font-extrabold text-contrast">{averageRating.toFixed(1)}</p>
                  <p className="text-xs muted mt-1">promedio real</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] muted">Visible</p>
                  <p className="mt-2 text-3xl font-extrabold text-contrast">{visibleCuts}</p>
                  <p className="text-xs muted mt-1">cortes listos</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] muted">Precio medio</p>
                  <p className="mt-2 text-3xl font-extrabold text-contrast">${averageCutPrice.toFixed(0)}</p>
                  <p className="text-xs muted mt-1">por corte</p>
                </div>
              </div>
            </div>

            <div className="fade-in-up lg:justify-self-end">
              <div className="glass-card rounded-[28px] p-5 md:p-6 border border-white/10 max-w-xl ml-auto">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] muted">Data Panel</p>
                    <h2 className="text-2xl font-extrabold text-contrast mt-2">Resumen operativo</h2>
                  </div>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 glow-ring bg-white/5 flex items-center justify-center">
                    <img src="/logitobarbados.png" alt="Barbados" className="w-full h-full object-contain p-1.5" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm muted">Cortes visibles</p>
                        <p className="text-lg font-bold text-contrast mt-1">{visibleCuts} disponibles</p>
                      </div>
                      <div className="badge-accent">Live</div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full bg-linear-to-r from-(--accent-1) via-(--accent-2) to-(--accent-3)" style={{ width: `${coverage}%` }} />
                    </div>
                    <p className="text-xs muted mt-2">Cobertura visible {coverage}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm muted">Valoración</p>
                        <p className="text-lg font-bold text-contrast mt-1">{reviewCount} reseñas publicadas</p>
                      </div>
                      <div className="badge-note">{averageRating.toFixed(1)}/5</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm muted">Precio medio</p>
                        <p className="text-lg font-bold text-contrast mt-1">${averageCutPrice.toFixed(0)} por corte</p>
                      </div>
                      <div className="badge-danger">UX</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm muted">Mejor reseña</p>
                        <p className="text-lg font-bold text-contrast mt-1 line-clamp-2">{topReview?.comment || 'Aun no hay reseñas publicadas.'}</p>
                      </div>
                      <div className="badge-accent">Top</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-[0.2em] muted uppercase mb-2">Cortes destacados</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-contrast leading-tight">Servicios con valor real</h2>
            </div>
            <p className="muted max-w-md text-sm leading-relaxed flex-1">
              Selección reducida, más clara y más útil. Lo importante aparece primero: precio, duración, disponibilidad y una imagen limpia para decidir sin perder tiempo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-stretch cuts-grid">
        {featuredCuts.map((cut) => (
          <Card
            key={cut.id}
            variant="default"
            interactive={false}
            title={cut.name}
            subtitle={`${cut.duration_minutes || 30} min`}
            image={cut.image_url || 'https://via.placeholder.com/320x320?text=Corte'}
            className="service-showcase-card relative w-full max-w-[340px] mx-auto"
            footer={
              <Link
                to="/appointments"
                className="w-full inline-block text-center accent-btn font-bold py-3 rounded-2xl"
              >
                Agendar corte
              </Link>
            }
          >
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 badge-accent px-3 py-1.5 rounded-full mb-3">
                <span className="text-sm font-extrabold">Barber Premium</span>
              </div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <span className="text-3xl font-extrabold text-accent">{`$${cut.price.toFixed(0)}`}</span>
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">{cut.duration_minutes || 30} min</span>
              </div>
              <p className="text-sm leading-relaxed text-muted line-clamp-3 mb-3">{cut.description || 'Corte profesional personalizado.'}</p>
            </div>
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
            <article className="glass-card rounded-3xl p-8 transition-all">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <Clock3 className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Reservas claras</h3>
              <p className="muted text-sm leading-relaxed">Agenda directa, sin pantallas sobrantes ni pasos confusos.</p>
            </article>
            <article className="glass-card rounded-3xl p-8 transition-all">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <Check className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Datos confiables</h3>
              <p className="muted text-sm leading-relaxed">Servicios, reseñas y precios presentados con jerarquía real.</p>
            </article>
            <article className="glass-card rounded-3xl p-8 transition-all">
              <div className="w-12 h-12 avatar-accent rounded-xl flex items-center justify-center mb-5">
                <MapPin className="w-6 h-6 text-accent-contrast" />
              </div>
              <h3 className="text-lg font-bold text-contrast mb-3">Presencia física</h3>
              <p className="muted text-sm leading-relaxed">Ubicación, contacto y horario siempre accesibles.</p>
            </article>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--bg)' }} className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.2em] muted uppercase mb-3">Reseñas</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-contrast">Opiniones publicadas</h2>
          </div>
          {reviews.length === 0 ? (
              <div className="glass-card rounded-3xl p-6 muted">Aun no hay opiniones publicadas por el administrador.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="glass-card rounded-3xl p-6 transition-all">
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
