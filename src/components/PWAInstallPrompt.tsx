import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone || localStorage.getItem('pwa-install-dismissed')) return;

    if (isIOS) {
      const timer = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone, isIOS]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isStandalone || dismissed) return null;

  return (
    <AnimatePresence>
      {/* Android / Desktop install prompt */}
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground">Instalar Good Vibes</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acesse mais rápido direto da sua tela inicial
                </p>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={handleDismiss}>
                Agora não
              </Button>
              <Button size="sm" className="flex-1 gradient-primary border-0 text-xs font-display font-bold" onClick={handleInstall}>
                <Download className="w-3.5 h-3.5 mr-1" /> Instalar
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS install guide */}
      {showIOSGuide && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Share className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground">Instalar Good Vibes</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Toque em <Share className="w-3 h-3 inline mx-0.5" /> <strong>Compartilhar</strong> e depois em <strong>"Adicionar à Tela de Início"</strong>
                </p>
              </div>
              <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Button size="sm" variant="ghost" className="w-full mt-3 text-xs" onClick={handleDismiss}>
              Entendi
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
