import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { decreaseAvailability } from './ticketLocationService';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;

export interface CartItem {
  ticket_location_id: string;
  quantity: number;
  unit_price: number;
}

export interface ProducerSaleRow {
  order_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  buyer_id: string;
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

export async function getProducerSales(userId: string): Promise<ProducerSaleRow[]> {
  const { data, error } = await supabase.rpc('get_producer_sales', { p_user_id: userId });
  if (error) throw error;
  return (data as unknown as ProducerSaleRow[]) || [];
}

export interface ProducerTicketRow {
  order_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_cpf: string;
  order_status: string;
  validated_at: string | null;
  total_amount: number;
  order_created_at: string;
  order_updated_at: string;
  item_id: string;
  location_name: string;
  location_type: string;
  item_quantity: number;
  item_unit_price: number;
  item_subtotal: number;
}

export async function getProducerTickets(userId: string): Promise<ProducerTicketRow[]> {
  const { data, error } = await supabase.rpc('get_producer_tickets', { p_user_id: userId });
  if (error) throw error;
  return (data as unknown as ProducerTicketRow[]) || [];
}

export async function validateOrder(orderId: string, producerId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_order', { p_order_id: orderId, p_producer_id: producerId });
  if (error) throw error;
  return !!data;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (error) throw error;
  return data || [];
}

export async function findUserByEmailOrCpf(identifier: string): Promise<{ user_id: string; user_name: string; user_email: string } | null> {
  const { data, error } = await supabase.rpc('find_user_by_email_or_cpf', { p_identifier: identifier });
  if (error) throw error;
  const rows = data as unknown as { user_id: string; user_name: string; user_email: string }[];
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function transferOrder(orderId: string, fromUserId: string, toUserId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('transfer_order', { p_order_id: orderId, p_from_user_id: fromUserId, p_to_user_id: toUserId });
  if (error) throw error;
  return !!data;
}

export async function createOrder(
  eventId: string,
  userId: string,
  items: CartItem[]
): Promise<Order | null> {
  // Decrease availability for each item
  for (const item of items) {
    const success = await decreaseAvailability(item.ticket_location_id, item.quantity);
    if (!success) return null;
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      event_id: eventId,
      user_id: userId,
      total_amount: totalAmount,
      status: 'confirmed',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Fetch ticket_locations to check for group types
  const locationIds = items.map(i => i.ticket_location_id);
  const { data: locations } = await supabase
    .from('ticket_locations')
    .select('id, location_type, group_size')
    .in('id', locationIds);

  const locationMap = new Map(
    (locations || []).map((l: any) => [l.id, { location_type: l.location_type, group_size: l.group_size || 1 }])
  );

  // Create order items — for group types, expand into individual tickets
  const orderItems: { order_id: string; ticket_location_id: string; quantity: number; unit_price: number; subtotal: number; validation_code: string }[] = [];

  for (const item of items) {
    const loc = locationMap.get(item.ticket_location_id);
    const isGroup = loc && (loc.location_type === 'camarote_grupo' || loc.location_type === 'bistro') && loc.group_size > 1;

    if (isGroup) {
      // Create N individual order_items, each with quantity=1
      for (let i = 0; i < loc.group_size * item.quantity; i++) {
        orderItems.push({
          order_id: order.id,
          ticket_location_id: item.ticket_location_id,
          quantity: 1,
          unit_price: i === 0 ? item.unit_price * item.quantity : 0, // full price on first, 0 on rest
          subtotal: i === 0 ? item.quantity * item.unit_price : 0,
          validation_code: '',
        });
      }
    } else {
      orderItems.push({
        order_id: order.id,
        ticket_location_id: item.ticket_location_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        validation_code: '',
      });
    }
  }

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return order;
}
