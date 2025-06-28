import { supabase } from './supabaseClient'

export const isVIPActive = (profile: any): boolean => {
  if (!profile?.is_vip) return false
  
  const now = new Date()
  const expiresAt = new Date(profile.vip_expires_at)
  
  return now < expiresAt
}

export const activateVIP = async (userId: string, months: number = 1) => {
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + months)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_vip: true,
      vip_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

export const recordVIPPayment = async (userId: string, paymentData: {
  amount: number
  method: string
  status: string
  paymentId?: string
}) => {
  const { data, error } = await supabase
    .from('vip_payments')
    .insert({
      user_id: userId,
      amount: paymentData.amount,
      payment_method: paymentData.method,
      payment_status: paymentData.status,
      payment_id: paymentData.paymentId || null
    })
    .select()
    .single()

  return { data, error }
}

export const processVIPUpgrade = async (userId: string, paymentMethod: string = 'mercado_pago') => {
  try {
    // Buscar dados do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { 
        success: false, 
        message: 'Usuário não encontrado',
        error: profileError 
      }
    }

    // Em vez de ativar VIP diretamente, redirecionar para checkout
    // O VIP será ativado automaticamente pelo webhook após pagamento
    return { 
      success: true, 
      message: 'Redirecionando para pagamento...',
      redirectToCheckout: true,
      userData: {
        userId,
        email: profile.email
      }
    }

  } catch (error) {
    return { 
      success: false, 
      message: 'Erro interno',
      error 
    }
  }
}