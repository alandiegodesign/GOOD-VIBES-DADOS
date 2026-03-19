import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getDeletedEventsByCreator, restoreEvent, permanentlyDeleteEvent } from '@/services/eventService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function TrashPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deletedEvents = [], isLoading } = useQuery({
    queryKey: ['deleted-events', user?.id],
    queryFn: () => getDeletedEventsByCreator(user!.id),
    enabled: !!user,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-events'] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      toast({ title: 'Evento restaurado!' });
    },
    onError: () => toast({ title: 'Erro ao restaurar', variant: 'destructive' }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => permanentlyDeleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-events'] });
      toast({ title: 'Evento excluído permanentemente!' });
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="gradient-primary px-6 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/80 mb-4">
            <ArrowLeft className="w-5 h-5" /> Voltar
          </button>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6" /> Lixeira
          </h1>
          <p className="text-white/70 text-sm mt-1">Eventos excluídos são removidos permanentemente após 7 dias</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-6 -mt-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Carregando...</div>
        ) : deletedEvents.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-display">Lixeira vazia</p>
          </div>
        ) : (
          deletedEvents.map(event => {
            const daysLeft = getDaysRemaining((event as any).deleted_at);
            return (
              <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg">{event.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    {daysLeft > 0 ? `${daysLeft} dia${daysLeft > 1 ? 's' : ''} restante${daysLeft > 1 ? 's' : ''}` : 'Será excluído em breve'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => restoreMutation.mutate(event.id)}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Restaurar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="flex-1">
                        <Trash2 className="w-4 h-4 mr-1" /> Excluir definitivamente
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. O evento e todos os dados serão removidos para sempre.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => permanentDeleteMutation.mutate(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
