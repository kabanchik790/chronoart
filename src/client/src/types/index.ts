export type UserRole = 'customer' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type OrderCustomer = Pick<User, 'id' | 'name' | 'email'>;

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'ready'
  | 'completed';

export type Order = {
  id: number;
  user_id: number;
  status: OrderStatus;
  mechanism: string;
  case_type: string;
  dial: string;
  strap: string;
  engraving: string | null;
  budget: number;
  notes: string | null;
  created_at: string;
};

export type OrderListItem = Order & {
  unread_count: number;
  user?: OrderCustomer | null;
};

export type Message = {
  id: number;
  order_id?: number;
  user_id: number | null;
  type: 'user' | 'system';
  text: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

export type Project = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderFormValues = {
  mechanism: string;
  case_type: string;
  dial: string;
  strap: string;
  engraving: string;
  budget: string;
  notes: string;
  name: string;
  email: string;
  password: string;
};
