import { supabase } from './supabaseClient'

// Verificar se o usuário é VIP usando a tabela usuarios_vip
export const isVIPActive = (profile: any) => {
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
export const loadUserVIPData = async (email: string) => {
  try {
    if (!email) {
      console.log('❌ Email não fornecido para carregar VIP');
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

    if (expiresAt <= now) {
      console.log('⏰ VIP expirado para:', cleanEmail, 'expirou em:', expiresAt.toLocaleDateString('pt-BR'));
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
export const checkVIPStatus = async (email: string) => {
  const vipData = await loadUserVIPData(email);
  return {
    isVIP: !!vipData,
    data: vipData,
    expiresAt: vipData ? new Date(vipData.data_expiraca) : null
  };
}

// Buscar pagamentos do usuário
export const getUserPayments = async (userId: string) => {
  try {
    if (!userId) {
      console.log('❌ userId não fornecido para buscar pagamentos');
      return { success: false, payments: [] };
    }

    const { data, error } = await supabase
      .from('vip_payments')
      .select('id, amount, payment_method, payment_status, payment_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return { success: false, payments: [] };
    }

    return { success: true, payments: data || [] };
  } catch (error) {
    console.error('💥 Erro inesperado ao buscar pagamentos:', error);
    return { success: false, payments: [] };
  }
};
