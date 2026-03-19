import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Ticket, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      toast.error('Link inválido');
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); } else {
      toast.success('Senha atualizada!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--gradient-bg)' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col items-center">
        <div className="w-16 h-16 bg-foreground rounded-xl flex items-center justify-center mb-4">
          <Ticket className="w-8 h-8 text-background" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-4">Nova Senha</h1>
        <form onSubmit={handleSubmit} className="w-full bg-card rounded-2xl border border-border p-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="Nova senha" value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-12 pr-12 h-14 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Button type="submit" disabled={loading}
            className="w-full h-14 text-lg font-display font-bold rounded-xl bg-[hsl(145,63%,42%)] hover:bg-[hsl(145,63%,36%)] text-white border-0">
            {loading ? 'Salvando...' : 'Redefinir Senha'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
