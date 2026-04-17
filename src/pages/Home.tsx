import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock3, Globe, MapPin, MessageCircle, Phone, Star, Mail } from 'lucide-react';
import { api, AppointmentReview, Product } from '../services/api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRealtimeUserEvents } from '../hooks/useRealtimeUserEvents';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
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
          api.getProducts({ category: 'service' }),
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
        api.getProducts({ category: 'service' }),
        api.getAppointmentReviews(undefined, true)
      ]);
      setCuts(serviceData);
      setReviews(reviewData);
    } catch (error) {
      console.error(error);
    }
  }, { intervalMs: 30000 });

  useRealtimeUserEvents(user?.id, async () => {
    try {
      const [serviceData, reviewData] = await Promise.all([
        api.getProducts({ category: 'service' }),
        api.getAppointmentReviews(undefined, true)
      ]);
      setCuts(serviceData);
      setReviews(reviewData);
    } catch (error) {
      console.error(error);
    }
  }, !!user);

  const featuredCuts = useMemo(() => cuts.slice(0, 4), [cuts]);

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative bg-[#3b6a64] overflow-hidden min-h-[600px] flex">

        {/* Background image on the right side */}
        <div className="absolute top-0 right-0 w-full md:w-3/4 h-full z-0">
          <img 
            src="/hero-bg.jpg" 
            alt="Barbershop" 
            className="w-full h-full object-cover scale-105"
          />
        </div>

        <div className="absolute inset-0 bg-linear-to-r from-[#3b6a64]/85 via-[#3b6a64]/72 to-transparent z-0"></div>

        {/* Diagonal overlay applied using CSS linear-gradient for pure color cut */}
        <div
          className="absolute inset-y-0 left-0 hidden md:block z-0 w-[74%]"
          style={{
            background: 'linear-gradient(180deg, rgba(116,177,181,0.36) 0%, rgba(59,106,100,0.28) 100%)',
            clipPath: 'polygon(0 0, 86% 0, 72% 100%, 0 100%)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}
        ></div>
        {/* Mobile dark overlay so text is readable */}
        <div className="absolute inset-0 block md:hidden bg-[#3b6a64]/88 z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 lg:px-8 py-14 md:py-20 flex items-start">
          <div className="max-w-xl text-white md:pr-10 lg:pl-3 pt-8 md:pt-0">
            <div className="mb-6 inline-flex items-center gap-4 rounded-full border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm shadow-lg">
              <div className="w-16 h-16 rounded-full border-2 border-[#f3d0c6] bg-white flex items-center justify-center shadow-md overflow-hidden">
                <img
                  src="/logo-bar4beards.svg"
                  alt="Logo Bar4Beards"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/75 font-semibold">Bar4Beards</p>
                <p className="text-sm text-white/90">Barbería y bar en un solo lugar</p>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight text-[#e7e6e3]" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.45)' }}>
              Bar4Beards
            </h1>
            <p className="text-xl md:text-[2rem] mb-10 leading-[1.35] font-light italic max-w-[640px] text-white/95" style={{ textShadow: '1px 1px 5px rgba(0,0,0,0.5)' }}>
              es un negocio que combina barbería y bar ofreciendo a los clientes una experiencia diferente en un solo lugar. En este establecimiento las personas pueden cortarse el cabello o arreglar su barba mientras disfrutan de comida y bebidas en un ambiente cómodo y moderno
            </p>
            <Link 
              to="/appointments" 
              className="inline-block bg-linear-to-r from-[#F15718] to-[#F15A15] hover:from-[#d94814] hover:to-[#e84b0e] text-white px-11 py-4 rounded-full font-bold text-2xl uppercase tracking-wider shadow-2xl transition-transform transform hover:scale-105"
            >
              RESERVAR
            </Link>
          </div>
        </div>
      </section>

      {/* Cuts Section */}
      <section className="bg-linear-to-b from-[#3b6a64] to-[#567972] py-24 px-4 grow relative">
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <h2 className="text-white text-3xl md:text-4xl font-bold mb-8">Cortes Destacados</h2>
          {featuredCuts.length === 0 ? (
            <div className="bg-white/90 rounded-2xl p-6 text-center text-gray-700 font-medium">
              El admin aún no ha publicado cortes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {featuredCuts.map((cut) => (
                <div key={cut.id} className="bg-linear-to-b from-gray-50 to-gray-300 rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden transform transition-transform hover:-translate-y-2">
                  <img
                    src={cut.image_url || 'https://via.placeholder.com/320x220?text=Corte'}
                    alt={cut.name}
                    className="w-full h-36 object-cover rounded-xl mb-4 border border-white/70"
                  />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{cut.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-black">${cut.price.toFixed(0)}</span>
                    <span className="text-gray-600 font-medium">USD</span>
                  </div>
                  <ul className="space-y-3 mb-6 grow">
                    <li className="flex items-start gap-3 text-gray-800 text-sm">
                      <div className="border border-gray-400 rounded-full p-0.5 mt-0.5 shrink-0"><Check className="w-3.5 h-3.5 text-gray-700" /></div>
                      <span className="line-clamp-3">{cut.description || 'Corte profesional personalizado.'}</span>
                    </li>
                  </ul>
                  <Link
                    to="/appointments"
                    className="w-full text-center bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    Agendar corte
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f4f4f4] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#2E5953] mb-8">Opiniones de Clientes</h2>
          {reviews.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
              Aún no hay opiniones publicadas por el admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{review.userName}</h3>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-bold">{review.rating}/5</span>
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-[#3b6a64] font-semibold mb-2">{review.serviceName}</p>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#d7e4df] py-14 px-4 border-y border-[#b6cac3]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#2E5953] font-bold">Trabaja con nosotros</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1f3f3b] mt-2">¿Eres barbero y quieres postularte?</h2>
            <p className="text-gray-700 mt-2 max-w-2xl">
              Tenemos un formulario de postulación en tu panel de cliente. Completa tu experiencia, especialidades y disponibilidad para evaluación del administrador.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to={user ? '/profile' : '/register'}
              className="px-6 py-3 rounded-xl bg-[#1f3f3b] text-white font-semibold hover:bg-[#15302d] transition-colors"
            >
              {user ? 'Ir a mi postulación' : 'Crear cuenta y postularme'}
            </Link>
            {user && (
              <Link
                to="/appointments"
                className="px-6 py-3 rounded-xl bg-white text-[#1f3f3b] border border-[#1f3f3b]/30 font-semibold hover:bg-[#f7fbf9] transition-colors"
              >
                Reservar mientras esperas
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#E5E5E5] w-full border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 text-gray-900">
          <div>
            <h3 className="text-xl font-bold mb-3 tracking-wide text-[#3b6a64]">Bar4Beards</h3>
            <p className="text-sm leading-6 text-gray-700">
              Barbería, bar y experiencia completa en un solo lugar. Cortes, comida, bebidas, chat y reservas en tiempo real.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Contacto</h4>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#3b6a64]" /> +1 809 555 0199</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#3b6a64]" /> contacto@bar4beards.com</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#3b6a64]" /> Av. Principal 123, Centro</div>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Horario</h4>
            <div className="space-y-3 text-sm text-gray-700">
              {businessHours.map((hour) => (
                <div key={hour} className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-[#3b6a64]" /> {hour}</div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">Enlaces</h4>
            <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-gray-700">
              {footerLinks.map((link) => (
                <Link key={link.label} to={link.to} className="hover:text-[#3b6a64] transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 text-[#3b6a64]">
              <a href="#" className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="p-2 rounded-full bg-white/70 hover:bg-white transition-colors"><MessageCircle className="w-5 h-5" /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 py-4">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3 text-gray-900 font-bold text-sm tracking-wider">
            <div className="text-center md:text-left">
              BARBEARDS TODOS LOS DERECHOS RESERVADOS
            </div>
            <div className="flex gap-6 uppercase text-xs text-gray-700">
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
