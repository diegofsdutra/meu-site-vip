import { supabase } from './supabaseClient'

// Verificar se o usuário é VIP usando a tabela usuarios_vip
export const isVIPActive = (profile) => {
  if (!profile || !profile.email) {
    return false
  }

  // Se o perfil já tem dados VIP carregados, usar eles
  if (profile.vip_data) {
    const now = new Date()
    const expiresAt = new Date(profile.vip_data.data_expiraca)
    return profile.vip_data.pagamento_aprovado && expiresAt > now
  }

  return false
}

// Carregar dados VIP do usuário
export const loadUserVIPData = async (email) => {
  try {
    if (!email) {
      console.log('❌ Email não fornecido para carregar VIP')
      return null
    }

    console.log('🔍 Carregando dados VIP para:', email)

    const { data, error } = await supabase
      .from('usuarios_vip')
      .select('*')
      .eq('email', email)
      .eq('pagamento_aprovado', true)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Erro ao carregar dados VIP:', error)
      return null
    }

    if (!data) {
      console.log('ℹ️ Nenhum registro VIP encontrado para:', email)
      return null
    }

    // Verificar se ainda não expirou
    const now = new Date()
    const expiresAt = new Date(data.data_expiraca)
    
    if (expiresAt <= now) {
      console.log('⏰ VIP expirado para:', email, 'expirou em:', expiresAt.toLocaleDateString('pt-BR'))
      return null
    }

    console.log('✅ VIP ativo para:', email, 'expira em:', expiresAt.toLocaleDateString('pt-BR'))
    return data

  } catch (error) {
    console.error('💥 Erro ao carregar dados VIP:', error)
    return null
  }
}

// Processar upgrade VIP (usado pelo AuthProvider)
export const processVIPUpgrade = async (userId, paymentMethod) => {
  try {
    console.log('🚀 Iniciando processo de upgrade VIP para usuário:', userId)
    
    // Esta função agora só retorna sucesso
    // O VIP será ativado automaticamente pelo webhook após o pagamento
    return {
      success: true,
      message: 'Redirecionando para pagamento...'
    }
  } catch (error) {
    console.error('❌ Erro no upgrade VIP:', error)
    return {
      success: false,
      message: 'Erro ao processar upgrade VIP'
    }
  }
}

// Registrar pagamento na tabela vip_payments
export const registerPayment = async (userId, paymentId, amount, method, status = 'pending') => {
  try {
    console.log('💰 Registrando pagamento:', { userId, paymentId, amount, method, status })

    const { data, error } = await supabase
      .from('vip_payments')
      .insert([{
        user_id: userId,
        payment_id: paymentId,
        amount: amount,
        payment_method: method,
        payment_status: status
      }])
      .select()

    if (error) {
      console.error('❌ Erro ao registrar pagamento:', error)
      return { success: false, error }
    }

    console.log('✅ Pagamento registrado com sucesso:', data[0])
    return { success: true, data: data[0] }
  } catch (error) {
    console.error('💥 Erro ao registrar pagamento:', error)
    return { success: false, error: error.message }
  }
}

// Atualizar status do pagamento
export const updatePaymentStatus = async (paymentId, status) => {
  try {
    console.log('🔄 Atualizando status do pagamento:', paymentId, 'para:', status)

    const { data, error } = await supabase
      .from('vip_payments')
      .update({ payment_status: status })
      .eq('payment_id', paymentId)
      .select()

    if (error) {
      console.error('❌ Erro ao atualizar status do pagamento:', error)
      return { success: false, error }
    }

    console.log('✅ Status do pagamento atualizado:', data[0])
    return { success: true, data: data[0] }
  } catch (error) {
    console.error('💥 Erro ao atualizar status do pagamento:', error)
    return { success: false, error: error.message }
  }
}

// Verificar se email tem VIP ativo (função auxiliar)
export const checkVIPStatus = async (email) => {
  const vipData = await loadUserVIPData(email)
  return {
    isVIP: !!vipData,
    data: vipData,
    expiresAt: vipData ? new Date(vipData.data_expiraca) : null
  }
}