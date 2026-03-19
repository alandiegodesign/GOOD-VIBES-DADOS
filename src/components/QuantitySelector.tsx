import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantitySelectorProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  color?: string;
}

export function QuantitySelector({ value, max, onChange, color = 'hsl(270, 76%, 59%)' }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full border-2"
        style={{ borderColor: color }}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <span className="text-lg font-bold font-display w-8 text-center">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full border-2"
        style={{ borderColor: color }}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
