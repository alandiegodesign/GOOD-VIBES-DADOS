import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getEventsByCreator } from '@/services/eventService';
import { getLocationsByEvent } from '@/services/ticketLocationService';
import { findUserByEmailOrCpf, createOrder, CartItem } from '@/services/orderService';
import { ArrowLeft, Gift, Search, UserCheck, Ticket, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SendCourtesyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [foundUser, setFoundUser] = useState<{ user_id: string; user_name: string; user_email: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['producer-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  const activeEvents = useMemo(() => events.filter(e => !e.deleted_at), [events]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', selectedEventId],
    queryFn: () => getLocationsByEvent(selectedEventId),
    enabled: !!selectedEventId,
  });

  const activeLocations = useMemo(() => locations.filter(l => l.is_active && !l.is_sold_out), [locations]);

  const selectedLocation = useMemo(() => locations.find(l => l.id === selectedLocationId), [locations, selectedLocationId]);

  const handleSearch = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const result = await findUserByEmailOrCpf(trimmed);
      if (result) {
        setFoundUser(result);
      } else {
        toast.error('Usuário não encontrado. Verifique o CPF ou e-mail.');
      }
    } catch {
      toast.error('Erro ao buscar usuário.');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!selectedEventId || !selectedLocationId || !foundUser) return;
    setSending(true);
    try {
      const items: CartItem[] = [{
        ticket_location_id: selectedLocationId,
        quantity,
        unit_price: 0, // cortesia = gratuito
      }];
      const order = await createOrder(selectedEventId, foundUser.user_id, items);
      if (order) {
        toast.success(`Cortesia enviada para ${foundUser.user_name}!`);
        setIdentifier('');
        setFoundUser(null);
        setSelectedLocationId('');
        setQuantity(1);
      } else {
        toast.error('Falha ao criar cortesia. Verifique a disponibilidade.');
      }
    } catch {
      toast.error('Erro ao enviar cortesia.');
    } finally {
      setSending(false);
    }
  };

  const canSend = selectedEventId && selectedLocationId && foundUser && quantity > 0;

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Gift className="w-6 h-6" /> Enviar Cortesia
          </h1>
          <p className="text-white/70 text-sm mt-1">Envie ingressos gratuitos para usuários cadastrados</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-5">
        {/* Select Event */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-display font-semibold text-base">1. Selecione o Evento</h2>
          <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v); setSelectedLocationId(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um evento" />
            </SelectTrigger>
            <SelectContent>
              {activeEvents.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select Location */}
        {selectedEventId && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-base">2. Selecione o Local / Setor</h2>
            {activeLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum setor disponível para este evento.</p>
            ) : (
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um setor" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} — {l.available_quantity} disponíveis
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedLocation && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Quantidade:</label>
                <Input
                  type="number"
                  min={1}
                  max={selectedLocation.available_quantity}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
              </div>
            )}
          </div>
        )}

        {/* Find User */}
        {selectedLocationId && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-base">3. Buscar Destinatário</h2>
            <div className="flex gap-2">
              <Input
                placeholder="CPF ou e-mail do usuário"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setFoundUser(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching || !identifier.trim()} size="icon" variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {foundUser && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-primary/10 rounded-xl p-4 border border-primary/20">
                <UserCheck className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{foundUser.user_name}</p>
                  <p className="text-xs text-muted-foreground">{foundUser.user_email}</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Send Button */}
        {canSend && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button onClick={handleSend} disabled={sending} className="w-full h-12 text-base gap-2 rounded-xl">
              <Send className="w-5 h-5" />
              {sending ? 'Enviando...' : `Enviar ${quantity} Cortesia(s)`}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
