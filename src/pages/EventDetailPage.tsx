import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent, softDeleteEvent, toggleEventVisibility } from '@/services/eventService';
import { getLocationsByEvent } from '@/services/ticketLocationService';
import { getProducerSales } from '@/services/orderService';

import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, Clock, MapPin, Settings, Ticket, DollarSign, Eye, EyeOff, Link2, Copy, BarChart3, Trash2, Music, Star, Crown, Wine, Users, Pencil, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { LocationType } from '@/services/ticketLocationService';
import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ZoomableImage } from '@/components/ZoomableImage';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isProdutor = profile?.user_type === 'produtor';
  const clientView = searchParams.get('view') === 'client';

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', id],
    queryFn: () => getLocationsByEvent(id!),
    enabled: !!id,
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const setQty = (locId: string, qty: number) => setQuantities(prev => ({ ...prev, [locId]: qty }));
  const toggleGroup = (type: string) => setOpenGroups(prev => ({ ...prev, [type]: !prev[type] }));

  const ICONS: Record<LocationType, React.ElementType> = {
    pista: Music, vip: Star, camarote: Crown, camarote_grupo: Users, bistro: Wine, sofa: Crown,
  };

  const cartTotal = useMemo(() => {
    return locations.reduce((sum, loc) => sum + (quantities[loc.id] || 0) * loc.price, 0);
  }, [locations, quantities]);

  const hasItems = Object.values(quantities).some(q => q > 0);

  const handleBuy = () => {
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
    navigate(`/checkout/${id}`, { state: { items: cartItems, total: cartTotal } });
  };

  // Only the creator (producer) can manage this event
  const isOwner = isProdutor && !clientView && event?.created_by === user?.id;

  // Fetch sales data for owner stats
  const { data: sales = [] } = useQuery({
    queryKey: ['producer-sales', user?.id],
    queryFn: () => getProducerSales(user!.id),
    enabled: !!user && !!isOwner,
  });

  const eventStats = useMemo(() => {
    if (!event) return { tickets: 0, revenue: 0 };
    const eventSales = sales.filter(s => s.event_id === event.id);
    const tickets = eventSales.reduce((sum, s) => sum + s.item_quantity, 0);
    const revenue = eventSales.reduce((sum, s) => sum + Number(s.item_subtotal), 0);
    return { tickets, revenue };
  }, [sales, event]);

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: 'Evento movido para a lixeira!', description: 'Será excluído permanentemente em 7 dias.' });
      navigate('/');
    },
    onError: () => toast({ title: 'Erro ao excluir evento', variant: 'destructive' }),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: () => toggleEventVisibility(id!, !event?.is_visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      toast({ title: event?.is_visible ? 'Evento ocultado!' : 'Evento visível!' });
    },
    onError: () => toast({ title: 'Erro ao alterar visibilidade', variant: 'destructive' }),
  });

  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/event/${id}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: 'Link copiado!', description: 'Compartilhe com seus clientes.' });
  };

  if (loadingEvent) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Evento não encontrado</p></div>;

  // Block clients from viewing draft (not visible) events — only the owner can see them
  const isDraft = event.is_visible === false;
  if (isDraft && !isOwner) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Evento não disponível</p></div>;
  }

  return (
    <div className={`min-h-screen ${hasItems ? 'pb-28' : 'pb-8'}`}>
      <div className="relative h-64 overflow-hidden">
        {event.banner_image ? (
          <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button onClick={() => navigate(clientView ? '/?view=client' : '/')} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {isOwner && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur rounded-full pl-3 pr-1 py-1">
              <Link2 className="w-3.5 h-3.5 text-white/70 shrink-0" />
              <span className="text-[10px] text-white/70 truncate max-w-[140px]">{shareLink}</span>
              <button onClick={(e) => { e.stopPropagation(); copyLink(); }} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleVisibilityMutation.mutate()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
                {(event as any)?.is_visible !== false ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button onClick={() => navigate(`/manage-locations/${event.id}`)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-12 relative z-10 space-y-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-gradient">{event.title}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-secondary" />
              {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-accent" />
              {event.time}
            </span>
          {(event as any).location_name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {(event as any).location_name}{(event as any).location_address ? ` · ${(event as any).location_address}` : ''}
            </span>
          )}
          </div>
        </div>

        {isOwner && locations.length > 0 && (() => {
          const groupTypes: LocationType[] = ['camarote', 'camarote_grupo', 'bistro'];
          const regularLocs = locations.filter(loc => !groupTypes.includes(loc.location_type as LocationType));
          const grouped: Record<string, typeof locations> = {};
          locations.filter(loc => groupTypes.includes(loc.location_type as LocationType)).forEach(loc => {
            const key = loc.location_type;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(loc);
          });
          const groupLabels: Record<string, string> = {
            camarote: 'Camarotes', camarote_grupo: 'Camarotes em Grupo', bistro: 'Bistrôs',
          };

          const renderOwnerCard = (loc: typeof locations[0]) => {
            const Icon = ICONS[loc.location_type as LocationType] || Music;
            const isSoldOut = loc.is_sold_out === true || loc.available_quantity <= 0;
            const isInactive = loc.is_active === false;
            return (
              <div key={loc.id} className={`bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4 ${isInactive ? 'opacity-40' : isSoldOut ? 'opacity-60' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5" style={{ color: loc.color || '#9D4EDD' }} />
                    <span className="font-display font-semibold">{loc.name}</span>
                    {isInactive && <span className="text-xs font-bold uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Oculto</span>}
                    {!isInactive && isSoldOut && <span className="text-xs font-bold uppercase bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Esgotado</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {loc.group_size > 1 && <span className="font-medium">{loc.group_size} ingressos por grupo. </span>}
                    {loc.description}
                  </p>
                  <p className="font-bold text-lg mt-1" style={{ color: loc.color || '#9D4EDD' }}>R$ {Number(loc.price).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{loc.available_quantity}/{loc.quantity}</p>
                </div>
              </div>
            );
          };

          const renderOwnerCompactRow = (loc: typeof locations[0]) => {
            const Icon = ICONS[loc.location_type as LocationType] || Music;
            const isSoldOut = loc.is_sold_out === true || loc.available_quantity <= 0;
            const isInactive = loc.is_active === false;
            return (
              <div key={loc.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${isInactive ? 'opacity-40' : isSoldOut ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: loc.color || '#9D4EDD' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-medium text-sm truncate">{loc.name}</span>
                      {isInactive && <span className="text-[10px] font-bold uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">Oculto</span>}
                      {!isInactive && isSoldOut && <span className="text-[10px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full shrink-0">Esgotado</span>}
                    </div>
                    {loc.group_size > 1 && <p className="text-[10px] text-primary font-medium">{loc.group_size} ingressos por grupo</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-sm" style={{ color: loc.color || '#9D4EDD' }}>R$ {Number(loc.price).toFixed(2)}</span>
                  <p className="text-[10px] text-muted-foreground">{loc.available_quantity}/{loc.quantity}</p>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-lg">Locais Cadastrados</h2>
                <div className="flex gap-2">
                  {isDraft && (
                    <Button size="sm" onClick={() => toggleVisibilityMutation.mutate()} disabled={toggleVisibilityMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                      <Send className="w-4 h-4" />
                      {toggleVisibilityMutation.isPending ? 'Publicando...' : 'Publicar Evento'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigate(`/manage-locations/${event.id}`)} className="border-accent text-accent hover:bg-accent/10">
                    <Settings className="w-4 h-4 mr-1.5" /> Editar Locais
                  </Button>
                </div>
              </div>
              {regularLocs.map(renderOwnerCard)}
              {Object.entries(grouped).map(([type, locs]) => {
                if (locs.length === 1) return renderOwnerCard(locs[0]);
                const Icon = ICONS[type as LocationType] || Music;
                const color = locs[0]?.color || '#9D4EDD';
                const price = locs[0]?.price;
                const allSamePrice = locs.every(l => l.price === price);
                return (
                  <div key={type} className="bg-card rounded-2xl border-2 overflow-hidden" style={{ borderColor: `${color}40` }}>
                    <button onClick={() => toggleGroup(`owner_${type}`)} className="w-full px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-display font-bold text-base block">{groupLabels[type] || type}</span>
                        <span className="text-xs text-muted-foreground">{locs.length} opções{locs[0]?.group_size > 1 ? ` · ${locs[0].group_size} ingressos por grupo` : ''}</span>
                      </div>
                      {allSamePrice && <span className="font-bold text-base shrink-0" style={{ color }}>R$ {Number(price).toFixed(2)}</span>}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openGroups[`owner_${type}`] ? 'rotate-180' : ''}`} />
                    </button>
                    {openGroups[`owner_${type}`] && (
                      <div className="divide-y divide-border border-t border-border">
                        {locs.map(renderOwnerCompactRow)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {!isOwner && locations.length > 0 && (() => {
          const activeLocs = locations.filter(loc => loc.is_active !== false);
          const groupTypes: LocationType[] = ['camarote', 'camarote_grupo', 'bistro'];
          const regularLocs = activeLocs.filter(loc => !groupTypes.includes(loc.location_type as LocationType));
          
          const grouped: Record<string, typeof activeLocs> = {};
          activeLocs.filter(loc => groupTypes.includes(loc.location_type as LocationType)).forEach(loc => {
            const key = loc.location_type;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(loc);
          });

          const groupLabels: Record<string, string> = {
            camarote: 'Camarotes', camarote_grupo: 'Camarotes em Grupo', bistro: 'Bistrôs',
          };

          const renderFullCard = (loc: typeof activeLocs[0]) => {
            const Icon = ICONS[loc.location_type as LocationType] || Music;
            const isSoldOut = loc.is_sold_out === true || loc.available_quantity <= 0;
            return (
              <div key={loc.id} className={`bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4 ${isSoldOut ? 'opacity-60' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5" style={{ color: loc.color || '#9D4EDD' }} />
                    <span className="font-display font-semibold">{loc.name}</span>
                    {isSoldOut && <span className="text-xs font-bold uppercase bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Esgotado</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {loc.group_size > 1 && <span className="font-medium">{loc.group_size} ingressos por grupo. </span>}
                    {loc.description}
                  </p>
                  <p className="font-bold text-lg mt-1" style={{ color: loc.color || '#9D4EDD' }}>R$ {Number(loc.price).toFixed(2)}</p>
                  {!isSoldOut && <p className="text-xs text-muted-foreground">{loc.available_quantity} disponíveis</p>}
                </div>
                {!isSoldOut && <QuantitySelector value={quantities[loc.id] || 0} max={loc.available_quantity} onChange={v => setQty(loc.id, v)} color={loc.color || '#9D4EDD'} />}
              </div>
            );
          };

          const renderCompactRow = (loc: typeof activeLocs[0]) => {
            const Icon = ICONS[loc.location_type as LocationType] || Music;
            const isSoldOut = loc.is_sold_out === true || loc.available_quantity <= 0;
            return (
                <div key={loc.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${isSoldOut ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: loc.color || '#9D4EDD' }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-medium text-sm truncate">{loc.name}</span>
                      {isSoldOut ? (
                        <span className="text-[10px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full shrink-0">Esgotado</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground shrink-0">({loc.available_quantity} disp.)</span>
                      )}
                    </div>
                    {loc.group_size > 1 && (
                      <p className="text-[10px] text-primary font-medium">{loc.group_size} ingressos individuais</p>
                    )}
                  </div>
                </div>
                <span className="font-bold text-sm shrink-0" style={{ color: loc.color || '#9D4EDD' }}>R$ {Number(loc.price).toFixed(2)}</span>
                {!isSoldOut && <QuantitySelector value={quantities[loc.id] || 0} max={loc.available_quantity} onChange={v => setQty(loc.id, v)} color={loc.color || '#9D4EDD'} />}
              </div>
            );
          };

          return (
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-lg">Selecionar Ingressos</h2>
              {regularLocs.map(renderFullCard)}
              {Object.entries(grouped).map(([type, locs]) => {
                if (locs.length === 1) return renderFullCard(locs[0]);
                const Icon = ICONS[type as LocationType] || Music;
                const color = locs[0]?.color || '#9D4EDD';
                const price = locs[0]?.price;
                const allSamePrice = locs.every(l => l.price === price);
                return (
                  <div key={type} className="bg-card rounded-2xl border-2 overflow-hidden" style={{ borderColor: `${color}40` }}>
                    <button onClick={() => toggleGroup(type)} className="w-full px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-display font-bold text-base block">{groupLabels[type] || type}</span>
                        <span className="text-xs text-muted-foreground">{locs.length} opções disponíveis{locs[0]?.group_size > 1 ? ` · ${locs[0].group_size} ingressos por grupo` : ''}</span>
                      </div>
                      {allSamePrice && <span className="font-bold text-base shrink-0" style={{ color }}>R$ {Number(price).toFixed(2)}</span>}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${openGroups[type] ? 'rotate-180' : ''}`} />
                    </button>
                    {openGroups[type] && (
                      <div className="divide-y divide-border border-t border-border">
                        {locs.map(renderCompactRow)}
                      </div>
                    )}
                  </div>
                );
              })}
              {activeLocs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ingresso disponível.</p>}
            </div>
          );
        })()}

        <p className="text-muted-foreground leading-relaxed">{event.description}</p>

        {/* Quick stats for event owner */}
        {isOwner && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Visão rápida do evento
            </h2>
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" /> Estatísticas do evento
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <Ticket className="w-3.5 h-3.5" /> Ingressos vendidos: {eventStats.tickets}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <DollarSign className="w-3.5 h-3.5" /> Faturamento: R$ {eventStats.revenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {event.map_image && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-secondary" /> Mapa do Evento
            </h2>
            <ZoomableImage src={event.map_image} alt="Mapa do evento" />
          </div>
        )}

        {/* Google Maps embed */}
        {(event as any).location_address && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <iframe
              title="Localização do evento"
              width="100%"
              height="250"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent((event as any).location_address)}&output=embed`}
            />
          </div>
        )}

        {isOwner ? (
          <>

            <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Ferramentas do Produtor</p>
              <Button variant="ghost" className="w-full justify-start h-11 text-sm font-medium hover:bg-primary/10 hover:text-primary"
                onClick={() => navigate(`/edit-event/${event.id}`)}>
                <Pencil className="w-4 h-4 mr-3 text-primary" /> Editar Evento
              </Button>
              <Button variant="ghost" className="w-full justify-start h-11 text-sm font-medium hover:bg-primary/10 hover:text-primary"
                onClick={() => navigate(`/dashboard/${event.id}`)}>
                <BarChart3 className="w-4 h-4 mr-3 text-primary" /> Dashboard de Vendas
              </Button>
              <Button variant="ghost" className="w-full justify-start h-11 text-sm font-medium hover:bg-accent/10 hover:text-accent"
                onClick={() => navigate(`/manage-locations/${event.id}`)}>
                <Settings className="w-4 h-4 mr-3 text-accent" /> Gerenciar Locais
              </Button>
              <Button variant="ghost" className="w-full justify-start h-11 text-sm font-medium hover:bg-secondary/10 hover:text-secondary"
                onClick={() => toggleVisibilityMutation.mutate()}>
                {(event as any)?.is_visible !== false ? <><EyeOff className="w-4 h-4 mr-3 text-secondary" /> Ocultar Evento</> : <><Eye className="w-4 h-4 mr-3 text-secondary" /> Tornar Visível</>}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start h-11 text-sm font-medium hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-3 text-destructive/60" /> Mover para Lixeira
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados do evento serão removidos permanentemente.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : hasItems ? (
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-4 z-50">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-display font-bold text-2xl text-gradient">R$ {cartTotal.toFixed(2)}</p>
              </div>
              <Button onClick={handleBuy} className="h-12 px-8 gradient-primary border-0 rounded-xl font-display font-bold glow-primary">
                Finalizar Compra
              </Button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
