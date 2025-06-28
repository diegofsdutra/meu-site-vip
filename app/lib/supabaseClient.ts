import { createClient } from '@supabase/supabase-js'

// ============================================================================
// CLIENT-SIDE SUPABASE CLIENT (Para uso em componentes React)
// ============================================================================

// Variáveis públicas para client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Verificação de variáveis client-side
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing client-side environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local')
}

// Cliente para uso no browser (autenticação, operações de usuário)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

console.log('✅ Supabase Client (client-side) configurado:', {
  url: supabaseUrl,
  mode: 'client-side (anon key)',
  hasAnonKey: !!supabaseAnonKey
})

// Re-export types from global types file
export type { UserProfile, VIPData, Payment as VIPPayment } from '../../types/global'

// NOTA: Para uso server-side (API routes), importe de './supabaseServer'
