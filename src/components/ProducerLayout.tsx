import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FixedProducerSidebar } from '@/components/ProducerSidebar';
import { LogOut } from 'lucide-react';

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Top exit bar */}
      <div className="w-full bg-muted/60 border-b border-border px-4 py-1.5 flex items-center justify-end shrink-0 z-50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </div>
      <div className="flex flex-1 min-h-0">
        <FixedProducerSidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
