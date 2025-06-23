import { createClient } from '@supabase/supabase-js'

// Variáveis de ambiente + fallback direto
const supabaseUrl = process.env.SUPABASE_URL || 'https://gttyvzepkwhckgnepnxt.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dHl2emVwa3doY2tnbmVwbnh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgyNTcxMywiZXhwIjoyMDY1NDAxNzEzfQ.EQaMY4wIxznVbPNz144mR-ZJP8n1IqdZXlx5DYClusc'

// Verificação
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('❌ Variáveis do Supabase não configuradas corretamente (service role)')
}

console.log('✅ Supabase Client (service role) configurado:', {
  url: supabaseUrl,
  usingEnvVars: !!process.env.SUPABASE_SERVICE_ROLE_KEY
})

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Tipos TypeScript das suas tabelas
export interface UserProfile {
  id: string
  email: string
  name?: string
  created_at?: string
  updated_at?: string
  vip_data?: VIPData | null
}

export interface VIPData {
  id: number
  email: string
  plano: string
  data_inicio: string
  data_expiraca: string
  pagamento_aprovado: boolean
}

export interface VIPPayment {
  id: string
  user_id: string
  payment_id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
}
