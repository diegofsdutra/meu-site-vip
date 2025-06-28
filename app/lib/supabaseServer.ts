import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SERVER-SIDE SUPABASE CLIENT (Apenas para API routes)
// ============================================================================

// Função para criar cliente server-side com Service Role Key
export function createServerSupabaseClient() {
  const serverSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!serverSupabaseUrl || !serviceRoleKey) {
    throw new Error('❌ Missing server-side environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  }
  
  console.log('✅ Creating Supabase Admin Client (server-side):', {
    url: serverSupabaseUrl,
    mode: 'server-side (service role)',
    hasServiceKey: !!serviceRoleKey
  })
  
  return createClient(serverSupabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Cliente server-side (apenas para API routes)
export const supabaseAdmin = createServerSupabaseClient()