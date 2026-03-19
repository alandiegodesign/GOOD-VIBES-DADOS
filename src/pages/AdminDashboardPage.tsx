import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdminProducers,
  getAdminEventsTicketSummary,
  ProducerOverview,
  AdminEventTicketSummary,
} from '@/services/adminService';
import {
  Shield, Users, Calendar, DollarSign, Ticket, Search, ChevronRight,
  Music, Star, Crown, UtensilsCrossed, UsersRound, ArrowLeft, ScanLine, Key,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const LOCATION_ICONS: Record<string, React.ElementType> = {
  pista: Music,
  vip: Star,
  camarote: Crown,
  camarote_grupo: UsersRound,
  bistro: UtensilsCrossed,
};

const LOCATION_COLORS: Record<string, string> = {
  pista: 'hsl(var(--primary))',
  vip: '#f59e0b',
  camarote: '#9D4EDD',
  camarote_grupo: '#F72585',
  bistro: '#06d6a0',
};

interface GroupedEvent {
  event_id: string;
  event_title: string;
  event_date: string;
  producer_id: string;
  producer_name: string;
  is_visible: boolean;
  locations: AdminEventTicketSummary[];
  totalRevenue: number;
  totalSold: number;
  totalCapacity: number;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: producers = [], isLoading: loadingProducers } = useQuery({
    queryKey: ['admin-producers'],
    queryFn: getAdminProducers,
    enabled: !!user,
  });

  const { data: ticketSummary = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['admin-events-ticket-summary'],
    queryFn: getAdminEventsTicketSummary,
    enabled: !!user,
  });

  // Group ticket summary by event
  const groupedEvents = useMemo<GroupedEvent[]>(() => {
    const map: Record<string, GroupedEvent> = {};
    ticketSummary.forEach(row => {
      if (!map[row.event_id]) {
        map[row.event_id] = {
          event_id: row.event_id,
          event_title: row.event_title,
          event_date: row.event_date,
          producer_id: row.producer_id,
          producer_name: row.producer_name,
          is_visible: row.is_visible,
          locations: [],
          totalRevenue: 0,
          totalSold: 0,
          totalCapacity: 0,
        };
      }
      if (row.location_name) {
        map[row.event_id].totalCapacity += Number(row.total_quantity);
        if (Number(row.sold_quantity) > 0) {
          map[row.event_id].locations.push(row);
          map[row.event_id].totalRevenue += Number(row.revenue);
          map[row.event_id].totalSold += Number(row.sold_quantity);
        }
      }
    });
    return Object.values(map);
  }, [ticketSummary]);

  const globalStats = useMemo(() => ({
    totalProducers: producers.length,
    totalEvents: groupedEvents.length,
    totalRevenue: groupedEvents.reduce((s, e) => s + e.totalRevenue, 0),
    totalTickets: groupedEvents.reduce((s, e) => s + e.totalSold, 0),
  }), [producers, groupedEvents]);

  const filteredProducers = useMemo(() => {
    if (!search) return producers;
    const q = search.toLowerCase();
    return producers.filter(p =>
      p.producer_name.toLowerCase().includes(q) || p.producer_email.toLowerCase().includes(q)
    );
  }, [producers, search]);

  const filteredEvents = useMemo(() => {
    if (!search) return groupedEvents;
    const q = search.toLowerCase();
    return groupedEvents.filter(e =>
      e.event_title.toLowerCase().includes(q) || e.producer_name.toLowerCase().includes(q)
    );
  }, [groupedEvents, search]);

  const isLoading = loadingProducers || loadingTickets;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 mb-4 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-amber-400" />
            <h1 className="font-display font-bold text-2xl text-white">Painel ADM</h1>
          </div>
          <p className="text-white/60 text-sm">Monitoramento global de produtores, eventos e faturamento</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/validate')}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <ScanLine className="w-4 h-4" /> Validar Ingressos
            </button>
            <button
              onClick={() => navigate('/admin-credentials')}
              className="flex items-center gap-2 bg-card hover:bg-accent text-foreground px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-border"
            >
              <Key className="w-4 h-4" /> Credenciais
            </button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-6 -mt-6 space-y-5">
        {/* Global stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Produtores" value={globalStats.totalProducers} />
          <StatCard icon={Calendar} label="Eventos" value={globalStats.totalEvents} />
          <StatCard icon={DollarSign} label="Receita Total" value={`R$ ${globalStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
          <StatCard icon={Ticket} label="Ingressos" value={globalStats.totalTickets} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtor ou evento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando dados...</div>
        ) : (
          <Tabs defaultValue="events">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="events">Eventos ({filteredEvents.length})</TabsTrigger>
              <TabsTrigger value="producers">Produtores ({filteredProducers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4 mt-4">
              {filteredEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum evento encontrado</p>
              ) : filteredEvents.map(e => (
                <EventDetailCard key={e.event_id} event={e} onClick={() => navigate(`/admin/producer/${e.producer_id}`)} />
              ))}
            </TabsContent>

            <TabsContent value="producers" className="space-y-3 mt-4">
              {filteredProducers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum produtor encontrado</p>
              ) : filteredProducers.map(p => (
                <ProducerCard key={p.producer_id} producer={p} onClick={() => navigate(`/admin/producer/${p.producer_id}`)} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10">
        <Icon className="w-5 h-5 text-amber-500" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-sm">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
    </div>
  );
}

function EventDetailCard({ event, onClick }: { event: GroupedEvent; onClick: () => void }) {
  const occupancyPercent = event.totalCapacity > 0
    ? Math.round((event.totalSold / event.totalCapacity) * 100)
    : 0;

  return (
    <button onClick={onClick} className="w-full bg-card rounded-2xl border border-border p-5 hover:border-amber-500/40 transition-colors text-left space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-sm truncate">{event.event_title}</p>
            {!event.is_visible && <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">Oculto</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {event.producer_name} • {new Date(event.event_date).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receita</p>
          <p className="font-display font-bold text-sm text-amber-500">
            R$ {event.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendidos</p>
          <p className="font-display font-bold text-sm">{event.totalSold}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ocupação</p>
          <p className="font-display font-bold text-sm">{occupancyPercent}%</p>
        </div>
      </div>

      {/* Occupancy bar */}
      <Progress value={occupancyPercent} className="h-2" />

      {/* Ticket types breakdown */}
      {event.locations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ingressos por tipo</p>
          <div className="space-y-1.5">
            {event.locations.map((loc, i) => {
              const LocIcon = LOCATION_ICONS[loc.location_type] || Ticket;
              const color = LOCATION_COLORS[loc.location_type] || 'hsl(var(--muted-foreground))';
              const locPercent = loc.total_quantity > 0
                ? Math.round((Number(loc.sold_quantity) / loc.total_quantity) * 100)
                : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <LocIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                  <span className="flex-1 min-w-0 truncate font-medium">{loc.location_name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {loc.sold_quantity}/{loc.total_quantity}
                  </span>
                  <span className="font-semibold whitespace-nowrap" style={{ color }}>
                    R$ {Number(loc.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </button>
  );
}

function ProducerCard({ producer, onClick }: { producer: ProducerOverview; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-amber-500/40 transition-colors text-left">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg shrink-0">
        {producer.producer_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-display font-bold text-sm truncate">{producer.producer_name}</p>
        <p className="text-xs text-muted-foreground truncate">{producer.producer_email}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{producer.total_events} eventos</span>
          <span>•</span>
          <span>R$ {Number(producer.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span>•</span>
          <span>{producer.total_tickets_sold} ingressos</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  );
}
