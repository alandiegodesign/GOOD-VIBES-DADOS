import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { User, Briefcase, Eye, EyeOff, Lock, Mail, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
const goodVibesLogo = '/good-vibes-logo.png';

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function cleanCpf(value: string) {
  return value.replace(/\D/g, '');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'cliente' | 'produtor'>('cliente');
  const [loginMethod, setLoginMethod] = useState<'email' | 'cpf'>('email');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error('Erro ao entrar com Google');
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);

    let email = credential;

    if (loginMethod === 'cpf') {
      const cpfClean = cleanCpf(credential);
      if (cpfClean.length !== 11) {
        toast.error('CPF inválido');
        setLoading(false);
        return;
      }
      const { data, error: fnError } = await supabase.rpc('get_email_by_cpf', { p_cpf: cpfClean });
      if (fnError || !data) {
        toast.error('CPF não encontrado');
        setLoading(false);
        return;
      }
      email = data as string;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Email/CPF ou senha incorretos' : error.message);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 py-4 overflow-hidden" style={{ background: 'var(--gradient-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center"
      >
        {/* Logo & Welcome */}
        <div className="mb-4 flex flex-col items-center">
          <img src={goodVibesLogo} alt="Good Vibes" className="h-16 w-auto mb-1" width={94} height={64} fetchPriority="high" />
          <h1 className="font-display font-bold text-lg text-foreground mb-0.5">
            {userType === 'produtor' ? 'Área do Produtor' : 'Área do Cliente'}
          </h1>
          <p className="text-muted-foreground text-xs">Bem-vindo de volta!</p>
        </div>

        {/* User type toggle */}
        <div className="w-full bg-card rounded-2xl border border-border p-1.5 flex mb-4">
          <button type="button" onClick={() => setUserType('cliente')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all font-display font-semibold text-sm ${
              userType === 'cliente' ? 'gradient-primary text-white shadow-lg glow-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <User className="w-5 h-5" />
            Cliente
          </button>
          <button type="button" onClick={() => setUserType('produtor')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl transition-all font-display font-semibold text-sm ${
              userType === 'produtor' ? 'gradient-primary text-white shadow-lg glow-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <Briefcase className="w-5 h-5" />
            Sou Produtor
          </button>
        </div>

        <form onSubmit={handleLogin} className="w-full bg-card rounded-2xl border border-border p-5 space-y-3">
          {/* Login method toggle */}
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => { setLoginMethod('email'); setCredential(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginMethod === 'email' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Mail className="w-4 h-4 inline mr-1" /> Email
            </button>
            <button type="button" onClick={() => { setLoginMethod('cpf'); setCredential(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                loginMethod === 'cpf' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <CreditCard className="w-4 h-4 inline mr-1" /> CPF
            </button>
          </div>

          <div className="relative">
            {loginMethod === 'email' ? (
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            ) : (
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            )}
            <Input
              type={loginMethod === 'email' ? 'email' : 'text'}
              placeholder={loginMethod === 'email' ? 'Email' : 'CPF (000.000.000-00)'}
              value={credential}
              onChange={e => setCredential(loginMethod === 'cpf' ? formatCpf(e.target.value) : e.target.value)}
              className="pl-12 h-12 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pl-12 pr-12 h-12 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-secondary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-12 text-base font-display font-bold rounded-xl gradient-primary border-0 glow-primary text-white">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button type="button" variant="outline" disabled={googleLoading} onClick={handleGoogleLogin}
            className="w-full h-12 text-base font-semibold rounded-xl border-border gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {googleLoading ? 'Conectando...' : 'Entrar com Google'}
          </Button>
        </form>

        <p className="mt-4 text-muted-foreground text-sm">
          Não tem uma conta?{' '}
          <Link to="/signup" className="text-gradient font-semibold underline hover:no-underline">
            Cadastre-se
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
