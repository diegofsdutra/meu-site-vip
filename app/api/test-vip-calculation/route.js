import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { planType, isExistingVIP, currentExpiry } = await req.json();
    
    console.log('🧪 Testando cálculo de VIP:', { planType, isExistingVIP, currentExpiry });

    // Simular função getVIPDuration do webhook
    function getVIPDuration(amountInReais, planType) {
      if (planType) {
        switch (planType.toLowerCase()) {
          case 'monthly':
          case 'mensal':
            return { days: 30, planType: 'mensal' };
          case 'quarterly':
          case 'trimestral':
            return { days: 90, planType: 'trimestral' };
          case 'yearly':
          case 'anual':
            return { days: 365, planType: 'anual' };
        }
      }
      return { days: 30, planType: 'mensal' }; // fallback
    }

    // Simular dados do usuário
    const now = new Date();
    const profileData = {
      is_vip: isExistingVIP || false,
      vip_expires_at: currentExpiry || null
    };

    // REPRODUZIR EXATAMENTE A LÓGICA DO WEBHOOK
    const vipDuration = getVIPDuration(7.70, planType);
    let vipExpiresAt = new Date();

    console.log('🔢 Dados de entrada:', {
      now: now.toISOString(),
      is_vip: profileData.is_vip,
      vip_expires_at: profileData.vip_expires_at,
      vipDuration
    });

    // Se já é VIP e ainda não expirou, estender a partir da data atual de expiração
    if (profileData.is_vip && profileData.vip_expires_at && new Date(profileData.vip_expires_at) > now) {
      vipExpiresAt = new Date(profileData.vip_expires_at);
      console.log('👤 Usuário já é VIP, estendendo a partir de:', vipExpiresAt.toISOString());
    } else {
      vipExpiresAt = new Date(now);
      console.log('👤 Novo VIP ou VIP expirado, começando de:', vipExpiresAt.toISOString());
    }

    const baseDate = new Date(vipExpiresAt); // Salvar data base para comparação

    // Adicionar duração do plano (APENAS UMA VEZ)
    vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);

    // Calcular diferenças
    const diferenciaReal = Math.floor((vipExpiresAt - baseDate) / (1000 * 60 * 60 * 24));
    const dataInicio = new Date();
    const diferenciaFromNow = Math.floor((vipExpiresAt - dataInicio) / (1000 * 60 * 60 * 24));

    const resultado = {
      success: true,
      planType: planType,
      vipDuration: vipDuration,
      calculo: {
        data_base: baseDate.toISOString(),
        dias_adicionados: vipDuration.days,
        data_final: vipExpiresAt.toISOString(),
        diferenca_real: diferenciaReal,
        esperado: vipDuration.days,
        correto: diferenciaReal === vipDuration.days
      },
      para_banco: {
        data_inicio: dataInicio.toISOString(),
        data_expiraca: vipExpiresAt.toISOString(),
        diferenca_em_dias: diferenciaFromNow,
        constraint_valida: vipExpiresAt > dataInicio
      },
      debug: {
        base_calculation: `${baseDate.toISOString()} + ${vipDuration.days} dias = ${vipExpiresAt.toISOString()}`,
        expected_vs_actual: `Esperado: ${vipDuration.days} dias, Obtido: ${diferenciaReal} dias`,
        status: diferenciaReal === vipDuration.days ? '✅ CORRETO' : '❌ INCORRETO'
      }
    };

    console.log('📊 Resultado do teste:', resultado);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('💥 Erro no teste:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Teste de cálculo de VIP',
    usage: {
      novo_vip_mensal: 'POST com { "planType": "monthly" }',
      estender_vip_trimestral: 'POST com { "planType": "quarterly", "isExistingVIP": true, "currentExpiry": "2025-07-01T00:00:00.000Z" }',
      novo_vip_anual: 'POST com { "planType": "yearly" }'
    },
    description: 'Simula exatamente o cálculo de data_expiraca do webhook'
  });
}