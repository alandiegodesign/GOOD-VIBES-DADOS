import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getEventsByCreator, Event } from '@/services/eventService';
import { CalendarDays, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import ProducerSidebar from '@/components/ProducerSidebar';

export default function MyPagePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  const now = new Date().toISOString().slice(0, 10);
  const activeEvents = useMemo(() => events.filter(e => e.date >= now), [events, now]);
  const pastEvents = useMemo(() => events.filter(e => e.date < now), [events, now]);

  const initials = (profile?.name || 'U').charAt(0).toUpperCase();

  const formatDate = (event: Event) => {
    const d = new Date(event.date + 'T00:00:00');
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${weekday}, ${day.toString().padStart(2, '0')} ${month} · ${event.time}`;
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="gradient-primary px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <ProducerSidebar />
          <div className="w-px h-6 bg-white/30" />
          <h1 className="font-display font-bold text-xl text-white">Minha Página</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-8 mt-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-foreground border-2 border-border shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg">{profile?.name || 'Produtor'}</h2>
            <p className="text-sm text-muted-foreground">
              {events.length} evento{events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Active Events */}
        <section className="space-y-4">
          <h3 className="font-display font-bold text-lg">Eventos ativos</h3>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : activeEvents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-display text-sm">Nenhum evento ativo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEvents.map(event => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="cursor-pointer rounded-2xl overflow-hidden bg-card border border-border group"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {event.banner_image ? (
                      <img src={event.banner_image} alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full gradient-primary" />
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="font-display font-bold text-sm truncate">{event.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{formatDate(event)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Past Events - Horizontal scroll */}
        <section className="space-y-4">
          <h3 className="font-display font-bold text-lg">Eventos passados</h3>
          {pastEvents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-display text-sm">Nenhum evento passado</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
              {pastEvents.map(event => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="cursor-pointer rounded-2xl overflow-hidden bg-card border border-border group shrink-0 w-56"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {event.banner_image ? (
                      <img src={event.banner_image} alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full gradient-primary" />
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="font-display font-bold text-sm truncate">{event.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{formatDate(event)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
