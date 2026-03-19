import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu, Home, PlusCircle, TicketCheck, Archive,
  BarChart3, User, LogOut, Users, Trash2, DollarSign, Shield, FileEdit, Key
} from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const MENU_ITEMS = [
  { label: 'Início', icon: Home, path: '/' },
  { label: 'Minha Página', icon: User, path: '/my-page' },
  { label: 'Criar Evento', icon: PlusCircle, path: '/create-event' },
  { label: 'Rascunhos', icon: FileEdit, path: '/?filter=drafts' },
  { label: 'Ingressos Vendidos', icon: TicketCheck, path: '/sold-tickets' },
  { label: 'Arquivados', icon: Archive, path: '/archived' },
  { label: 'Lixeira', icon: Trash2, path: '/trash' },
  { label: 'Faturamento', icon: DollarSign, path: '/revenue' },
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Perfil', icon: User, path: '/profile' },
];

function SidebarContent_({ onNav }: { onNav: (path: string) => void }) {
  const location = useLocation();
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const initials = (profile?.name || 'U').charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSwitchToClient = () => {
    onNav('/?view=client');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Profile header */}
      <div className="gradient-primary px-4 pt-6 pb-4 flex flex-col items-center shrink-0">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.name} className="w-12 h-12 rounded-full object-cover mb-2 border-2 border-white/40" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white mb-2 border-2 border-white/40">
            {initials}
          </div>
        )}
        <p className="font-display font-bold text-white text-sm">{profile?.name || 'Usuário'}</p>
        <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
          Produtor
        </span>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full border-white/30 text-white hover:bg-white/20 bg-white/10 text-xs h-7"
          onClick={handleSwitchToClient}
        >
          <Users className="w-3.5 h-3.5 mr-1.5" /> Mudar para Cliente
        </Button>
      </div>

      {/* Menu */}
      <nav className="flex-1 flex flex-col py-2">
        {MENU_ITEMS.map((item) => {
          const currentPath = location.pathname + location.search;
          const isActive = item.path.includes('?') ? currentPath === item.path : (location.pathname === item.path && !location.search);
          return (
            <button
              key={item.label}
              onClick={() => onNav(item.path)}
              className={`flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors
                ${isActive
                  ? 'text-primary bg-sidebar-accent'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-primary'
                }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}

        {/* Admin links */}
        {isAdmin && (
          <>
            <button
              onClick={() => onNav('/admin')}
              className={`flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors border-t border-sidebar-border mt-1 pt-3
                ${location.pathname === '/admin'
                  ? 'text-amber-500'
                  : 'text-amber-500/80 hover:text-amber-500'
                }`}
            >
              <Shield className="w-4 h-4 shrink-0" /> Painel ADM
            </button>
            <button
              onClick={() => onNav('/admin-credentials')}
              className={`flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors
                ${location.pathname === '/admin-credentials'
                  ? 'text-amber-500'
                  : 'text-amber-500/80 hover:text-amber-500'
                }`}
            >
              <Key className="w-4 h-4 shrink-0" /> Credenciais
            </button>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
    </div>
  );
}

/** Fixed sidebar for desktop, Sheet drawer for mobile */
export default function ProducerSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  // Desktop: render nothing here (fixed sidebar is in ProducerLayout)
  if (!isMobile) return null;

  // Mobile: Sheet drawer
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar-background border-sidebar-border flex flex-col overflow-hidden">
        <SidebarContent_ onNav={handleNav} />
      </SheetContent>
    </Sheet>
  );
}

/** Fixed sidebar component for desktop layout */
export function FixedProducerSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex w-60 shrink-0 h-screen sticky top-0 bg-sidebar-background border-r border-sidebar-border flex-col">
      <SidebarContent_ onNav={(path) => navigate(path)} />
    </aside>
  );
}
