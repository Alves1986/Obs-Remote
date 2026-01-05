import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      onScan(decodedText);
      scanner.clear().catch(console.error);
    };

    const onScanFailure = (error: any) => {
      // Ignore routine scan failures (frame didn't contain QR)
      // console.warn(error);
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden w-full max-w-md relative shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900">
          <h3 className="text-gray-200 font-bold uppercase tracking-wider text-sm">Escanear Conexão</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-black">
           <div id="reader" className="overflow-hidden rounded-lg border border-gray-800"></div>
        </div>

        <div className="p-4 bg-gray-900 text-center">
          <p className="text-xs text-gray-400 mb-2">Aponte a câmera para um QR Code contendo as credenciais.</p>
          <p className="text-[10px] text-gray-500 font-mono bg-gray-950 p-2 rounded border border-gray-800 break-all">
             Formato JSON: {"{"}"host":"IP","port":"4455","password":"..."{"}"}
          </p>
        </div>
      </div>
    </div>
  );
};