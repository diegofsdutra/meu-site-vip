import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testando cálculo de datas para usuarios_vip');

    // Simular o cálculo que o webhook faz
    const now = new Date();
    const dataInicio = new Date();
    
    // Simular duração VIP (30 dias para plano mensal)
    const vipDuration = { days: 30, planType: 'mensal' };
    
    let vipExpiresAt = new Date(dataInicio);
    vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);
    
    // Verificar constraint valid_dates
    const isValidConstraint = vipExpiresAt > dataInicio;
    const diferencaDias = Math.floor((vipExpiresAt - dataInicio) / (1000 * 60 * 60 * 24));
    
    console.log('📅 Teste de datas:', {
      data_inicio: dataInicio.toISOString(),
      data_expiraca: vipExpiresAt.toISOString(),
      diferenca_dias: diferencaDias,
      valid_constraint: isValidConstraint,
      constraint_check: `data_expiraca (${vipExpiresAt.toISOString()}) > data_inicio (${dataInicio.toISOString()}) = ${isValidConstraint}`
    });

    // Simular dados que seriam inseridos
    const vipUpsertData = {
      email: 'test@example.com',
      plano: vipDuration.planType,
      data_inicio: dataInicio.toISOString(),
      data_expiraca: vipExpiresAt.toISOString(),
      pagamento_aprovado: true,
      is_active: true
    };

    return NextResponse.json({
      success: true,
      message: 'Teste de datas concluído',
      constraint_validation: {
        valid_dates_check: isValidConstraint,
        diferenca_dias: diferencaDias,
        expected_result: isValidConstraint ? 'INSERT SUCCESS' : 'CONSTRAINT VIOLATION'
      },
      sample_data: vipUpsertData,
      sql_constraint: 'CHECK (data_expiraca > data_inicio)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Erro no teste de datas:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { planType } = await req.json();
    
    console.log('🧪 Testando cálculo de datas com planType:', planType);

    // Função para calcular duração (igual ao webhook)
    function getVIPDuration(planType) {
      switch (planType?.toLowerCase()) {
        case 'monthly':
        case 'mensal':
          return { days: 30, planType: 'mensal' };
        case 'quarterly':
        case 'trimestral':
          return { days: 90, planType: 'trimestral' };
        case 'yearly':
        case 'anual':
          return { days: 365, planType: 'anual' };
        default:
          return { days: 30, planType: 'mensal' };
      }
    }

    const dataInicio = new Date();
    const vipDuration = getVIPDuration(planType);
    
    let vipExpiresAt = new Date(dataInicio);
    vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);
    
    // Garantir constraint
    if (vipExpiresAt <= dataInicio) {
      console.log('⚠️ Ajustando data_expiraca para ser maior que data_inicio');
      vipExpiresAt = new Date(dataInicio);
      vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);
    }

    const isValid = vipExpiresAt > dataInicio;
    const diferencaDias = Math.floor((vipExpiresAt - dataInicio) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      success: true,
      planType: planType,
      vipDuration: vipDuration,
      dates: {
        data_inicio: dataInicio.toISOString(),
        data_expiraca: vipExpiresAt.toISOString(),
        diferenca_dias: diferencaDias,
        valid_constraint: isValid
      },
      sql_check: `${vipExpiresAt.toISOString()} > ${dataInicio.toISOString()} = ${isValid}`,
      status: isValid ? 'READY_FOR_INSERT' : 'CONSTRAINT_VIOLATION'
    });

  } catch (error) {
    console.error('💥 Erro no teste POST:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}