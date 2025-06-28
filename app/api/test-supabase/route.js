import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testando configuração Supabase...')

    // Testar variáveis de ambiente
    const envTest = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    console.log('📋 Variáveis de ambiente:', envTest)

    // Testar import client-side
    let clientTest = { success: false, error: null }
    try {
      const { supabase } = await import('../../lib/supabaseClient')
      clientTest = { success: true, error: null }
      console.log('✅ Cliente client-side importado com sucesso')
    } catch (error) {
      clientTest = { success: false, error: error.message }
      console.log('❌ Erro ao importar cliente client-side:', error.message)
    }

    // Testar import server-side
    let serverTest = { success: false, error: null }
    try {
      const { supabaseAdmin } = await import('../../lib/supabaseServer')
      serverTest = { success: true, error: null }
      console.log('✅ Cliente server-side importado com sucesso')
    } catch (error) {
      serverTest = { success: false, error: error.message }
      console.log('❌ Erro ao importar cliente server-side:', error.message)
    }

    const result = {
      timestamp: new Date().toISOString(),
      environment: envTest,
      clientSide: clientTest,
      serverSide: serverTest,
      status: clientTest.success && serverTest.success ? 'SUCCESS' : 'ERROR'
    }

    console.log('🏁 Resultado final:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('💥 Erro crítico no teste:', error)
    return NextResponse.json({
      error: 'Erro crítico no teste',
      message: error.message,
      status: 'CRITICAL_ERROR'
    }, { status: 500 })
  }
}