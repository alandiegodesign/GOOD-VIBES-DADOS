import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Event = Tables<'events'>;
export type EventInsert = TablesInsert<'events'>;
export type EventUpdate = TablesUpdate<'events'>;

export async function getEvents(): Promise<Event[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
    .eq('is_visible', true)
    .gte('date', today)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getEventsByCreator(userId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', userId)
    .is('deleted_at', null)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getDeletedEventsByCreator(userId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', userId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createEvent(data: EventInsert): Promise<Event> {
  const { data: event, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return event;
}

export async function updateEvent(id: string, data: EventUpdate): Promise<Event> {
  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return event;
}

export async function softDeleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
  if (error) throw error;
}

export async function restoreEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').update({ deleted_at: null } as any).eq('id', id);
  if (error) throw error;
}

export async function permanentlyDeleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleEventVisibility(id: string, isVisible: boolean): Promise<void> {
  const { error } = await supabase.from('events').update({ is_visible: isVisible } as any).eq('id', id);
  if (error) throw error;
}
