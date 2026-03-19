import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createEvent } from '@/services/eventService';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, ImagePlus, X, Clock, CalendarIcon, MapPin,
  Music, Shield, Sparkles, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ZoomableImage } from '@/components/ZoomableImage';

const MUSIC_TAGS = ['DJ', 'MC', 'Eletrônica', 'Sertanejo', 'Rock', 'POP', 'Techno', 'Funk', 'Kpop', 'RAP', 'Pagode'];
const ENVIRONMENT_TAGS = ['Espaços Cobertos', 'Espaços Climatizados', 'Ar Livre'];
const MAX_CUSTOM_TAGS = 5;

const POLICY_OPTIONS = [
  { id: 'age_restriction', label: 'Faixa Etária', placeholder: 'Ex: Apenas maiores de 18 anos' },
  { id: 'documents', label: 'Documentos Exigidos na Entrada', placeholder: 'Ex: Identidade' },
  { id: 'coat_check', label: 'Presença de Guarda-Volume', placeholder: 'Ex: Consultar disponibilidade e preços' },
  { id: 'entry_restriction', label: 'Restrição na entrada', placeholder: 'Ex: Proibida entrada com itens de qualquer tipo' },
];

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bannerRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [salesEndTime, setSalesEndTime] = useState('');
  const [banner, setBanner] = useState('');
  const [mapImage, setMapImage] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPolicies, setShowPolicies] = useState(false);
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (customTags.length >= MAX_CUSTOM_TAGS) { toast.error(`Máximo de ${MAX_CUSTOM_TAGS} tags personalizadas`); return; }
    if ([...MUSIC_TAGS, ...ENVIRONMENT_TAGS, ...customTags].includes(tag)) { toast.error('Tag já existe'); return; }
    setCustomTags(prev => [...prev, tag]);
    setSelectedTags(prev => [...prev, tag]);
    setCustomTagInput('');
  };

  const removeCustomTag = (tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const updatePolicy = (id: string, value: string) => {
    setPolicies(prev => ({ ...prev, [id]: value }));
  };

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setBanner(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMapFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMapImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      toast.success(event.is_visible ? 'Evento publicado com sucesso!' : 'Rascunho salvo com sucesso!');
      navigate(`/manage-locations/${event.id}`);
    },
    onError: () => toast.error('Erro ao criar evento'),
  });

  const handleSubmit = (publish: boolean) => {
    if (!title || !date || !time) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    mutation.mutate({
      title,
      description,
      date,
      time,
      banner_image: banner,
      map_image: mapImage,
      location_name: locationName,
      location_address: locationAddress,
      sales_end_time: salesEndTime || null,
      created_by: user!.id,
      is_visible: publish,
    } as any);
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/80">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-xl text-white">Informações do evento</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={mutation.isPending}
              variant="outline"
              className="rounded-full font-display font-bold px-5 border-white/30 text-white hover:bg-white/10"
            >
              Salvar rascunho
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={mutation.isPending}
              className="gradient-accent border-0 rounded-full font-display font-bold px-6"
            >
              {mutation.isPending ? 'Criando...' : 'Publicar agora'}
            </Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Identity Section */}
            <section className="bg-card rounded-2xl border border-border p-6 space-y-5">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Identidade
              </h2>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Título do evento</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Digite aqui..." className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Descrição</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Digite aqui..." className="rounded-xl min-h-[100px] resize-none" />
              </div>
            </section>

            {/* Cover Image */}
            <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" /> Capa (16:9 recomendado)
              </h2>
              {banner ? (
                <div className="relative rounded-xl overflow-hidden border border-border aspect-video">
                  <img src={banner} alt="Banner" className="w-full h-full object-cover" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full" onClick={() => setBanner('')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => bannerRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <ImagePlus className="w-10 h-10" />
                  <span className="text-sm">1920x1080 (máx 5MB)</span>
                </button>
              )}
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
            </section>

            {/* Date & Time */}
            <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" /> Data & hora
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Início</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Fim</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Fechamento das vendas (opcional)</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input type="time" value={salesEndTime} onChange={e => setSalesEndTime(e.target.value)} placeholder="Horário limite" className="h-10 rounded-xl" />
                </div>
                <p className="text-xs text-muted-foreground">Horário em que as vendas serão encerradas no dia do evento. Se vazio, as vendas permanecem abertas até 00:00.</p>
              </div>
            </section>

            {/* Location */}
            <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Local
              </h2>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nome do local</label>
                  <Input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Ex: Casa de Show Infinity" className="h-10 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Endereço</label>
                  <Input value={locationAddress} onChange={e => setLocationAddress(e.target.value)} placeholder="Ex: Umuarama / PR" className="h-10 rounded-xl" />
                </div>
                {locationAddress && (
                  <div className="rounded-xl overflow-hidden border border-border mt-2">
                    <iframe
                      title="Mapa do local"
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(locationAddress)}&output=embed`}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Tags & Policies side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tags */}
              <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <h2 className="font-display font-bold text-sm flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" /> Tags do Evento
                </h2>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Música</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSIC_TAGS.map(tag => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium pt-2">Ambiente</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ENVIRONMENT_TAGS.map(tag => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                        }`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                  {/* Custom Tags */}
                  <p className="text-xs text-muted-foreground font-medium pt-2">Personalizada</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customTags.map(tag => (
                      <button key={tag} onClick={() => removeCustomTag(tag)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all bg-primary text-primary-foreground border-primary flex items-center gap-1">
                        {tag}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={customTagInput}
                      onChange={e => setCustomTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                      placeholder="Adicionar tag..."
                      className="h-8 rounded-lg text-xs flex-1"
                    />
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg px-2" onClick={addCustomTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </section>

              {/* Policies */}
              <section className="bg-card rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Políticas do Evento
                  </h2>
                  <Switch checked={showPolicies} onCheckedChange={setShowPolicies} />
                </div>
                <p className="text-xs text-muted-foreground">Ative apenas se o evento exige alguma política específica.</p>
                {showPolicies && (
                  <div className="space-y-3">
                    {POLICY_OPTIONS.map(p => (
                      <div key={p.id} className="space-y-1">
                        <label className="text-xs font-medium text-primary">{p.label}</label>
                        <Input
                          value={policies[p.id] || ''}
                          onChange={e => updatePolicy(p.id, e.target.value)}
                          placeholder={p.placeholder}
                          className="h-9 rounded-lg text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Map Image */}
            <section className="bg-card rounded-2xl border border-border p-6 space-y-3">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Mapa do Evento
              </h2>
              {mapImage ? (
                <div className="relative">
                  <ZoomableImage src={mapImage} alt="Mapa" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full z-10" onClick={() => setMapImage('')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => mapRef.current?.click()}
                  className="w-full aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <ImagePlus className="w-10 h-10" />
                  <span className="text-sm">1080x1080</span>
                </button>
              )}
              <input ref={mapRef} type="file" accept="image/*" className="hidden" onChange={handleMapFile} />
            </section>

            {/* Mobile submit */}
            <div className="flex flex-col gap-3 lg:hidden">
              <Button
                onClick={() => handleSubmit(false)}
                disabled={mutation.isPending}
                variant="outline"
                className="w-full h-12 font-display font-bold rounded-xl"
              >
                Salvar como rascunho
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={mutation.isPending}
                className="w-full h-14 text-lg font-display font-bold gradient-primary border-0 rounded-xl glow-primary"
              >
                {mutation.isPending ? 'Criando...' : 'Publicar agora'}
              </Button>
            </div>
          </div>

          {/* Right Column - Preview + Tips */}
          <div className="space-y-6 hidden lg:block">
            {/* Live Preview */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3 sticky top-6">
              <h3 className="font-display font-bold text-sm">Prévia</h3>
              <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted flex items-center justify-center">
                {banner ? (
                  <img src={banner} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-xs text-muted-foreground">Sua capa aparecerá aqui</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-display font-bold text-sm text-primary truncate">
                  {title || 'Título do evento'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationName || 'Cidade/UF'}
                </p>
                {date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')} · {time || '--:--'}
                  </p>
                )}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedTags.slice(0, 4).map(t => (
                      <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-display font-bold text-sm">Boas práticas</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                <li>Imagem 16:9, sem textos pequenos.</li>
                <li>Título claro com artista/local/data.</li>
                <li>Descrição até 1.000 caracteres (objetiva).</li>
                <li>Escolha tags suficientes para aparecer nas buscas.</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
