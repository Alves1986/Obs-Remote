import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  // We use a ref to track the instance for cleanup
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let isMounted = true;
    const scannerId = "reader-stream";

    const initScanner = async () => {
      try {
        // 1. Create instance
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerInstanceRef.current = html5QrCode;

        // 2. Start Scanning
        // note: We do NOT set aspectRatio in config. 
        // We let CSS handle the video size to avoid black screens on mobile.
        await html5QrCode.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
          },
          (decodedText) => {
             // Success callback
             if (isMounted) {
                 // Stop first, then callback
                 html5QrCode.stop().then(() => {
                     html5QrCode.clear();
                     onScan(decodedText);
                 }).catch(err => {
                     console.warn("Stop failed", err);
                     onScan(decodedText);
                 });
             }
          },
          (errorMessage) => {
             // Parse error, ignore
          }
        );

      } catch (err) {
        console.error("Camera start error:", err);
        if (isMounted) {
           setError("Erro ao acessar câmera. Verifique permissões.");
        }
      }
    };

    // Small delay to ensure the DOM element #reader-stream is painted and sized
    const timer = setTimeout(initScanner, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      const instance = scannerInstanceRef.current;
      if (instance) {
         // Attempt graceful stop
         try {
             instance.stop().then(() => instance.clear()).catch(() => instance.clear());
         } catch (e) {
             // ignore errors during cleanup
         }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white touch-none">
       {/* 
         Video Container 
         We use inline styles in the style tag below to forcibly override 
         html5-qrcode's inline styles on the generated video element.
       */}
       <div id="reader-stream" className="w-full h-full bg-black"></div>

       {/* Force Video Object Fit */}
       <style>{`
         #reader-stream {
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
         }
         #reader-stream video {
           object-fit: cover !important;
           width: 100% !important;
           height: 100% !important;
           position: absolute !important;
           top: 0 !important;
           left: 0 !important;
           z-index: 0;
         }
         @keyframes scan {
           0% { top: 0%; opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { top: 100%; opacity: 0; }
         }
       `}</style>

       {/* Overlay UI */}
       <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start pointer-events-auto">
             <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                <Camera className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-gray-200">Scanner Ativo</span>
             </div>
             <button 
                onClick={onClose}
                className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-red-500/20 transition-colors active:scale-95"
             >
                <X className="w-5 h-5" />
             </button>
          </div>

          {/* Center Viewfinder */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-white/10 rounded-xl overflow-hidden">
              {/* Corner Markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-brand-500 rounded-tl-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-brand-500 rounded-tr-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-brand-500 rounded-bl-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-brand-500 rounded-br-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              
              {/* Scanning Laser Effect */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_15px_#ef4444] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>

          {/* Bottom Hint */}
          <div className="text-center pb-12 pointer-events-auto">
              <div className="inline-flex flex-col items-center gap-2">
                <p className="text-sm font-medium bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg text-gray-200 border border-white/5 shadow-xl">
                    Aponte para o QR Code de conexão
                </p>
                <button onClick={onClose} className="text-xs text-gray-500 underline decoration-gray-700 underline-offset-4">
                    Cancelar
                </button>
              </div>
          </div>
       </div>

       {/* Error State */}
       {error && (
           <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="text-center max-w-xs bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Erro na Câmera</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">{error}</p>
                    <button 
                        onClick={onClose}
                        className="bg-brand-600 hover:bg-brand-500 active:scale-95 transition-all text-white px-6 py-3 rounded-xl font-bold w-full text-sm"
                    >
                        Fechar Scanner
                    </button>
                </div>
           </div>
       )}
    </div>
  );
};