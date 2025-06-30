// API route para testar variáveis de ambiente na Vercel
export default function handler(req, res) {
  const envTest = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'MISSING',
    timestamp: new Date().toISOString()
  }

  res.status(200).json(envTest)
}