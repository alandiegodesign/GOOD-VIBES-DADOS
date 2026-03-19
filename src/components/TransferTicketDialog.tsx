import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { findUserByEmailOrCpf, transferOrder } from '@/services/orderService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Search, User, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

export default function TransferTicketDialog({ open, onOpenChange, orderId }: TransferTicketDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [searching, setSearching] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [foundUser, setFoundUser] = useState<{ user_id: string; user_name: string; user_email: string } | null>(null);

  const handleSearch = async () => {
    if (!identifier.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const result = await findUserByEmailOrCpf(identifier.trim());
      if (!result) {
        toast.error('Usuário não encontrado.');
      } else if (result.user_id === user?.id) {
        toast.error('Você não pode transferir para você mesmo.');
      } else {
        setFoundUser(result);
      }
    } catch {
      toast.error('Erro ao buscar usuário.');
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || !foundUser) return;
    setTransferring(true);
    try {
      const success = await transferOrder(orderId, user.id, foundUser.user_id);
      if (success) {
        toast.success(`Ingresso transferido para ${foundUser.user_name}!`);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        onOpenChange(false);
      } else {
        toast.error('Não foi possível transferir. O ingresso pode já ter sido validado.');
      }
    } catch {
      toast.error('Erro ao transferir ingresso.');
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setIdentifier('');
      setFoundUser(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Enviar Ingresso
          </DialogTitle>
          <DialogDescription>
            Busque o destinatário pelo e-mail ou CPF cadastrado no aplicativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              placeholder="E-mail ou CPF do destinatário"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !identifier.trim()} size="icon" variant="outline">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {foundUser && (
            <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
              <div className="bg-primary/20 rounded-full p-2">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{foundUser.user_name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground truncate">{foundUser.user_email}</p>
              </div>
            </div>
          )}

          {foundUser && (
            <Button onClick={handleTransfer} disabled={transferring} className="w-full gradient-primary border-0 font-display font-bold">
              {transferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Confirmar Transferência
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
