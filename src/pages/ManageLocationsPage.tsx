import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent, getEventsByCreator } from '@/services/eventService';
import { getLocationsByEvent, createLocation, deleteLocation, toggleLocationActive, toggleLocationSoldOut, updateLocationSortOrders, updateLocation, getLocationColor, LocationType } from '@/services/ticketLocationService';
import { LocationChip } from '@/components/LocationChip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, Copy, Layers, Check, Users, Star, Crown, UtensilsCrossed, Eye, EyeOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableLocationCard } from '@/components/SortableLocationCard';
import { SortableGroupCard } from '@/components/SortableGroupCard';

const LOCATION_TYPES = [
  { value: 'pista', label: 'Pista', icon: Users },
  { value: 'vip', label: 'Área VIP', icon: Star },
  { value: 'camarote', label: 'Camarote individual', icon: Crown },
  { value: 'camarote_grupo', label: 'Camarote em grupo', icon: Users },
  { value: 'bistro', label: 'Bistrô', icon: UtensilsCrossed },
  { value: 'sofa', label: 'Sofá', icon: Crown },
] as const;

type ExtendedLocationType = typeof LOCATION_TYPES[number]['value'];

export default function ManageLocationsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId!),
    enabled: !!eventId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', eventId],
    queryFn: () => getLocationsByEvent(eventId!),
    enabled: !!eventId,
  });

  const { data: myEvents = [] } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: () => getEventsByCreator(user!.id),
    enabled: !!user,
  });

  const previousEvents = myEvents.filter(e => e.id !== eventId);

  // Sectors toggle
  const [useSectors, setUseSectors] = useState(false);
  const [sectorName, setSectorName] = useState('');

  // Form state
  const [selectedType, setSelectedType] = useState<ExtendedLocationType>('pista');
  const [name, setName] = useState('Pista');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lote, setLote] = useState('');
  const [groupSize, setGroupSize] = useState('1');

  // Batch state
  const [useBatch, setUseBatch] = useState(false);
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editGroupSize, setEditGroupSize] = useState('');

  // Batch edit group dialog
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchEditLocs, setBatchEditLocs] = useState<any[]>([]);
  const [batchEditLabel, setBatchEditLabel] = useState('');
  const [batchEditPrice, setBatchEditPrice] = useState('');
  const [batchEditDescription, setBatchEditDescription] = useState('');
  const [batchEditGroupSize, setBatchEditGroupSize] = useState('');
  const [batchEditSaving, setBatchEditSaving] = useState(false);

  // Copy dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyingEventId, setCopyingEventId] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  const { data: copyLocations = [] } = useQuery({
    queryKey: ['locations', copyingEventId],
    queryFn: () => getLocationsByEvent(copyingEventId!),
    enabled: !!copyingEventId,
  });

  const addMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      setName(LOCATION_TYPES.find(t => t.value === selectedType)?.label || '');
      setPrice(''); setQuantity(''); setDescription('');
      toast.success('Local adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar local'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      toast.success('Local removido');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleLocationActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      toast.success('Visibilidade do local atualizada!');
    },
    onError: () => toast.error('Erro ao alterar visibilidade'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      setEditDialogOpen(false);
      setEditingLoc(null);
      toast.success('Local atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar local'),
  });

  const handleEditOpen = (loc: any) => {
    setEditingLoc(loc);
    setEditName(loc.name);
    setEditDescription(loc.description || '');
    setEditPrice(String(loc.price));
    setEditQuantity(String(loc.quantity));
    setEditGroupSize(String(loc.group_size || 1));
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editingLoc || !editName || !editPrice) { toast.error('Preencha os campos obrigatórios'); return; }
    const isGroup = editingLoc.location_type === 'camarote_grupo' || editingLoc.location_type === 'bistro';
    const newQty = isGroup ? 1 : parseInt(editQuantity) || editingLoc.quantity;
    const sold = editingLoc.quantity - editingLoc.available_quantity;
    const newAvailable = Math.max(0, newQty - sold);
    editMutation.mutate({
      id: editingLoc.id,
      data: {
        name: editName,
        description: editDescription,
        price: parseFloat(editPrice),
        quantity: newQty,
        available_quantity: newAvailable,
        group_size: isGroup ? (parseInt(editGroupSize) || 1) : 1,
      },
    });
  };

  const handleBatchEditOpen = (type: string, locs: any[]) => {
    const isGroup = type === 'camarote_grupo' || type === 'bistro';
    const label = LOCATION_TYPES.find(t => t.value === type)?.label || type;
    setBatchEditLocs(locs);
    setBatchEditLabel(label);
    setBatchEditPrice(String(locs[0]?.price ?? ''));
    setBatchEditDescription(locs[0]?.description ?? '');
    setBatchEditGroupSize(isGroup ? String(locs[0]?.group_size ?? 1) : '');
    setBatchEditOpen(true);
  };

  const handleBatchEditSave = async () => {
    if (!batchEditPrice) { toast.error('Preencha o preço'); return; }
    setBatchEditSaving(true);
    try {
      const isGroup = batchEditLocs[0]?.location_type === 'camarote_grupo' || batchEditLocs[0]?.location_type === 'bistro';
      for (const loc of batchEditLocs) {
        const data: any = {
          price: parseFloat(batchEditPrice),
          description: batchEditDescription,
        };
        if (isGroup && batchEditGroupSize) {
          data.group_size = parseInt(batchEditGroupSize) || loc.group_size;
        }
        await updateLocation(loc.id, data);
      }
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      setBatchEditOpen(false);
      toast.success(`${batchEditLocs.length} locais atualizados!`);
    } catch {
      toast.error('Erro ao atualizar em lote');
    } finally {
      setBatchEditSaving(false);
    }
  };

  const toggleSoldOutMutation = useMutation({
    mutationFn: ({ id, isSoldOut }: { id: string; isSoldOut: boolean }) => toggleLocationSoldOut(id, isSoldOut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      toast.success('Status de disponibilidade atualizado!');
    },
    onError: () => toast.error('Erro ao alterar disponibilidade'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const reorderMutation = useMutation({
    mutationFn: updateLocationSortOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
    },
    onError: () => toast.error('Erro ao reordenar'),
  });

  const handleDragEnd = (event: DragEndEvent, locs: typeof locations) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = locs.findIndex(l => l.id === active.id);
    const newIndex = locs.findIndex(l => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(locs, oldIndex, newIndex);
    const updates = reordered.map((loc, i) => ({ id: loc.id, sort_order: i }));
    queryClient.setQueryData(['locations', eventId], (old: typeof locations) => {
      if (!old) return old;
      const otherLocs = old.filter(l => !locs.some(gl => gl.id === l.id));
      return [...otherLocs, ...reordered.map((l, i) => ({ ...l, sort_order: i }))].sort((a, b) => ((a as any).sort_order || 0) - ((b as any).sort_order || 0));
    });
    reorderMutation.mutate(updates);
  };

  const handleTypeSelect = (type: ExtendedLocationType) => {
    setSelectedType(type);
    const label = LOCATION_TYPES.find(t => t.value === type)?.label || '';
    setName(label);
    // Reset group size for non-group types
    if (type !== 'camarote_grupo' && type !== 'bistro') {
      setGroupSize('1');
    }
  };

  const isGroupType = selectedType === 'camarote_grupo' || selectedType === 'bistro';
  const isBatchType = selectedType === 'camarote' || selectedType === 'camarote_grupo' || selectedType === 'bistro';

  const handleAdd = () => {
    const groupSizeNum = parseInt(groupSize) || 1;
    const effectiveQuantity = isGroupType ? 1 : parseInt(quantity);
    if (!name || !price || (!isGroupType && !quantity) || (isGroupType && !groupSize)) { toast.error('Preencha todos os campos obrigatórios'); return; }
    const finalName = useSectors && sectorName ? `${sectorName} - ${name}` : name;
    addMutation.mutate({
      event_id: eventId!,
      location_type: selectedType,
      name: finalName,
      description,
      price: parseFloat(price),
      quantity: effectiveQuantity,
      available_quantity: effectiveQuantity,
      color: getLocationColor(selectedType),
      group_size: isGroupType ? groupSizeNum : 1,
    } as any);
  };

  const handleBatchAdd = async () => {
    const qty = parseInt(batchQuantity);
    if (!qty || qty < 1 || !price) { toast.error('Preencha quantidade e preço'); return; }
    const label = LOCATION_TYPES.find(t => t.value === selectedType)?.label || selectedType;
    const prefix = useSectors && sectorName ? `${sectorName} - ${label}` : label;
    setBatchLoading(true);
    try {
      for (let i = 1; i <= qty; i++) {
        const num = String(i).padStart(2, '0');
        const groupSizeNum = isGroupType ? (parseInt(groupSize) || 1) : 1;
        await createLocation({
          event_id: eventId!,
          location_type: selectedType,
          name: `${prefix} - ${num}`,
          description,
          price: parseFloat(price),
          quantity: 1,
          available_quantity: 1,
          color: getLocationColor(selectedType),
          group_size: groupSizeNum,
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      setBatchQuantity(''); setPrice(''); setDescription('');
      toast.success(`${qty} ${label}(s) criados!`);
    } catch {
      toast.error('Erro ao criar em lote');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCopyLocations = async () => {
    if (!copyLocations.length) return;
    setCopyLoading(true);
    try {
      for (const loc of copyLocations) {
        await createLocation({
          event_id: eventId!,
          location_type: loc.location_type,
          name: loc.name,
          description: loc.description || '',
          price: loc.price,
          quantity: loc.quantity,
          available_quantity: loc.quantity,
          color: loc.color || getLocationColor(loc.location_type),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['locations', eventId] });
      setCopyDialogOpen(false);
      setCopyingEventId(null);
      toast.success(`${copyLocations.length} locais copiados!`);
    } catch {
      toast.error('Erro ao copiar locais');
    } finally {
      setCopyLoading(false);
    }
  };

  const BATCH_TYPES = ['camarote', 'camarote_grupo', 'bistro', 'sofa'];

  // Separate individual locations (non-batch types) from group locations (batch types)
  const individualLocations = locations.filter(loc => !BATCH_TYPES.includes(loc.location_type));
  const groupedLocations = locations
    .filter(loc => BATCH_TYPES.includes(loc.location_type))
    .reduce((acc, loc) => {
      const key = loc.location_type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(loc);
      return acc;
    }, {} as Record<string, typeof locations>);

  if (loadingEvent) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Evento não encontrado</div>;

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/event/${eventId}`)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white">Gerenciar Locais</h1>
          <p className="text-white/70 text-sm mt-1">{event.title}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-5">
        {/* Copy from previous event */}
        {previousEvents.length > 0 && (
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2">
                <Copy className="w-4 h-4 mr-2" /> Copiar locais de evento anterior
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Copiar Locais</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {previousEvents.map(ev => (
                  <button key={ev.id} onClick={() => setCopyingEventId(ev.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${copyingEventId === ev.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    <p className="font-semibold text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                  </button>
                ))}
              </div>
              {copyingEventId && copyLocations.length > 0 && (
                <Button onClick={handleCopyLocations} disabled={copyLoading} className="w-full gradient-primary border-0 rounded-xl">
                  {copyLoading ? 'Copiando...' : `Copiar ${copyLocations.length} locais`}
                </Button>
              )}
              {copyingEventId && copyLocations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum local neste evento</p>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Sectors toggle */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display font-semibold text-sm">Ativar setores neste evento (organizar locais por setor)</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ao ativar, você organiza os locais por setor (ex.: Setor A, Camarote, Bistrô). Se não quiser usar setores, deixe desativado.</p>
            </div>
            <Switch checked={useSectors} onCheckedChange={setUseSectors} />
          </div>
          {useSectors && (
            <Input
              value={sectorName}
              onChange={e => setSectorName(e.target.value)}
              placeholder="Nome do setor (ex: Setor A)"
              className="h-12 rounded-xl"
            />
          )}
        </div>

        {/* Add location form */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          {/* Type selection chips */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tipo de local</p>
            <div className="flex flex-wrap gap-2">
              {LOCATION_TYPES.map(t => {
                const isActive = selectedType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => handleTypeSelect(t.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all
                      ${isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-foreground border-border hover:border-primary/50'
                      }`}
                  >
                    {isActive && <Check className="w-4 h-4" />}
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome do local</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do local" className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição" className="rounded-xl resize-none" rows={2} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço (R$)</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Preço (R$)" className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Lote (opcional)</label>
              <Input value={lote} onChange={e => setLote(e.target.value)} placeholder="Lote (opcional)" className="h-12 rounded-xl" />
              <p className="text-xs text-muted-foreground mt-1">Use para identificar 1º lote, 2º lote, etc.</p>
            </div>

            {/* Group size for camarote_grupo and bistro */}
            {isGroupType && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantidade de ingressos do grupo (1 = ingresso individual)</label>
                <Input type="number" value={groupSize} onChange={e => setGroupSize(e.target.value)} placeholder="1" className="h-12 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Ex.: 5 significa que cada grupo gera vários ingressos individuais. Se o cliente comprar 1 grupo de 5, receberá 5 ingressos para transferir.</p>
              </div>
            )}

            {!isGroupType && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Quantidade de ingressos disponíveis para venda</label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantidade de ingressos disponíveis para venda" className="h-12 rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Total de ingressos individuais que poderão ser vendidos neste local.</p>
              </div>
            )}
          </div>

          {/* Batch generation toggle for camarote/bistro */}
          {isBatchType && (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-sm">Gerar locais em grande escala ({LOCATION_TYPES.find(t => t.value === selectedType)?.label})</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cria automaticamente vários locais numerados (ex.: {LOCATION_TYPES.find(t => t.value === selectedType)?.label} 01, 02, 03...). Cada unidade segue o mesmo preço e configuração deste local.</p>
                </div>
                <Switch checked={useBatch} onCheckedChange={setUseBatch} />
              </div>
              {useBatch && (
                <>
                  <Input type="number" value={batchQuantity} onChange={e => setBatchQuantity(e.target.value)} placeholder="Quantidade de unidades (ex: 10)" className="h-12 rounded-xl" />
                  <Button onClick={handleBatchAdd} disabled={batchLoading || !price} className="w-full h-12 gradient-primary border-0 rounded-xl font-display font-bold">
                    {batchLoading ? 'Criando...' : `Gerar ${batchQuantity || '0'} ${LOCATION_TYPES.find(t => t.value === selectedType)?.label || ''}`}
                  </Button>
                </>
              )}
            </div>
          )}

          {!(isBatchType && useBatch) && (
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full h-12 gradient-accent border-0 rounded-xl font-display font-bold">
              {addMutation.isPending ? 'Adicionando...' : 'Adicionar Local'}
            </Button>
          )}
        </div>

        {/* Locations list */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg">Locais Cadastrados ({locations.length})</h2>

          {/* Individual locations (non-batch types) as standalone cards */}
          {individualLocations.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, individualLocations)}>
              <SortableContext items={individualLocations.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {individualLocations.map(loc => (
                    <SortableLocationCard
                      key={loc.id}
                      loc={loc}
                      onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
                      onToggleSoldOut={(id, isSoldOut) => toggleSoldOutMutation.mutate({ id, isSoldOut })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onEdit={handleEditOpen}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Grouped locations (batch types) in collapsible lists */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const groupKeys = Object.keys(groupedLocations);
            const oldIndex = groupKeys.indexOf(active.id as string);
            const newIndex = groupKeys.indexOf(over.id as string);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedKeys = arrayMove(groupKeys, oldIndex, newIndex);
            const updates: { id: string; sort_order: number }[] = [];
            let order = individualLocations.length;
            for (const key of reorderedKeys) {
              for (const loc of groupedLocations[key]) {
                updates.push({ id: loc.id, sort_order: order++ });
              }
            }
            queryClient.setQueryData(['locations', eventId], (old: typeof locations) => {
              if (!old) return old;
              return [...old].sort((a, b) => {
                const aOrder = updates.find(u => u.id === a.id)?.sort_order ?? a.sort_order;
                const bOrder = updates.find(u => u.id === b.id)?.sort_order ?? b.sort_order;
                return aOrder - bOrder;
              });
            });
            reorderMutation.mutate(updates);
          }}>
            <SortableContext items={Object.keys(groupedLocations)} strategy={verticalListSortingStrategy}>
              {Object.entries(groupedLocations).map(([type, locs]) => {
                const label = LOCATION_TYPES.find(t => t.value === type)?.label || type;
                return (
                  <SortableGroupCard key={type} id={type}>
                    <Collapsible defaultOpen={locs.length <= 5}>
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="flex-1 bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLocationColor(type) }} />
                            <span className="font-display font-semibold text-sm">{label}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{locs.length}</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </CollapsibleTrigger>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleBatchEditOpen(type, locs)}
                          className="shrink-0 rounded-xl"
                          title="Editar todos do grupo"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                      <CollapsibleContent className="space-y-2 mt-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, locs)}>
                          <SortableContext items={locs.map(l => l.id)} strategy={verticalListSortingStrategy}>
                            {locs.map(loc => (
                              <SortableLocationCard
                                key={loc.id}
                                loc={loc}
                                onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
                                onToggleSoldOut={(id, isSoldOut) => toggleSoldOutMutation.mutate({ id, isSoldOut })}
                                onDelete={(id) => deleteMutation.mutate(id)}
                                onEdit={handleEditOpen}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </CollapsibleContent>
                    </Collapsible>
                  </SortableGroupCard>
                );
              })}
            </SortableContext>
          </DndContext>

          {locations.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum local cadastrado</p>}
        </div>
      </motion.div>

      {/* Edit Location Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Local</DialogTitle></DialogHeader>
          {editingLoc && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="rounded-xl resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preço (R$)</label>
                <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="h-12 rounded-xl" />
              </div>
              {(editingLoc.location_type === 'camarote_grupo' || editingLoc.location_type === 'bistro') ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ingressos por grupo</label>
                  <Input type="number" value={editGroupSize} onChange={e => setEditGroupSize(e.target.value)} className="h-12 rounded-xl" />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quantidade total</label>
                  <Input type="number" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} className="h-12 rounded-xl" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Vendidos: {editingLoc.quantity - editingLoc.available_quantity} | Disponíveis: {editingLoc.available_quantity}
                  </p>
                </div>
              )}
              <Button onClick={handleEditSave} disabled={editMutation.isPending} className="w-full h-12 gradient-primary border-0 rounded-xl font-display font-bold">
                {editMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Edit Group Dialog */}
      <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Grupo: {batchEditLabel} ({batchEditLocs.length} locais)</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">As alterações serão aplicadas a todos os {batchEditLocs.length} locais deste grupo.</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Preço (R$)</label>
              <Input type="number" value={batchEditPrice} onChange={e => setBatchEditPrice(e.target.value)} className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Textarea value={batchEditDescription} onChange={e => setBatchEditDescription(e.target.value)} className="rounded-xl resize-none" rows={2} />
            </div>
            {(batchEditLocs[0]?.location_type === 'camarote_grupo' || batchEditLocs[0]?.location_type === 'bistro') && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ingressos por grupo</label>
                <Input type="number" value={batchEditGroupSize} onChange={e => setBatchEditGroupSize(e.target.value)} className="h-12 rounded-xl" />
              </div>
            )}
            <Button onClick={handleBatchEditSave} disabled={batchEditSaving} className="w-full h-12 gradient-primary border-0 rounded-xl font-display font-bold">
              {batchEditSaving ? 'Salvando...' : `Atualizar ${batchEditLocs.length} locais`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
