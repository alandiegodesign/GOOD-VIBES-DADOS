import { supabase } from '@/integrations/supabase/client';

export interface ProducerOverview {
  producer_id: string;
  producer_name: string;
  producer_email: string;
  producer_phone: string;
  total_events: number;
  total_revenue: number;
  total_tickets_sold: number;
  total_orders: number;
}

export interface AdminSaleRow {
  order_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  buyer_name: string;
  order_status: string;
  total_amount: number;
  order_created_at: string;
  item_id: string;
  location_name: string;
  location_type: string;
  item_quantity: number;
  item_unit_price: number;
  item_subtotal: number;
}

export interface AdminEventRow {
  event_id: string;
  event_title: string;
  event_date: string;
  producer_id: string;
  producer_name: string;
  is_visible: boolean;
  total_revenue: number;
  total_tickets_sold: number;
  total_orders: number;
  created_at: string;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) return false;
  return !!data;
}

export async function getAdminProducers(): Promise<ProducerOverview[]> {
  const { data, error } = await supabase.rpc('admin_get_all_producers');
  if (error) throw error;
  return (data as unknown as ProducerOverview[]) || [];
}

export async function getAdminProducerSales(producerId: string): Promise<AdminSaleRow[]> {
  const { data, error } = await supabase.rpc('admin_get_producer_sales', { p_producer_id: producerId });
  if (error) throw error;
  return (data as unknown as AdminSaleRow[]) || [];
}

export async function getAdminEvents(): Promise<AdminEventRow[]> {
  const { data, error } = await supabase.rpc('admin_get_all_events');
  if (error) throw error;
  return (data as unknown as AdminEventRow[]) || [];
}

export interface AdminEventTicketSummary {
  event_id: string;
  event_title: string;
  event_date: string;
  producer_id: string;
  producer_name: string;
  is_visible: boolean;
  location_type: string;
  location_name: string;
  total_quantity: number;
  sold_quantity: number;
  revenue: number;
}

export async function getAdminEventsTicketSummary(): Promise<AdminEventTicketSummary[]> {
  const { data, error } = await supabase.rpc('admin_get_events_ticket_summary');
  if (error) throw error;
  return (data as unknown as AdminEventTicketSummary[]) || [];
}
