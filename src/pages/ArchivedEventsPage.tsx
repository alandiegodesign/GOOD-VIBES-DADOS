import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getEventsByCreator } from '@/services/eventService';
import { EventCard } from '@/components/EventCard';
import { ArrowLeft, Archive } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArchivedEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  // Archived = events whose date has passed
  const archived = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events.filter(e => e.date < today);
  }, [events]);

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Archive className="w-6 h-6" /> Eventos Arquivados
          </h1>
          <p className="text-white/70 text-sm mt-1">Eventos com data já passada</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando...</div>
        ) : archived.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Archive className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-display">Nenhum evento arquivado</p>
          </div>
        ) : (
          archived.map(event => (
            <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}>
              <EventCard event={event} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
