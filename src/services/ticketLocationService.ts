import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type TicketLocation = Tables<'ticket_locations'>;
export type TicketLocationInsert = TablesInsert<'ticket_locations'>;
export type TicketLocationUpdate = TablesUpdate<'ticket_locations'>;

export type LocationType = 'pista' | 'vip' | 'camarote' | 'camarote_grupo' | 'bistro' | 'sofa';

const LOCATION_COLORS: Record<string, string> = {
  pista: '#9D4EDD',
  vip: '#F72585',
  camarote: '#FF6D00',
  camarote_grupo: '#7209B7',
  bistro: '#00B4D8',
  sofa: '#E85D04',
};

export function getLocationColor(type: string): string {
  return LOCATION_COLORS[type] || '#9D4EDD';
}

export async function getLocationsByEvent(eventId: string): Promise<TicketLocation[]> {
  const { data, error } = await supabase
    .from('ticket_locations')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateLocationSortOrders(updates: { id: string; sort_order: number }[]): Promise<void> {
  for (const u of updates) {
    const { error } = await supabase
      .from('ticket_locations')
      .update({ sort_order: u.sort_order } as any)
      .eq('id', u.id);
    if (error) throw error;
  }
}

export async function getLocation(id: string): Promise<TicketLocation | null> {
  const { data, error } = await supabase
    .from('ticket_locations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLocation(data: TicketLocationInsert): Promise<TicketLocation> {
  const { data: loc, error } = await supabase
    .from('ticket_locations')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return loc;
}

export async function updateLocation(id: string, data: TicketLocationUpdate): Promise<void> {
  const { error } = await supabase
    .from('ticket_locations')
    .update(data)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('ticket_locations').delete().eq('id', id);
  if (error) throw error;
}

export async function decreaseAvailability(id: string, qty: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('decrease_availability', {
    loc_id: id,
    qty,
  });
  if (error) throw error;
  return data as boolean;
}

export async function toggleLocationActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('ticket_locations').update({ is_active: isActive } as any).eq('id', id);
  if (error) throw error;
}

export async function toggleLocationSoldOut(id: string, isSoldOut: boolean): Promise<void> {
  const { error } = await supabase.from('ticket_locations').update({ is_sold_out: isSoldOut } as any).eq('id', id);
  if (error) throw error;
}
