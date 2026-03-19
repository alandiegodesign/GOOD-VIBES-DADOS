import { LocationType, getLocationColor } from '@/services/ticketLocationService';
import { Music, Star, Crown, UtensilsCrossed, Users } from 'lucide-react';

interface LocationChipProps {
  type: LocationType;
  name: string;
  price: number;
  available: number;
  className?: string;
}

const ICONS: Record<LocationType, React.ElementType> = {
  pista: Music,
  vip: Star,
  camarote: Crown,
  camarote_grupo: Users,
  bistro: UtensilsCrossed,
  sofa: Crown,
};

export function LocationChip({ type, name, price, available, className = '' }: LocationChipProps) {
  const color = getLocationColor(type);
  const Icon = ICONS[type];

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${className}`}
      style={{ borderColor: color, color: color, backgroundColor: `${color}15` }}
    >
      <Icon className="w-4 h-4" />
      <span>{name}</span>
      <span className="font-bold">R$ {Number(price).toFixed(2)}</span>
      <span className="text-xs opacity-70">({available} disp.)</span>
    </div>
  );
}
