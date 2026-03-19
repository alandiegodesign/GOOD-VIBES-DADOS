import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getOrdersByUser } from '@/services/orderService';
import { getEvent } from '@/services/eventService';
import { ArrowLeft, ShoppingBag, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import TicketQRCode from '@/components/TicketQRCode';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TransferTicketDialog from '@/components/TransferTicketDialog';
import { supabase } from '@/integrations/supabase/client';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-500/20 text-yellow-400' },
  confirmed: { label: 'Confirmado', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelado', className: 'bg-red-500/20 text-red-400' },
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => getOrdersByUser(user!.id),
    enabled: !!user,
  });

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" /> Meus Ingressos
          </h1>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-4">
        {isLoading && <div className="text-center py-20 text-muted-foreground">Carregando...</div>}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-display text-lg">Nenhum pedido ainda</p>
            <p className="text-sm mt-1">Explore os eventos e faça sua primeira compra!</p>
          </div>
        )}

        {orders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
      </motion.div>
    </div>
  );
}

interface TicketCode {
  item_id: string;
  validation_code: string;
  location_name: string;
  quantity: number;
}

function OrderCard({ order }: { order: { id: string; event_id: string; status: string; total_amount: number; created_at: string; user_id: string } }) {
  const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const [showQR, setShowQR] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const { user } = useAuth();

  const { data: event } = useQuery({
    queryKey: ['event', order.event_id],
    queryFn: () => getEvent(order.event_id),
  });

  const { data: ticketCodes = [] } = useQuery({
    queryKey: ['ticket-codes', order.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_ticket_codes', {
        p_order_id: order.id,
        p_user_id: user!.id,
      });
      if (error) throw error;
      return (data as unknown as TicketCode[]) || [];
    },
    enabled: !!user,
  });

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden">
      {event?.banner_image && (
        <img src={event.banner_image} alt={event?.title || 'Evento'} className="w-full aspect-[16/9] object-cover" />
      )}
      <div className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-semibold">{event?.title || 'Evento'}</h3>
          <p className="text-xs text-muted-foreground">
            {event?.date
              ? new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' às ' + (event.time || '')
              : new Date(order.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.className}`}>{status.label}</span>
      </div>

      <div className="space-y-1">
        {(() => {
          const grouped = ticketCodes.reduce<Record<string, number>>((acc, tc) => {
            acc[tc.location_name] = (acc[tc.location_name] || 0) + tc.quantity;
            return acc;
          }, {});
          return Object.entries(grouped).map(([name, qty]) => (
            <div key={name} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{name} — {qty} {qty > 1 ? 'ingressos individuais' : 'ingresso'}</span>
            </div>
          ));
        })()}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-display font-bold text-lg text-gradient">R$ {Number(order.total_amount).toFixed(2)}</span>
      </div>

      {order.status === 'confirmed' && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setShowTransfer(true)}>
            <Send className="w-4 h-4" /> Enviar Ingresso
          </Button>
        </div>
      )}

      {order.status === 'confirmed' && (
        <Collapsible open={showQR} onOpenChange={setShowQR}>
          <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <ChevronDown className={`w-4 h-4 transition-transform ${showQR ? 'rotate-180' : ''}`} />
            {showQR ? 'Ocultar QR Codes' : 'Mostrar QR Codes dos Ingressos'}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col items-center py-4 border-t border-border space-y-6">
              <p className="text-xs text-muted-foreground">Apresente o QR Code na entrada do evento</p>
              {ticketCodes.map((tc, idx) => (
                <div key={tc.item_id} className="flex flex-col items-center gap-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {tc.location_name} {tc.quantity === 1 && ticketCodes.filter(t => t.location_name === tc.location_name).length > 1
                      ? `#${ticketCodes.filter(t => t.location_name === tc.location_name).indexOf(tc) + 1}`
                      : `(x${tc.quantity})`}
                  </p>
                  <TicketQRCode code={tc.validation_code} size={180} />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <TransferTicketDialog open={showTransfer} onOpenChange={setShowTransfer} orderId={order.id} />
      </div>
    </motion.div>
  );
}
