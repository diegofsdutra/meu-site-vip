import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import crypto from 'crypto';

export async function POST(req) {
  try {
    console.log('🔔 Webhook Mercado Pago recebido');

    // Verificar se é um webhook válido do Mercado Pago
    const signature = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id');
    
    console.log('🔐 Headers de segurança:', { signature, requestId });

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

    const mercadoPagoToken = process.env.MERCADO_PAGO_TOKEN;
    
    if (!mercadoPagoToken) {
      console.error('❌ MERCADO_PAGO_TOKEN não configurado');
      return NextResponse.json({ error: 'Token não configurado' }, { status: 500 });
    }

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

    // Buscar ou criar o usuário pelo email
    let { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', emailFinal)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar usuário:', profileError);
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
    }

    // Se usuário não existe, criar um novo perfil (para checkout sem login)
    if (!profileData) {
      console.log('👤 Usuário não encontrado, criando novo perfil para:', emailFinal);
      
      // Gerar um UUID para o usuário guest
      const crypto = require('crypto');
      const guestUserId = crypto.randomUUID();
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: guestUserId,
          email: emailFinal,
          name: emailFinal.split('@')[0],
          is_vip: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }])
        .select('id, email')
        .single();

      if (createError) {
        console.error('❌ Erro ao criar perfil:', createError);
        return NextResponse.json({ error: 'Erro ao criar perfil do usuário' }, { status: 500 });
      }

      profileData = newProfile;
      console.log('✅ Novo perfil criado:', profileData.id, profileData.email);
    }

    console.log('👤 Usuário encontrado:', profileData.id, profileData.email);

    // Verificar se pagamento já foi processado
    const { data: existingPayment } = await supabaseAdmin
      .from('vip_payments')
      .select('id, payment_status')
      .eq('payment_id', paymentId.toString())
      .single();

    if (existingPayment) {
      console.log('⚠️ Pagamento já processado anteriormente:', existingPayment);
      if (existingPayment.payment_status === 'approved') {
        return NextResponse.json({ 
          message: 'Pagamento já foi processado com sucesso',
          duplicate: true 
        }, { status: 200 });
      }
    }

    // Registrar/atualizar pagamento no Supabase
    const paymentData = {
      user_id: profileData.id,
      payment_id: paymentId.toString(),
      amount: Math.round((payment.transaction_amount || payment.total_paid_amount) * 100), // converter para centavos
      currency: payment.currency_id || 'BRL',
      payment_method: payment.payment_method_id || payment.payment_type_id || 'unknown',
      payment_status: 'approved',
      external_reference: payment.external_reference,
      mercado_pago_data: payment
    };

    let paymentResult;
    if (existingPayment) {
      // Atualizar pagamento existente
      paymentResult = await supabaseAdmin
        .from('vip_payments')
        .update(paymentData)
        .eq('payment_id', paymentId.toString());
    } else {
      // Inserir novo pagamento
      paymentResult = await supabaseAdmin
        .from('vip_payments')
        .insert([paymentData]);
    }

    if (paymentResult.error) {
      console.error('❌ Erro ao registrar pagamento:', paymentResult.error);
      return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
    }

    console.log('✅ Pagamento registrado/atualizado com sucesso');

    // Atualizar perfil do usuário para VIP
    const vipDuration = getVIPDuration(paymentData.amount);
    const vipExpiresAt = new Date();
    vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);

    // Atualizar tabela profiles
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_vip: true,
        vip_expires_at: vipExpiresAt.toISOString()
      })
      .eq('id', profileData.id);

    if (profileUpdateError) {
      console.error('❌ Erro ao atualizar perfil VIP:', profileUpdateError);
      return NextResponse.json({ error: 'Erro ao ativar VIP no perfil' }, { status: 500 });
    }

    console.log('✅ Perfil VIP atualizado até:', vipExpiresAt.toISOString());

    // Manter compatibilidade com tabela usuarios_vip
    const { data: existingVIP, error: vipSearchError } = await supabaseAdmin
      .from('usuarios_vip')
      .select('*')
      .eq('email', emailFinal)
      .maybeSingle();

    const vipData = {
      email: emailFinal,
      plano: vipDuration.planType,
      data_inicio: now.toISOString(),
      data_expiraca: vipExpiresAt.toISOString(),
      pagamento_aprovado: true,
      payment_id: paymentId.toString()
    };

    if (existingVIP) {
      await supabaseAdmin
        .from('usuarios_vip')
        .update(vipData)
        .eq('email', emailFinal);
      console.log('✅ Registro usuarios_vip atualizado');
    } else {
      await supabaseAdmin
        .from('usuarios_vip')
        .insert([vipData]);
      console.log('✅ Registro usuarios_vip criado');
    }

    return NextResponse.json({
      success: true,
      message: 'VIP ativado com sucesso!',
      data: {
        email: emailFinal,
        user_id: profileData.id,
        plano: vipDuration.planType,
        expira_em: vipExpiresAt.toISOString(),
        payment_id: paymentId,
        amount: paymentData.amount
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

// Função auxiliar para determinar duração do VIP baseado no valor
function getVIPDuration(amountInCents) {
  // Valores em centavos: R$ 7,70 = 770, R$ 19,90 = 1990, R$ 59,90 = 5990
  if (amountInCents <= 1000) { // até R$ 10,00
    return { days: 30, planType: 'mensal' };
  } else if (amountInCents <= 2500) { // até R$ 25,00
    return { days: 90, planType: 'trimestral' };
  } else { // mais que R$ 25,00
    return { days: 365, planType: 'anual' };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook PRODUÇÃO funcionando!',
    timestamp: new Date().toISOString(),
    status: 'online'
  });
}
