import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface SortableGroupCardProps {
  id: string;
  children: ReactNode;
}

export function SortableGroupCard({ id, children }: SortableGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none z-10"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  );
}
