import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, Search, CheckCircle, XCircle, Camera, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import QRScanner from '@/components/QRScanner';
import { validateOrder } from '@/services/orderService';

interface TicketResult {
  valid: boolean;
  event?: string;
  location?: string;
  buyer?: string;
  quantity?: number;
  orderId?: string;
  alreadyValidated?: boolean;
}

export default function ValidateTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketResult | null>(null);
  const [mode, setMode] = useState<'scanner' | 'manual'>('scanner');
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [scanKey, setScanKey] = useState(0);

  const validateCode = async (inputCode: string) => {
    if (!user) return;
    setLoading(true);
    setResult(null);
    setValidated(false);

    try {
      console.log('Validating code:', inputCode, 'producer:', user.id);
      const { data, error } = await supabase.rpc('lookup_ticket_by_code', {
        p_code: inputCode,
        p_producer_id: user.id,
      });

      console.log('Validation result:', data, error);

      if (error || !data || data.length === 0 || !data[0].order_id) {
        setResult({ valid: false });
      } else {
        const row = data[0] as any;
        setResult({
          valid: row.is_valid && !row.is_already_validated,
          event: row.event_title || '—',
          location: row.location_name || '—',
          buyer: row.buyer_name || '—',
          quantity: row.item_quantity || 0,
          orderId: row.order_id,
          alreadyValidated: row.is_already_validated,
        });
      }
    } catch (err) {
      console.error('Validation error:', err);
      setResult({ valid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleManualValidate = () => {
    if (!code.trim()) return;
    validateCode(code.trim().toUpperCase());
  };

  const handleQRScan = (decodedText: string) => {
    const raw = decodedText.trim();

    // Accept plain code (preferred), custom scheme, URL with query param, or inline token
    const plainMatch = raw.match(/^([A-Za-z0-9-]{6,64})$/i);
    const schemeMatch = raw.match(/ticketvibe:\/\/validate\/([A-Za-z0-9-]+)/i);
    const queryMatch = raw.match(/[?&](?:code|validation_code)=([A-Za-z0-9-]+)/i);
    const inlineCodeMatch = raw.match(/\b([A-Z0-9]{8})\b/i);

    const scannedCode = (plainMatch?.[1] || schemeMatch?.[1] || queryMatch?.[1] || inlineCodeMatch?.[1] || raw).trim().toUpperCase();

    setMode('manual');
    setCode(scannedCode);
    validateCode(scannedCode);
  };

  const handleConfirmValidation = async () => {
    if (!result?.orderId || !user) return;
    setValidating(true);
    try {
      await validateOrder(result.orderId, user.id);
      setValidated(true);
    } catch {
      // ignore
    } finally {
      setValidating(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setCode('');
    setValidated(false);
    setValidating(false);
    setScanKey(k => k + 1);
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <ScanLine className="w-6 h-6" /> Validar Ingressos
          </h1>
          <p className="text-white/70 text-sm mt-1">Escaneie o QR Code ou insira o código manualmente</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'scanner' ? 'default' : 'outline'}
            className={mode === 'scanner' ? 'gradient-primary text-white flex-1' : 'flex-1'}
            onClick={() => { setMode('scanner'); resetScan(); }}
          >
            <Camera className="w-4 h-4 mr-2" /> Câmera
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            className={mode === 'manual' ? 'gradient-primary text-white flex-1' : 'flex-1'}
            onClick={() => { setMode('manual'); resetScan(); }}
          >
            <Keyboard className="w-4 h-4 mr-2" /> Manual
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          {mode === 'scanner' && !result && (
            <QRScanner key={scanKey} onScan={handleQRScan} onError={() => setMode('manual')} />
          )}

          {mode === 'manual' && (
            <div className="flex gap-2">
              <Input
                placeholder="Código de validação"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleManualValidate} disabled={loading} className="gradient-primary text-white">
                <Search className="w-4 h-4 mr-1" /> Validar
              </Button>
            </div>
          )}

          {loading && (
            <p className="text-center text-muted-foreground text-sm">Validando...</p>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              {result.valid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
                    <div>
                      <p className="font-display font-bold text-green-400">Ingresso Válido ✓</p>
                      <p className="text-sm text-muted-foreground mt-1">Evento: {result.event}</p>
                      <p className="text-sm text-muted-foreground">Local: {result.location}</p>
                      <p className="text-sm text-muted-foreground">Comprador: {result.buyer}</p>
                      <p className="text-sm text-muted-foreground">Quantidade: {result.quantity}</p>
                    </div>
                  </div>
                  {!validated && (
                    <Button
                      onClick={handleConfirmValidation}
                      disabled={validating}
                      className="w-full gradient-primary text-white font-bold py-3"
                    >
                      {validating ? 'Validando...' : '✓ Confirmar Check-in'}
                    </Button>
                  )}
                  {validated && (
                    <div className="flex items-center gap-2 justify-center p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <p className="font-display font-bold text-green-400">Check-in confirmado!</p>
                    </div>
                  )}
                </div>
              ) : result.alreadyValidated ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <CheckCircle className="w-8 h-8 text-yellow-400 shrink-0" />
                  <div>
                    <p className="font-display font-bold text-yellow-400">Já Validado</p>
                    <p className="text-sm text-muted-foreground">Este ingresso já foi validado anteriormente</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                  <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                  <div>
                    <p className="font-display font-bold text-red-400">Ingresso Inválido ✗</p>
                    <p className="text-sm text-muted-foreground">Código não encontrado ou cancelado</p>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={resetScan}>
                Escanear outro ingresso
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
