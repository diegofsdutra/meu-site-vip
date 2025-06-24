import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(req) {
  try {
    console.log('🔔 Webhook PRODUÇÃO recebido do Mercado Pago');

    const body = await req.json();
    console.log('📦 Dados do webhook:', JSON.stringify(body, null, 2));

    if (body.type !== 'payment') {
      console.log('ℹ️ Evento ignorado:', body.type);
      return NextResponse.json({ message: 'Evento ignorado' }, { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.log('❌ Payment ID não encontrado');
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    console.log('🔍 Consultando pagamento REAL:', paymentId);

    const mercadoPagoToken = process.env.MERCADO_PAGO_TOKEN || 'APP_USR-5004009313003728-061315-c81aaefb6eb2221c9b902dfbd00a8aa7-167454602';

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
      },
    });

    if (!paymentResponse.ok) {
      console.log('❌ Erro ao consultar pagamento no MP:', paymentResponse.status);
      const errorText = await paymentResponse.text();
      console.log('❌ Detalhes do erro:', errorText);
      return NextResponse.json({ error: 'Erro ao consultar pagamento' }, { status: 500 });
    }

    const payment = await paymentResponse.json();
    console.log('💳 Dados do pagamento:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      metadata: payment.metadata,
      amount: payment.transaction_amount || payment.total_paid_amount,
      email: payment.payer?.email
    });

    if (payment.status !== 'approved') {
      console.log('⏳ Pagamento ainda não aprovado, status:', payment.status);
      return NextResponse.json({ message: 'Pagamento ainda não aprovado' }, { status: 200 });
    }

    let externalRef = {};
    try {
      externalRef = JSON.parse(payment.external_reference || '{}');
    } catch (e) {
      console.log('❌ Erro ao parsear external_reference:', payment.external_reference);
    }

    const emailFinal = externalRef.email || payment.metadata?.email || payment.payer?.email;
    const planTypeFinal = externalRef.planType || payment.metadata?.planType || 'monthly';

    if (!emailFinal) {
      console.log('❌ Email não encontrado em nenhuma fonte');
      return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 });
    }

    console.log('👤 Ativando VIP REAL para:', emailFinal, 'plano:', planTypeFinal);

    const now = new Date();
    const plans = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };
    const days = plans[planTypeFinal] || 30;
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + days);

    // Buscar o perfil correto pelo email
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailFinal)
      .single();

    if (profileError || !profileData) {
      console.error('❌ Usuário não encontrado no Supabase:', profileError || 'Nenhum dado retornado');
      return NextResponse.json({ error: 'Usuário não encontrado no Supabase' }, { status: 404 });
    }

    // Inserir no vip_payments
    const { error: paymentError } = await supabase
      .from('vip_payments')
      .insert([{
        user_id: profileData.id,
        payment_id: paymentId.toString(),
        amount: payment.transaction_amount || payment.total_paid_amount,
        payment_method: payment.payment_method_id || payment.payment_type_id || 'unknown',
        payment_status: 'approved'
      }]);

    if (paymentError) {
      console.error('❌ Erro ao registrar pagamento:', paymentError);
    } else {
      console.log('✅ Pagamento registrado com sucesso');
    }

    // Inserir ou atualizar no usuarios_vip
    const { data: existingVIP, error: vipSearchError } = await supabase
      .from('usuarios_vip')
      .select('*')
      .eq('email', emailFinal)
      .maybeSingle();

    if (vipSearchError) {
      console.error('❌ Erro ao buscar VIP:', vipSearchError);
      return NextResponse.json({ error: 'Erro ao buscar VIP' }, { status: 500 });
    }

    if (existingVIP) {
      const { error: vipUpdateError } = await supabase
        .from('usuarios_vip')
        .update({
          plano: planTypeFinal,
          data_inicio: now.toISOString(),
          data_expiraca: dataExpiracao.toISOString(),
          pagamento_aprovado: true
        })
        .eq('email', emailFinal);

      if (vipUpdateError) {
        console.error('❌ Erro ao atualizar VIP:', vipUpdateError);
        return NextResponse.json({ error: 'Erro ao atualizar VIP' }, { status: 500 });
      }

      console.log('✅ VIP atualizado com sucesso');
    } else {
      const { error: vipInsertError } = await supabase
        .from('usuarios_vip')
        .insert([{
          email: emailFinal,
          plano: planTypeFinal,
          data_inicio: now.toISOString(),
          data_expiraca: dataExpiracao.toISOString(),
          pagamento_aprovado: true
        }]);

      if (vipInsertError) {
        console.error('❌ Erro ao criar VIP:', vipInsertError);
        return NextResponse.json({ error: 'Erro ao criar VIP' }, { status: 500 });
      }

      console.log('✅ VIP criado com sucesso');
    }

    return NextResponse.json({
      success: true,
      message: 'VIP ativado com sucesso!',
      data: {
        email: emailFinal,
        plano: planTypeFinal,
        expira_em: dataExpiracao.toISOString(),
        payment_id: paymentId
      }
    });

  } catch (error) {
    console.error('💥 ERRO CRÍTICO no webhook:', error);
    return NextResponse.json({
      error: 'Erro interno no webhook',
      detail: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook PRODUÇÃO funcionando!',
    timestamp: new Date().toISOString(),
    status: 'online'
  });
}
