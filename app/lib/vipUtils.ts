import { supabase } from './supabaseClient'

// Import types from global types file
import type { VIPData, VIPStatusResult, PaymentsResult, Payment } from '../../types/global'

// Verificar se o usuário é VIP usando a tabela usuarios_vip
export const isVIPActive = (profile: any): boolean => {
  if (!profile || !profile.email) {
    return false;
  }

  if (profile.vip_data) {
    const now = new Date();
    const expiresAt = new Date(profile.vip_data.data_expiraca);
    return profile.vip_data.pagamento_aprovado && expiresAt > now;
  }

  return false;
}

// Carregar dados VIP do usuário
export const loadUserVIPData = async (email: string): Promise<VIPData | null> => {
  try {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.log('❌ Email inválido ou não fornecido para carregar VIP');
      return null;
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log('🔍 Carregando dados VIP para:', cleanEmail);

    // Primeira tentativa: busca exata
    let { data, error } = await supabase
      .from('usuarios_vip')
      .select('*')
      .eq('email', cleanEmail)
      .eq('pagamento_aprovado', true)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro na busca exata:', error);
    }

    // Segunda tentativa: busca case-insensitive
    if (!data) {
      console.log('🔄 Tentando busca case-insensitive...');
      const result = await supabase
        .from('usuarios_vip')
        .select('*')
        .ilike('email', cleanEmail)
        .eq('pagamento_aprovado', true)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }

    // Terceira tentativa: busca por padrão
    if (!data) {
      console.log('🔄 Tentando busca por padrão...');
      const emailPattern = cleanEmail.replace('@gmail.com', '%gmail.com');
      const result = await supabase
        .from('usuarios_vip')
        .select('*')
        .ilike('email', emailPattern)
        .eq('pagamento_aprovado', true)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Erro ao carregar dados VIP:', error);
      return null;
    }

    if (!data) {
      console.log('ℹ️ Nenhum registro VIP encontrado para:', cleanEmail);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(data.data_expiraca);

    console.log('📅 Verificando expiração:', {
      data_expiraca: data.data_expiraca,
      expires_at: expiresAt,
      now: now,
      is_expired: expiresAt <= now
    });

    if (isNaN(expiresAt.getTime()) || expiresAt <= now) {
      console.log('⏰ VIP expirado ou data inválida para:', cleanEmail, 'expirou em:', data.data_expiraca);
      return null;
    }

    console.log('✅ VIP ativo para:', cleanEmail, 'expira em:', expiresAt.toLocaleDateString('pt-BR'));
    return data;

  } catch (error) {
    console.error('💥 Erro ao carregar dados VIP:', error);
    return null;
  }
}

// Processar upgrade VIP (simulação)
export const processVIPUpgrade = async (userId: string, paymentMethod: string) => {
  try {
    console.log('🚀 Iniciando processo de upgrade VIP para usuário:', userId);
    return {
      success: true,
      message: 'Redirecionando para pagamento...'
    };
  } catch (error) {
    console.error('❌ Erro no upgrade VIP:', error);
    return {
      success: false,
      message: 'Erro ao processar upgrade VIP'
    };
  }
}

// Verificar se email tem VIP ativo
export const checkVIPStatus = async (email: string): Promise<VIPStatusResult> => {
  try {
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        isVIP: false,
        data: null,
        expiresAt: null,
        error: 'Email inválido'
      };
    }

    const vipData = await loadUserVIPData(email);
    
    return {
      success: true,
      isVIP: !!vipData,
      data: vipData,
      expiresAt: vipData ? new Date(vipData.data_expiraca) : null
    };
  } catch (error) {
    console.error('❌ Erro ao verificar status VIP:', error);
    return {
      success: false,
      isVIP: false,
      data: null,
      expiresAt: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Buscar pagamentos do usuário
export const getUserPayments = async (userId: string): Promise<PaymentsResult> => {
  try {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.log('❌ userId inválido ou não fornecido para buscar pagamentos');
      return { success: false, payments: [], error: 'userId inválido' };
    }

    const { data, error } = await supabase
      .from('vip_payments')
      .select('id, amount, payment_method, payment_status, payment_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return { 
        success: false, 
        payments: [], 
        error: `Erro na busca: ${error.message}` 
      };
    }

    return { success: true, payments: data || [] };
  } catch (error) {
    console.error('💥 Erro inesperado ao buscar pagamentos:', error);
    return { 
      success: false, 
      payments: [], 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};
