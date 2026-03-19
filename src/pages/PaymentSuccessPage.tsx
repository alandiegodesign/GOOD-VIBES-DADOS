import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('Sessão de pagamento não encontrada.');
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(data?.error || 'Pagamento não confirmado. Tente novamente.');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Erro ao verificar pagamento.');
      }
    };

    verify();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h1 className="font-display font-bold text-2xl">Confirmando pagamento...</h1>
            <p className="text-muted-foreground">Aguarde enquanto verificamos seu pagamento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="font-display font-bold text-2xl">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              Seus ingressos já estão disponíveis na sua conta. Uma fatura foi gerada no seu e-mail.
            </p>
            <div className="space-y-3 pt-4">
              <Button onClick={() => navigate('/my-orders')}
                className="w-full h-12 gradient-primary border-0 rounded-xl font-display font-bold glow-primary">
                Ver Meus Ingressos
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full h-12 rounded-xl">
                Voltar ao Início
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <h1 className="font-display font-bold text-2xl">Erro no Pagamento</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <div className="space-y-3 pt-4">
              <Button onClick={() => navigate('/')} variant="outline" className="w-full h-12 rounded-xl">
                Voltar ao Início
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
