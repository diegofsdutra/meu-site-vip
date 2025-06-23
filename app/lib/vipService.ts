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

export const processVIPUpgrade = async (userId: string, paymentMethod: string = 'pix') => {
  try {
    const paymentResult = await recordVIPPayment(userId, {
      amount: 7.70,
      method: paymentMethod,
      status: 'completed'
    })

    if (paymentResult.error) {
      return { success: false, error: paymentResult.error }
    }

    const vipResult = await activateVIP(userId, 1)

    if (vipResult.error) {
      return { success: false, error: vipResult.error }
    }

    return { 
      success: true, 
      message: 'VIP ativado com sucesso!',
      data: vipResult.data 
    }

  } catch (error) {
    return { success: false, error }
  }
}