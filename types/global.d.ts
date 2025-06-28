// Global TypeScript interfaces and types

export interface VIPData {
  id: number;
  email: string;
  plano: string;
  data_inicio: string;
  data_expiraca: string;
  pagamento_aprovado: boolean;
}

export interface VIPStatusResult {
  success: boolean;
  isVIP: boolean;
  data: VIPData | null;
  expiresAt: Date | null;
  error?: string;
}

export interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  payment_id: string;
  created_at: string;
}

export interface PaymentsResult {
  success: boolean;
  payments: Payment[];
  error?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  needsConfirmation?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  is_vip?: boolean;
  vip_expires_at?: string;
  vip_data?: VIPData | null;
}

export interface Message {
  type: 'error' | 'success' | 'info' | '';
  text: string;
}

// Environment variables interface
export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MERCADO_PAGO_TOKEN: string;
  JWT_SECRET: string;
  WEBHOOK_BASE_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}