import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProducerSales } from '@/services/orderService';
import { getEventsByCreator } from '@/services/eventService';
import { ArrowLeft, TrendingUp, Users, Ticket, DollarSign, BarChart3, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['producer-sales', user?.id],
    queryFn: () => getProducerSales(user!.id),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  const totalStats = useMemo(() => {
    const uniqueOrders = new Set(sales.map(s => s.order_id));
    const revenue = sales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
    const tickets = sales.reduce((sum, s) => sum + s.item_quantity, 0);
    const buyers = new Set(sales.map(s => s.buyer_id));
    return { orders: uniqueOrders.size, revenue, tickets, buyers: buyers.size };
  }, [sales]);

  const eventStats = useMemo(() => {
    return events.map(e => {
      const eventSales = sales.filter(s => s.event_id === e.id);
      const tickets = eventSales.reduce((sum, s) => sum + s.item_quantity, 0);
      const revenue = eventSales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
      const orders = new Set(eventSales.map(s => s.order_id)).size;
      return { ...e, tickets, revenue, orders };
    });
  }, [events, sales]);

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Dashboard Geral
          </h1>
          <p className="text-white/70 text-sm mt-1">Resumo de vendas de todos os seus eventos</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-5">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando dados...</div>
        ) : (
          <>
            {/* Total Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Receita Total" value={`R$ ${totalStats.revenue.toFixed(2)}`} color="#4CC9F0" />
              <StatCard icon={Ticket} label="Ingressos Vendidos" value={String(totalStats.tickets)} color="#F72585" />
              <StatCard icon={Users} label="Compradores" value={String(totalStats.buyers)} color="#9D4EDD" />
              <StatCard icon={TrendingUp} label="Pedidos" value={String(totalStats.orders)} color="#FF6D00" />
            </div>

            {/* Events list with individual stats */}
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-lg">Vendas por Evento</h2>
              {eventStats.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-display">Nenhum evento criado</p>
                </div>
              )}
              {eventStats.map(e => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/dashboard/${e.id}`)}
                  className="w-full bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:border-primary/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{e.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Ticket className="w-3 h-3" /> {e.tickets} ingressos
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> R$ {e.revenue.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {e.orders} pedidos
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
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
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-lg">{value}</p>
    </motion.div>
  );
}
