import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEvent } from '@/services/eventService';
import { getLocationsByEvent, LocationType } from '@/services/ticketLocationService';
import { QuantitySelector } from '@/components/QuantitySelector';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Music, Star, Crown, UtensilsCrossed, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const ICONS: Record<LocationType, React.ElementType> = {
  pista: Music, vip: Star, camarote: Crown, camarote_grupo: Users, bistro: UtensilsCrossed, sofa: Crown,
};

export default function TicketSelectionPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId!),
    enabled: !!eventId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', eventId],
    queryFn: () => getLocationsByEvent(eventId!),
    enabled: !!eventId,
  });

  const setQty = (id: string, qty: number) => setQuantities(prev => ({ ...prev, [id]: qty }));

  const total = useMemo(() => {
    return locations.reduce((sum, loc) => sum + (quantities[loc.id] || 0) * loc.price, 0);
  }, [locations, quantities]);

  const hasItems = Object.values(quantities).some(q => q > 0);

  if (!event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  const handleNext = () => {
    const cartItems = locations
      .filter(loc => (quantities[loc.id] || 0) > 0)
      .map(loc => ({
        ticket_location_id: loc.id,
        quantity: quantities[loc.id],
        unit_price: loc.price,
        name: loc.name,
        type: loc.location_type as LocationType,
        color: loc.color || '#9D4EDD',
        group_size: loc.group_size || 1,
      }));
    navigate(`/checkout/${eventId}`, { state: { items: cartItems, total } });
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/event/${eventId}`)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white">Selecionar Ingressos</h1>
          <p className="text-white/70 text-sm mt-1">{event.title} · {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-4">
        {locations.filter(loc => loc.is_active !== false).map(loc => {
          const Icon = ICONS[loc.location_type as LocationType] || Music;
          const isSoldOut = (loc as any).is_sold_out === true || loc.available_quantity <= 0;
          return (
            <div key={loc.id} className={`bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4 ${isSoldOut ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5" style={{ color: loc.color || '#9D4EDD' }} />
                  <span className="font-display font-semibold">{loc.name}</span>
                  {isSoldOut && (
                    <span className="text-xs font-bold uppercase bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Esgotado</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {loc.group_size > 1 && <span className="font-medium">{loc.group_size} ingressos por grupo. </span>}
                  {loc.description}
                </p>
                <p className="font-bold text-lg mt-1" style={{ color: loc.color || '#9D4EDD' }}>
                  R$ {Number(loc.price).toFixed(2)}
                </p>
                
              </div>
              {!isSoldOut && (
                <QuantitySelector value={quantities[loc.id] || 0} max={loc.available_quantity} onChange={v => setQty(loc.id, v)} color={loc.color || '#9D4EDD'} />
              )}
            </div>
          );
        })}
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-display font-bold text-2xl text-gradient">R$ {total.toFixed(2)}</p>
          </div>
          <Button disabled={!hasItems} onClick={handleNext}
            className="h-12 px-8 gradient-primary border-0 rounded-xl font-display font-bold glow-primary">
            Finalizar Compra
          </Button>
        </div>
      </div>
    </div>
  );
}
