import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProducerSales } from '@/services/orderService';
import { getEvent } from '@/services/eventService';
import { ArrowLeft, TrendingUp, Users, Ticket, DollarSign, BarChart3, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['#9D4EDD', '#F72585', '#FF6D00', '#00B4D8', '#4CC9F0', '#7209B7'];

export default function ProducerDashboardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId!),
    enabled: !!eventId,
  });

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ['producer-sales', user?.id],
    queryFn: () => getProducerSales(user!.id),
    enabled: !!user,
  });

  // Filter sales for this specific event
  const sales = useMemo(() => allSales.filter(s => s.event_id === eventId), [allSales, eventId]);

  // Aggregate stats
  const stats = useMemo(() => {
    const uniqueOrders = new Set(sales.map(s => s.order_id));
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
    const totalTickets = sales.reduce((sum, s) => sum + s.item_quantity, 0);
    const uniqueBuyers = new Set(sales.map(s => s.buyer_id));
    return { orders: uniqueOrders.size, revenue: totalRevenue, tickets: totalTickets, buyers: uniqueBuyers.size };
  }, [sales]);

  // Tickets by type for pie chart
  const ticketsByType = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const label = s.location_name || s.location_type;
      map[label] = (map[label] || 0) + s.item_quantity;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // Recent orders (unique)
  const recentOrders = useMemo(() => {
    const seen = new Set<string>();
    const orders: { id: string; total: number; status: string; date: string; buyer: string }[] = [];
    for (const s of sales) {
      if (!seen.has(s.order_id)) {
        seen.add(s.order_id);
        orders.push({
          id: s.order_id,
          total: Number(s.total_amount),
          status: s.order_status,
          date: s.order_created_at,
          buyer: s.buyer_id,
        });
      }
      if (orders.length >= 20) break;
    }
    return orders;
  }, [sales]);

  const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400' },
    confirmed: { label: 'Confirmado', className: 'bg-green-500/20 text-green-400' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500/20 text-red-400' },
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Dashboard de Vendas
          </h1>
          <p className="text-white/70 text-sm mt-1">{event?.title || 'Carregando...'}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-5">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando dados...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Receita" value={`R$ ${stats.revenue.toFixed(2)}`} color="#4CC9F0" />
              <StatCard icon={Ticket} label="Ingressos Vendidos" value={String(stats.tickets)} color="#F72585" />
              <StatCard icon={Users} label="Compradores" value={String(stats.buyers)} color="#9D4EDD" />
              <StatCard icon={TrendingUp} label="Pedidos" value={String(stats.orders)} color="#FF6D00" />
            </div>

            {/* Tickets by Location - Pie Chart */}
            {ticketsByType.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <h2 className="font-display font-semibold text-lg">Vendas por Local</h2>
                <div className="h-52 flex items-center">
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie data={ticketsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={4} dataKey="value">
                        {ticketsByType.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                        formatter={(value: number) => [value, 'Ingressos']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {ticketsByType.map((t, i) => (
                      <div key={t.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{t.name}</span>
                        <span className="font-bold ml-auto">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-lg">Pedidos Recentes</h2>
              {recentOrders.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-display">Nenhuma venda ainda</p>
                  <p className="text-sm mt-1">Compartilhe o link do evento para começar a vender!</p>
                </div>
              )}
              {recentOrders.map(order => {
                const st = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                return (
                  <div key={order.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-sm">R$ {order.total.toFixed(2)}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
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
