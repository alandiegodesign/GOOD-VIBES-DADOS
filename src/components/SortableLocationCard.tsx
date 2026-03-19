import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import { LocationChip } from '@/components/LocationChip';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LocationType } from '@/services/ticketLocationService';

interface SortableLocationCardProps {
  loc: any;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleSoldOut: (id: string, isSoldOut: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (loc: any) => void;
}

export function SortableLocationCard({ loc, onToggleActive, onToggleSoldOut, onDelete, onEdit }: SortableLocationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: loc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border border-border p-3 sm:p-4 ml-2 sm:ml-4 ${loc.is_active === false ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <LocationChip type={loc.location_type as LocationType} name={loc.name} price={loc.price} available={loc.available_quantity} />
          {loc.group_size > 1 && <p className="text-xs text-primary mt-0.5 ml-1 font-medium">{loc.group_size} ingressos individuais por grupo</p>}
          {loc.description && <p className="text-xs text-muted-foreground mt-0.5 ml-1 truncate">{loc.description}</p>}
          {loc.is_active === false && <p className="text-xs text-destructive mt-0.5 ml-1">Oculto para clientes</p>}
          {loc.is_sold_out === true && loc.is_active !== false && <p className="text-xs text-amber-500 mt-0.5 ml-1">Marcado como esgotado</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={loc.is_sold_out !== true}
            onCheckedChange={(checked) => onToggleSoldOut(loc.id, !checked)}
            title={loc.is_sold_out ? 'Marcar como disponível' : 'Marcar como esgotado'}
          />
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(loc)}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              title="Editar local"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleActive(loc.id, loc.is_active === false)}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            title={loc.is_active === false ? 'Mostrar para clientes' : 'Ocultar para clientes'}
          >
            {loc.is_active === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(loc.id)} className="text-destructive hover:text-destructive h-8 w-8">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
