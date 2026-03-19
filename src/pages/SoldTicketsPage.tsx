import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProducerTickets, validateOrder, ProducerTicketRow } from '@/services/orderService';
import { getEventsByCreator } from '@/services/eventService';
import {
  ArrowLeft, TicketCheck, Calendar, User, Mail, Phone, CreditCard,
  Clock, RefreshCw, Search, CheckCircle2, ChevronDown, ChevronUp, QrCode,
  Crown, Users, Star, UtensilsCrossed, Music, ScanLine, Camera, Keyboard,
  XCircle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import ProducerSidebar from '@/components/ProducerSidebar';
import QRScanner from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';

const TYPE_ICONS: Record<string, React.ElementType> = {
  pista: Music,
  vip: Star,
  camarote: Crown,
  camarote_grupo: Users,
  bistro: UtensilsCrossed,
};

const TYPE_LABELS: Record<string, string> = {
  pista: 'Pista',
  vip: 'Área VIP',
  camarote: 'Camarote individual',
  camarote_grupo: 'Camarote em grupo',
  bistro: 'Bistrô',
};

interface GroupedOrder {
  orderId: string;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCpf: string;
  status: string;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  items: {
    itemId: string;
    locationName: string;
    locationType: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export default function SoldTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'scanner' | 'manual'>('scanner');
  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ valid: boolean; event?: string; location?: string; buyer?: string; quantity?: number; orderId?: string; alreadyValidated?: boolean } | null>(null);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['producer-tickets', user?.id],
    queryFn: () => getProducerTickets(user!.id),
    enabled: !!user,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  const validateMutation = useMutation({
    mutationFn: (orderId: string) => validateOrder(orderId, user!.id),
    onSuccess: (success) => {
      if (success) {
        toast.success('Ingresso validado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['producer-tickets'] });
      } else {
        toast.error('Não foi possível validar este ingresso');
      }
    },
    onError: () => toast.error('Erro ao validar ingresso'),
  });

  // Group raw ticket rows by order
  const orders: GroupedOrder[] = useMemo(() => {
    const map = new Map<string, GroupedOrder>();
    for (const t of tickets) {
      if (!map.has(t.order_id)) {
        map.set(t.order_id, {
          orderId: t.order_id,
          eventId: t.event_id,
          eventTitle: t.event_title,
          buyerName: t.buyer_name || '—',
          buyerEmail: t.buyer_email || '—',
          buyerPhone: t.buyer_phone || '—',
          buyerCpf: t.buyer_cpf || '—',
          status: t.order_status,
          validatedAt: t.validated_at,
          createdAt: t.order_created_at,
          updatedAt: t.order_updated_at,
          totalAmount: Number(t.total_amount),
          items: [],
        });
      }
      map.get(t.order_id)!.items.push({
        itemId: t.item_id,
        locationName: t.location_name,
        locationType: t.location_type,
        quantity: t.item_quantity,
        unitPrice: Number(t.item_unit_price),
        subtotal: Number(t.item_subtotal),
      });
    }
    return Array.from(map.values());
  }, [tickets]);

  // Filter by event
  const eventFiltered = useMemo(() => {
    if (selectedEventId === 'all') return orders;
    return orders.filter(o => o.eventId === selectedEventId);
  }, [orders, selectedEventId]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return eventFiltered;
    const q = searchQuery.toLowerCase();
    return eventFiltered.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      o.buyerName.toLowerCase().includes(q) ||
      o.buyerEmail.toLowerCase().includes(q) ||
      o.buyerCpf.toLowerCase().includes(q) ||
      o.items.some(i => i.locationName.toLowerCase().includes(q))
    );
  }, [eventFiltered, searchQuery]);

  // Split into pending / validated
  const pendingOrders = searchFiltered.filter(o => !o.validatedAt);
  const validatedOrders = searchFiltered.filter(o => !!o.validatedAt);

  // Group orders by location type
  const groupByLocationType = (list: GroupedOrder[]) => {
    const groups: Record<string, GroupedOrder[]> = {};
    for (const o of list) {
      const mainType = o.items[0]?.locationType || 'other';
      if (!groups[mainType]) groups[mainType] = [];
      groups[mainType].push(o);
    }
    return groups;
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // QR Scanner validation logic - uses lookup_ticket_by_code
  const handleScanValidate = async (code: string) => {
    setScanLoading(true);
    setScanResult(null);
    try {
      const { data, error } = await supabase.rpc('lookup_ticket_by_code', {
        p_code: code,
        p_producer_id: user!.id,
      });
      if (error || !data || data.length === 0 || !data[0].order_id) {
        setScanResult({ valid: false });
      } else {
        const row = data[0] as any;
        setScanResult({
          valid: row.is_valid && !row.is_already_validated,
          event: row.event_title || '—',
          location: row.location_name || '—',
          buyer: row.buyer_name || '—',
          quantity: row.item_quantity || 0,
          orderId: row.order_id,
          alreadyValidated: row.is_already_validated,
        });
      }
    } catch {
      setScanResult({ valid: false });
    } finally {
      setScanLoading(false);
    }
  };

  const handleQRScan = (decodedText: string) => {
    const match = decodedText.match(/ticketvibe:\/\/validate\/(.+)/);
    const code = match ? match[1] : decodedText;
    setScanCode(code);
    handleScanValidate(code);
  };

  const handleManualScan = () => {
    if (!scanCode.trim()) return;
    handleScanValidate(scanCode.trim());
  };

  const handleScanAndValidate = async () => {
    if (!scanResult?.orderId || !user) return;
    const success = await validateOrder(scanResult.orderId, user.id);
    if (success) {
      toast.success('Ingresso validado!');
      queryClient.invalidateQueries({ queryKey: ['producer-tickets'] });
      setScanResult(prev => prev ? { ...prev, valid: false } : null);
    } else {
      toast.error('Erro ao validar');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setScanCode('');
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <ProducerSidebar />
            <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <TicketCheck className="w-6 h-6" /> Ingressos Vendidos
            </h1>
          </div>
          {/* Event filter + Search */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-11 rounded-xl sm:w-64">
                <SelectValue placeholder="Todos os eventos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, cliente, CPF..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-11 rounded-xl"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-white hover:bg-white/20 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-white/80 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> Validar: {pendingOrders.length}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Validados: {validatedOrders.length}
            </span>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-6 -mt-6">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full grid grid-cols-3 h-12 rounded-xl">
              <TabsTrigger value="pending" className="rounded-lg font-display font-semibold text-xs sm:text-sm">
                Validar ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="validated" className="rounded-lg font-display font-semibold text-xs sm:text-sm">
                Validados ({validatedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="scanner" className="rounded-lg font-display font-semibold text-xs sm:text-sm gap-1">
                <ScanLine className="w-4 h-4" /> Scanner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-5">
              <OrderGroupList
                orders={pendingOrders}
                groupByLocationType={groupByLocationType}
                expandedOrderId={expandedOrderId}
                onToggle={toggleExpand}
                onValidate={(id) => validateMutation.mutate(id)}
                validating={validateMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="validated" className="space-y-5">
              <OrderGroupList
                orders={validatedOrders}
                groupByLocationType={groupByLocationType}
                expandedOrderId={expandedOrderId}
                onToggle={toggleExpand}
                validated
              />
            </TabsContent>

            <TabsContent value="scanner" className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={scanMode === 'scanner' ? 'default' : 'outline'}
                  className={scanMode === 'scanner' ? 'gradient-primary text-white flex-1 border-0' : 'flex-1'}
                  onClick={() => { setScanMode('scanner'); resetScan(); }}
                >
                  <Camera className="w-4 h-4 mr-2" /> Câmera
                </Button>
                <Button
                  variant={scanMode === 'manual' ? 'default' : 'outline'}
                  className={scanMode === 'manual' ? 'gradient-primary text-white flex-1 border-0' : 'flex-1'}
                  onClick={() => { setScanMode('manual'); resetScan(); }}
                >
                  <Keyboard className="w-4 h-4 mr-2" /> Manual
                </Button>
              </div>

              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                {scanMode === 'scanner' && !scanResult && (
                  <QRScanner onScan={handleQRScan} onError={() => setScanMode('manual')} />
                )}

                {scanMode === 'manual' && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código de validação"
                      value={scanCode}
                      onChange={e => setScanCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleManualScan} disabled={scanLoading} className="gradient-primary text-white border-0">
                      <Search className="w-4 h-4 mr-1" /> Validar
                    </Button>
                  </div>
                )}

                {scanLoading && (
                  <p className="text-center text-muted-foreground text-sm">Validando...</p>
                )}

                {scanResult && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                    {scanResult.valid ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                        <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
                        <div>
                          <p className="font-display font-bold text-green-400">Ingresso Válido ✓</p>
                          <p className="text-sm text-muted-foreground mt-1">Evento: {scanResult.event}</p>
                          <p className="text-sm text-muted-foreground">Local: {scanResult.location}</p>
                          <p className="text-sm text-muted-foreground">Comprador: {scanResult.buyer}</p>
                          <p className="text-sm text-muted-foreground">Quantidade: {scanResult.quantity}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                        <XCircle className="w-8 h-8 text-destructive shrink-0" />
                        <div>
                          <p className="font-display font-bold text-destructive">Ingresso Inválido ✗</p>
                          <p className="text-sm text-muted-foreground">Código não encontrado ou cancelado</p>
                        </div>
                      </div>
                    )}

                    {scanResult.valid && (
                      <Button onClick={handleScanAndValidate} className="w-full gradient-primary border-0 rounded-xl font-display font-bold gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Marcar como validado
                      </Button>
                    )}

                    <Button variant="outline" className="w-full" onClick={resetScan}>
                      Escanear outro ingresso
                    </Button>
                  </motion.div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
}

function OrderGroupList({
  orders,
  groupByLocationType,
  expandedOrderId,
  onToggle,
  onValidate,
  validating,
  validated,
}: {
  orders: GroupedOrder[];
  groupByLocationType: (list: GroupedOrder[]) => Record<string, GroupedOrder[]>;
  expandedOrderId: string | null;
  onToggle: (id: string) => void;
  onValidate?: (id: string) => void;
  validating?: boolean;
  validated?: boolean;
}) {
  const groups = groupByLocationType(orders);

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <TicketCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-display">{validated ? 'Nenhum ingresso validado' : 'Nenhum ingresso pendente'}</p>
      </div>
    );
  }

  return (
    <>
      {Object.entries(groups).map(([type, groupOrders]) => {
        const Icon = TYPE_ICONS[type] || Music;
        const label = TYPE_LABELS[type] || type;
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Icon className="w-4 h-4" /> {label}
              </h3>
              <span className="text-xs font-bold text-primary">{groupOrders.length}</span>
            </div>
            {groupOrders.map(order => (
              <OrderCard
                key={order.orderId}
                order={order}
                expanded={expandedOrderId === order.orderId}
                onToggle={() => onToggle(order.orderId)}
                onValidate={onValidate}
                validating={validating}
                validated={validated}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onValidate,
  validating,
  validated,
}: {
  order: GroupedOrder;
  expanded: boolean;
  onToggle: () => void;
  onValidate?: (id: string) => void;
  validating?: boolean;
  validated?: boolean;
}) {
  const mainItem = order.items[0];
  const Icon = TYPE_ICONS[mainItem?.locationType] || Music;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Summary row */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{mainItem?.locationName || '—'}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              {TYPE_LABELS[mainItem?.locationType] || mainItem?.locationType}
            </Badge>
            <span className="text-xs text-muted-foreground">{order.eventTitle}</span>
            <span className="text-xs text-muted-foreground">· {mainItem?.quantity}x</span>
          </div>
        </div>
        {validated && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] shrink-0">
            VALIDADO
          </Badge>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-5 space-y-4">
              {/* Event + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-display font-semibold text-sm">{order.eventTitle} · {mainItem?.locationName}</span>
                </div>
                <Badge className={validated
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }>
                  {validated ? 'VALIDADO' : 'PENDENTE'}
                </Badge>
              </div>

              {/* Order code */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="w-4 h-4" />
                <span className="font-mono text-xs">{order.orderId.slice(0, 8).toUpperCase()}</span>
              </div>

              {/* Buyer info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{order.buyerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{order.buyerEmail}</span>
                </div>
                {order.buyerPhone && order.buyerPhone !== '—' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{order.buyerPhone}</span>
                  </div>
                )}
                {order.buyerCpf && order.buyerCpf !== '—' && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span>{order.buyerCpf}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Criado: {new Date(order.createdAt).toLocaleString('pt-BR')}
                </div>
                {order.validatedAt && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Validado: {new Date(order.validatedAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Validate button */}
              <div className="flex items-center justify-end gap-4 pt-2">
                {!validated && onValidate && (
                  <Button
                    onClick={() => onValidate(order.orderId)}
                    disabled={validating}
                    className="gradient-primary border-0 rounded-xl font-display font-bold gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Validar manualmente
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
