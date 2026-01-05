import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Unique ID for the container
    const scannerId = "reader-stream"; 
    
    // Initialize logic
    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: window.innerWidth / window.innerHeight 
            };
            
            // Start scanning with environment (back) camera
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText) => {
                    // Success: Stop scanning and return data
                    html5QrCode.pause(true); 
                    onScan(decodedText);
                },
                (errorMessage) => {
                    // Ignore frame parse errors
                }
            );
        } catch (err) {
            console.error("Error starting camera", err);
            setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        }
    };

    // Small delay to ensure DOM is ready
    setTimeout(startScanner, 100);

    // Cleanup
    return () => {
        if (scannerRef.current) {
             if(scannerRef.current.isScanning) {
                 scannerRef.current.stop().then(() => {
                     scannerRef.current?.clear();
                 }).catch(console.error);
             } else {
                 scannerRef.current.clear();
             }
        }
    };
  }, []); // Run once on mount

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white touch-none">
       {/* Fullscreen Camera Container */}
       <div id="reader-stream" className="w-full h-full bg-black object-cover"></div>

       {/* Custom Overlay UI */}
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

       {/* Style for scanning animation */}
       <style>{`
         @keyframes scan {
           0% { top: 0%; opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { top: 100%; opacity: 0; }
         }
       `}</style>

       {/* Error State Modal */}
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