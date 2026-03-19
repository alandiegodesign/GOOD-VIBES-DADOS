import { QRCodeSVG } from 'qrcode.react';

interface TicketQRCodeProps {
  code: string;
  size?: number;
}

export default function TicketQRCode({ code, size = 160 }: TicketQRCodeProps) {
  const qrValue = code;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG
          value={qrValue}
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
        />
      </div>
      <p className="text-sm font-mono font-bold tracking-widest text-center text-primary">
        {code}
      </p>
    </div>
  );
}
