import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

let scannerCounter = 0;

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const hasScanned = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const mountedRef = useRef(true);
  const [containerId] = useState(() => `qr-scanner-${++scannerCounter}`);

  onScanRef.current = onScan;
  onErrorRef.current = onError;

  const stopScanner = useCallback(async (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      // State 2 = SCANNING, 3 = PAUSED
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // ignore stop errors
    }
    try {
      scanner.clear();
    } catch {
      // ignore clear errors
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    hasScanned.current = false;
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      // Wait for DOM element to be ready
      await new Promise(r => setTimeout(r, 300));

      if (!mountedRef.current) return;

      const container = document.getElementById(containerId);
      if (!container) {
        console.error('QR Scanner: container not found', containerId);
        return;
      }

      try {
        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        let cameraConfig: any;
        try {
          const cameras = await Html5Qrcode.getCameras();
          console.log('QR Scanner: cameras found:', cameras.length, cameras.map(c => c.label));
          const backCamera = cameras.find((c) => /back|rear|environment/i.test(c.label));
          cameraConfig = backCamera
            ? { deviceId: { exact: backCamera.id } }
            : { facingMode: 'environment' };
        } catch (camErr) {
          console.warn('QR Scanner: getCameras failed, using fallback:', camErr);
          cameraConfig = { facingMode: 'environment' };
        }

        if (!mountedRef.current) {
          await stopScanner(html5QrCode);
          return;
        }

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.max(180, Math.floor(minEdge * 0.7));
              return { width: edge, height: edge };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (hasScanned.current) return;
            hasScanned.current = true;
            onScanRef.current(decodedText);
          },
          () => {
            // ignore per-frame decode failures
          }
        );

        if (mountedRef.current) {
          setStarted(true);
        } else {
          await stopScanner(html5QrCode);
        }
      } catch (err: any) {
        console.error('QR Scanner error:', err);
        const msg = err?.toString?.() || 'Erro ao iniciar câmera';
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          if (mountedRef.current) setPermissionDenied(true);
        }
        onErrorRef.current?.(msg);
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      stopScanner(scanner);
    };
  }, [containerId, stopScanner]);

  return (
    <div className="space-y-3">
      <div
        id={containerId}
        className="w-full rounded-xl overflow-hidden bg-muted min-h-[280px]"
      />
      {permissionDenied && (
        <p className="text-sm text-destructive text-center">
          Permissão da câmera negada. Habilite a câmera nas configurações do navegador.
        </p>
      )}
      {!started && !permissionDenied && (
        <p className="text-sm text-muted-foreground text-center">Iniciando câmera...</p>
      )}
    </div>
  );
}
