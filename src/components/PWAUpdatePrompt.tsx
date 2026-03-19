import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 30 minutes
      if (r) {
        setInterval(() => r.update(), 30 * 60 * 1000);
      }
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-foreground">Nova versão disponível</p>
              <p className="text-xs text-muted-foreground">Atualize para ter a melhor experiência</p>
            </div>
            <Button
              size="sm"
              className="gradient-accent border-0 text-xs font-display font-bold shrink-0"
              onClick={() => updateServiceWorker(true)}
            >
              Atualizar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
