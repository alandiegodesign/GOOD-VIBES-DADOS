import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Ticket, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); } else { setSent(true); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--gradient-bg)' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col items-center">
        <div className="w-16 h-16 bg-foreground rounded-xl flex items-center justify-center mb-4">
          <Ticket className="w-8 h-8 text-background" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-2">Recuperar Senha</h1>

        {sent ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-foreground mb-2">Email enviado!</p>
            <p className="text-muted-foreground text-sm">Verifique sua caixa de entrada para redefinir sua senha.</p>
            <Link to="/login" className="mt-4 inline-block text-[hsl(145,63%,42%)] font-semibold">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input type="email" placeholder="Seu email" value={email} onChange={e => setEmail(e.target.value)}
                className="pl-12 h-14 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button type="submit" disabled={loading}
              className="w-full h-14 text-lg font-display font-bold rounded-xl bg-[hsl(145,63%,42%)] hover:bg-[hsl(145,63%,36%)] text-white border-0">
              {loading ? 'Enviando...' : 'Enviar Link'}
            </Button>
            <Link to="/login" className="flex items-center gap-2 text-muted-foreground text-sm justify-center hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
