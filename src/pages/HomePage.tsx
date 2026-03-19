import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvents, getEventsByCreator } from '@/services/eventService';
import { getProducerSales } from '@/services/orderService';
import { EventCard } from '@/components/EventCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus, Search, Ticket, LogOut, ShoppingBag, DollarSign,
  CalendarCheck, Eye, ChevronLeft, ChevronRight, Calendar, AlertTriangle, RefreshCw, Shield, FileEdit, EyeOff
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ProducerSidebar from '@/components/ProducerSidebar';
import ProducerLayout from '@/components/ProducerLayout';

const goodVibesLogo = '/good-vibes-logo.png';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const isProdutor = profile?.user_type === 'produtor';
  const clientView = searchParams.get('view') === 'client';
  const draftsFilter = searchParams.get('filter') === 'drafts';
  const showAsProducer = isProdutor && !clientView;

  const { data: events = [], isLoading, isError, refetch } = useQuery({
    queryKey: showAsProducer ? ['my-events', user?.id] : isAdmin ? ['all-events'] : ['events'],
    queryFn: () => showAsProducer ? getEventsByCreator(user!.id) : isAdmin ? getEvents() : getEvents(),
    enabled: showAsProducer || isAdmin ? !!user : true,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['producer-sales', user?.id],
    queryFn: () => getProducerSales(user!.id),
    enabled: showAsProducer && !!user,
  });

  const filtered = useMemo(() => {
    let list = events;
    // Hide invisible events for clients (admins see all)
    if (!showAsProducer && !isAdmin) {
      list = list.filter(e => e.is_visible !== false);
    }
    // Drafts filter for producers
    if (draftsFilter && showAsProducer) {
      list = list.filter(e => e.is_visible === false);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }, [events, search, showAsProducer, isAdmin, draftsFilter]);

  // Producer stats
  const stats = useMemo(() => {
    const revenue = sales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
    const tickets = sales.reduce((sum, s) => sum + s.item_quantity, 0);
    return { revenue, tickets, events: events.length };
  }, [sales, events]);

  const now = new Date().toISOString().slice(0, 10);
  const upcomingEvents = useMemo(() => filtered.filter(e => e.date >= now && e.is_visible !== false), [filtered, now]);
  const draftEvents = useMemo(() => filtered.filter(e => e.is_visible === false), [filtered]);
  const pastEvents = useMemo(() => filtered.filter(e => e.date < now && e.is_visible !== false), [filtered, now]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (showAsProducer) {
    return (
      <ProducerLayout>
        <ProducerHome
          profile={profile}
          events={events}
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
          draftEvents={draftEvents}
          stats={stats}
          isLoading={isLoading}
          isError={isError}
          refetch={refetch}
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          navigate={navigate}
          draftsFilter={draftsFilter}
        />
      </ProducerLayout>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="gradient-primary px-6 pt-12 pb-16 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={goodVibesLogo} alt="Good Vibes" className="h-12 sm:h-16 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => navigate('/admin')}>
                  <Shield className="w-4 h-4 mr-1" /> Painel ADM
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => navigate('/my-orders')}>
                <ShoppingBag className="w-4 h-4 mr-1" /> Ingressos
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate('/profile')}>
                <Eye className="w-5 h-5" />
              </Button>
              {clientView && (
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => navigate('/')}>
                  Voltar ao Produtor
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">
            Olá, {isAdmin ? 'Administrador' : (profile?.name || 'Usuário')}!
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">{isAdmin ? '🛡️ Admin' : '🎫 Cliente'}</span>
          </p>
          <p className="text-white/60 text-xs mb-4">Encontre os melhores eventos da comunidade</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Buscar eventos..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-background/90 backdrop-blur border-0 h-12 rounded-xl text-foreground" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-6">
        {isError ? (
          <div className="text-center py-20 space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-muted-foreground font-display text-lg">Erro ao carregar eventos</p>
            <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando eventos...</div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {filtered.map(event => (
              <motion.div key={event.id} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <EventCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-display text-lg">Nenhum evento encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Producer Dashboard Home ---
function ProducerHome({
  profile, events, upcomingEvents, pastEvents, draftEvents, stats, isLoading, isError, refetch, search, setSearch, filtered, navigate, draftsFilter,
}: {
  profile: any;
  events: any[];
  upcomingEvents: any[];
  pastEvents: any[];
  draftEvents: any[];
  stats: { revenue: number; tickets: number; events: number };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  search: string;
  setSearch: (s: string) => void;
  filtered: any[];
  navigate: (path: string) => void;
  draftsFilter: boolean;
}) {
  const initials = (profile?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="gradient-primary px-6 pt-8 pb-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProducerSidebar />
            <h1 className="font-display font-bold text-xl text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white border border-white/30">
              {initials}
            </div>
            <span className="text-white text-sm font-medium hidden sm:block">{profile?.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-8 mt-6">
        {/* Welcome */}
        <div>
          <p className="text-muted-foreground text-sm">Bem vindo de volta</p>
          <h2 className="font-display font-bold text-2xl">{profile?.name || 'Produtor'}</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Receita total" value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="hsl(var(--primary))" />
          <StatCard icon={Ticket} label="Ingressos vendidos" value={String(stats.tickets)} color="hsl(var(--accent-foreground))" />
          <StatCard icon={CalendarCheck} label="Eventos realizados" value={String(stats.events)} color="#9D4EDD" />
          <StatCard icon={Eye} label="Visualizações" value="—" color="#F72585" />
        </div>

        {isError ? (
          <div className="text-center py-20 space-y-4 col-span-full">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-muted-foreground font-display text-lg">Erro ao carregar eventos</p>
            <p className="text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20 text-muted-foreground col-span-full">Carregando eventos...</div>
        ) : (
        draftsFilter ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Rascunhos</h3>
              <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={() => navigate('/')}>
                Ver todos
              </Button>
            </div>
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(event => (
                  <EventCard key={event.id} event={event} showDraftBadge />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <FileEdit className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-display text-sm">Nenhum rascunho encontrado</p>
              </div>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Próximos Eventos</h3>
              <Button size="sm" className="gradient-accent border-0 rounded-full font-display font-bold text-xs gap-1" onClick={() => navigate('/create-event')}>
                Criar Evento
              </Button>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} showDraftBadge />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-display text-sm">Nenhum evento próximo</p>
              </div>
            )}
          </div>
          {/* Drafts Section */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-400" /> Rascunhos
            </h3>
            {draftEvents.length > 0 ? (
              <div className="space-y-3">
                {draftEvents.map(event => (
                  <EventCard key={event.id} event={event} showDraftBadge />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <FileEdit className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-display text-sm">Nenhum rascunho</p>
              </div>
            )}
          </div>

          {/* Past Events Section */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg">Eventos passados</h3>
            {pastEvents.length > 0 ? (
              <div className="space-y-2">
                {pastEvents.slice(0, 5).map(event => (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })} · {event.time}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                <p className="font-display text-sm">Nenhum evento passado</p>
              </div>
            )}
          </div>
        </div>
        ))}

      </div>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/create-event')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full gradient-accent text-white shadow-lg flex items-center justify-center glow-secondary z-50">
        <Plus className="w-7 h-7" />
      </motion.button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl border border-border p-4 space-y-2"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="font-display font-bold text-xl">{value}</p>
    </motion.div>
  );
}
