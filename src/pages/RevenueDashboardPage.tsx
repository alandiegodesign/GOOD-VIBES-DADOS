import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProducerSales, ProducerSaleRow } from '@/services/orderService';
import { ArrowLeft, DollarSign, TrendingUp, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type ViewMode = 'weekly' | 'monthly';

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function getWeekKey(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function RevenueDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  // Month/year navigation for filtering
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['producer-sales', user?.id],
    queryFn: () => getProducerSales(user!.id),
    enabled: !!user,
  });

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  // Filter sales by selected month
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.order_created_at);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [sales, selectedYear, selectedMonth]);

  // Stats for the selected period
  const periodStats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
    const tickets = filteredSales.reduce((sum, s) => sum + s.item_quantity, 0);
    const orders = new Set(filteredSales.map(s => s.order_id)).size;
    return { revenue, tickets, orders };
  }, [filteredSales]);

  // Chart data
  const chartData = useMemo(() => {
    if (viewMode === 'weekly') {
      // Group by week within the selected month
      const weeks: Record<string, { key: string; label: string; revenue: number; tickets: number }> = {};
      filteredSales.forEach(s => {
        const d = new Date(s.order_created_at);
        const key = getWeekKey(d);
        if (!weeks[key]) {
          weeks[key] = { key, label: getWeekLabel(d), revenue: 0, tickets: 0 };
        }
        weeks[key].revenue += Number(s.item_subtotal);
        weeks[key].tickets += s.item_quantity;
      });
      return Object.values(weeks).sort((a, b) => a.key.localeCompare(b.key));
    } else {
      // Group by day within the selected month
      const days: Record<string, { key: string; label: string; revenue: number; tickets: number }> = {};
      filteredSales.forEach(s => {
        const d = new Date(s.order_created_at);
        const key = d.toISOString().slice(0, 10);
        const label = String(d.getDate());
        if (!days[key]) {
          days[key] = { key, label, revenue: 0, tickets: 0 };
        }
        days[key].revenue += Number(s.item_subtotal);
        days[key].tickets += s.item_quantity;
      });
      return Object.values(days).sort((a, b) => a.key.localeCompare(b.key));
    }
  }, [filteredSales, viewMode]);

  // Revenue by event for selected period
  const eventBreakdown = useMemo(() => {
    const map: Record<string, { title: string; revenue: number; tickets: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.event_id]) {
        map[s.event_id] = { title: s.event_title, revenue: 0, tickets: 0 };
      }
      map[s.event_id].revenue += Number(s.item_subtotal);
      map[s.event_id].tickets += s.item_quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> Faturamento
          </h1>
          <p className="text-white/70 text-sm mt-1">Acompanhe sua receita semanal e mensal</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-5">
        {/* Month navigator */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
          <button onClick={goToPrevMonth} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="font-display font-bold text-lg capitalize">
            {getMonthLabel(selectedYear, selectedMonth)}
          </p>
          <button onClick={goToNextMonth} disabled={isCurrentMonth}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-2">
          <Button size="sm" variant={viewMode === 'weekly' ? 'default' : 'outline'}
            className={viewMode === 'weekly' ? 'gradient-primary border-0 flex-1' : 'flex-1'}
            onClick={() => setViewMode('weekly')}>
            Semanal
          </Button>
          <Button size="sm" variant={viewMode === 'monthly' ? 'default' : 'outline'}
            className={viewMode === 'monthly' ? 'gradient-primary border-0 flex-1' : 'flex-1'}
            onClick={() => setViewMode('monthly')}>
            Mensal
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando dados...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Receita</p>
                <p className="font-display font-bold text-sm">R$ {periodStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary/10">
                  <Ticket className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-xs text-muted-foreground">Ingressos</p>
                <p className="font-display font-bold text-sm">{periodStats.tickets}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/10">
                  <TrendingUp className="w-5 h-5 text-accent-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
                <p className="font-display font-bold text-sm">{periodStats.orders}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h2 className="font-display font-semibold text-sm">
                Faturamento {viewMode === 'weekly' ? 'por semana' : 'por dia'}
              </h2>
              {chartData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, index) => (
                          <Cell key={index} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma venda neste período
                </div>
              )}
            </div>

            {/* Event breakdown */}
            {eventBreakdown.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <h2 className="font-display font-semibold text-sm">Receita por Evento</h2>
                <div className="space-y-2">
                  {eventBreakdown.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.tickets} ingressos</p>
                      </div>
                      <p className="font-display font-bold text-sm text-primary shrink-0 ml-3">
                        R$ {e.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
