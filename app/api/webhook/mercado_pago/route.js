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

    // Buscar dados completos do pagamento no Mercado Pago
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
    console.log('💳 Dados completos do pagamento:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      metadata: payment.metadata,
      amount: payment.transaction_amount || payment.total_paid_amount,
      email: payment.payer?.email,
      payment_method: payment.payment_method_id,
      date_created: payment.date_created,
      date_approved: payment.date_approved
    });

    // Verificar se pagamento foi aprovado
    if (payment.status !== 'approved') {
      console.log('⏳ Pagamento ainda não aprovado, status:', payment.status);
      return NextResponse.json({ 
        message: 'Pagamento ainda não aprovado', 
        status: payment.status 
      }, { status: 200 });
    }

    // Extrair dados do pagamento
    let externalRef = {};
    try {
      if (payment.external_reference) {
        externalRef = JSON.parse(payment.external_reference);
      }
    } catch (e) {
      console.log('❌ Erro ao parsear external_reference:', payment.external_reference);
    }

    const emailFinal = externalRef.email || payment.metadata?.email || payment.payer?.email;
    const planTypeFinal = externalRef.planType || payment.metadata?.planType || 'monthly';
    const userIdFromPayment = externalRef.userId || payment.metadata?.userId;

    if (!emailFinal) {
      console.log('❌ Email não encontrado em nenhuma fonte');
      return NextResponse.json({ error: 'Email não encontrado' }, { status: 400 });
    }

    console.log('👤 Processando VIP para:', {
      email: emailFinal,
      planType: planTypeFinal,
      userId: userIdFromPayment,
      paymentId: paymentId
    });

    // Verificar se este pagamento já foi processado
    const { data: existingPayment } = await supabaseAdmin
      .from('vip_payments')
      .select('id, payment_status, processed')
      .eq('payment_id', paymentId.toString())
      .maybeSingle();

    if (existingPayment && existingPayment.processed === true) {
      console.log('⚠️ Pagamento já foi processado:', existingPayment);
      return NextResponse.json({ 
        message: 'Pagamento já foi processado com sucesso',
        duplicate: true 
      }, { status: 200 });
    }

    const now = new Date();

    // 1. BUSCAR OU CRIAR USUÁRIO NO PROFILES
    let { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, is_vip, vip_expires_at')
      .eq('email', emailFinal)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar usuário:', profileError);
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
    }

    // Se usuário não existe, criar
    if (!profileData) {
      console.log('👤 Usuário não encontrado, criando novo perfil para:', emailFinal);
      
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
        .select('id, email, is_vip, vip_expires_at')
        .single();

      if (createError) {
        console.error('❌ Erro ao criar perfil:', createError);
        return NextResponse.json({ error: 'Erro ao criar perfil do usuário' }, { status: 500 });
      }

      profileData = newProfile;
      console.log('✅ Novo perfil criado:', profileData.id, profileData.email);
    }

    // 2. CALCULAR NOVA DATA DE EXPIRAÇÃO
    const vipDuration = getVIPDuration(payment.transaction_amount || payment.total_paid_amount, planTypeFinal);
    let vipExpiresAt = new Date();

    // Se já é VIP e ainda não expirou, estender a partir da data atual de expiração
    if (profileData.is_vip && profileData.vip_expires_at && new Date(profileData.vip_expires_at) > now) {
      vipExpiresAt = new Date(profileData.vip_expires_at);
      console.log('👤 Usuário já é VIP, estendendo a partir de:', vipExpiresAt.toISOString());
    } else {
      vipExpiresAt = new Date(now);
      console.log('👤 Novo VIP ou VIP expirado, começando de:', vipExpiresAt.toISOString());
    }

    // Adicionar duração do plano (APENAS UMA VEZ)
    vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);

    console.log('📅 Cálculo de expiração VIP:', {
      planType: planTypeFinal,
      amount: payment.transaction_amount,
      vipDuration,
      usuario_ja_vip: profileData.is_vip,
      expiracao_atual: profileData.vip_expires_at,
      base_para_calculo: profileData.is_vip && profileData.vip_expires_at && new Date(profileData.vip_expires_at) > now ? 'estender_vip_existente' : 'novo_vip',
      nova_expiracao: vipExpiresAt.toISOString(),
      dias_adicionados: vipDuration.days
    });

    // 3. REGISTRAR PAGAMENTO NO SUPABASE
    const paymentData = {
      user_id: profileData.id,
      payment_id: paymentId.toString(),
      amount: Math.round((payment.transaction_amount || payment.total_paid_amount) * 100),
      currency: payment.currency_id || 'BRL',
      payment_method: payment.payment_method_id || payment.payment_type_id || 'unknown',
      payment_status: 'approved',
      external_reference: payment.external_reference,
      mercado_pago_data: payment,
      processed: true,
      webhook_received_at: now.toISOString()
    };

    let paymentResult;
    if (existingPayment) {
      paymentResult = await supabaseAdmin
        .from('vip_payments')
        .update(paymentData)
        .eq('payment_id', paymentId.toString());
    } else {
      paymentResult = await supabaseAdmin
        .from('vip_payments')
        .insert([paymentData]);
    }

    if (paymentResult.error) {
      console.error('❌ Erro ao registrar pagamento:', paymentResult.error);
      return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
    }

    console.log('✅ Pagamento registrado com sucesso');

    // 4. ATUALIZAR PERFIL DO USUÁRIO PARA VIP
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_vip: true,
        vip_expires_at: vipExpiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', profileData.id);

    if (profileUpdateError) {
      console.error('❌ Erro ao atualizar perfil VIP:', profileUpdateError);
      return NextResponse.json({ error: 'Erro ao ativar VIP no perfil' }, { status: 500 });
    }

    console.log('✅ Perfil VIP atualizado até:', vipExpiresAt.toISOString());

    // 5. UPSERT NA TABELA USUARIOS_VIP (USANDO EMAIL COMO CHAVE)
    const dataInicio = new Date(); // Usar nova instância para garantir diferença
    
    // Garantir que data_expiraca > data_inicio (constraint valid_dates)
    // APENAS se por algum motivo a data calculada estiver errada
    if (vipExpiresAt <= dataInicio) {
      console.log('⚠️ ERRO: data_expiraca não está maior que data_inicio, recalculando...');
      vipExpiresAt = new Date(dataInicio);
      vipExpiresAt.setDate(vipExpiresAt.getDate() + vipDuration.days);
      console.log('🔧 Data recalculada para:', vipExpiresAt.toISOString());
    } else {
      console.log('✅ Constraint válida: data_expiraca > data_inicio');
    }
    
    console.log('📅 Validando datas para upsert:', {
      data_inicio: dataInicio.toISOString(),
      data_expiraca: vipExpiresAt.toISOString(),
      diferenca_dias: Math.floor((vipExpiresAt - dataInicio) / (1000 * 60 * 60 * 24)),
      valid_constraint: vipExpiresAt > dataInicio
    });
    
    const vipUpsertData = {
      email: emailFinal,
      user_id: profileData.id,
      plano: vipDuration.planType,
      data_inicio: dataInicio.toISOString(),
      data_expiraca: vipExpiresAt.toISOString(),
      pagamento_aprovado: true,
      is_active: true,
      payment_id: paymentId.toString(),
      payment_method: payment.payment_method_id || 'unknown',
      amount_paid: Math.round((payment.transaction_amount || payment.total_paid_amount) * 100),
      source: 'mercado_pago',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    // UPSERT usando conflict resolution no email
    const { data: vipUpsertResult, error: vipUpsertError } = await supabaseAdmin
      .from('usuarios_vip')
      .upsert(vipUpsertData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select();

    if (vipUpsertError) {
      console.error('❌ Erro ao fazer upsert usuarios_vip:', vipUpsertError);
      // Não falhar aqui, pois o VIP já foi ativado no profiles
      console.log('⚠️ Continuando mesmo com erro no upsert usuarios_vip');
    } else {
      console.log('✅ Upsert usuarios_vip realizado com sucesso:', vipUpsertResult);
    }

    // 6. RETORNAR SUCESSO
    const result = {
      success: true,
      message: 'VIP ativado com sucesso!',
      data: {
        email: emailFinal,
        user_id: profileData.id,
        plano: vipDuration.planType,
        data_inicio: dataInicio.toISOString(),
        data_expiraca: vipExpiresAt.toISOString(),
        payment_id: paymentId,
        amount: paymentData.amount / 100, // converter de volta para reais
        pagamento_aprovado: true,
        dias_vip: Math.floor((vipExpiresAt - dataInicio) / (1000 * 60 * 60 * 24))
      }
    };

    console.log('🎉 VIP ATIVADO COM SUCESSO:', result.data);

    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 ERRO CRÍTICO no webhook:', error);
    console.error('📍 Stack trace:', error.stack);
    
    return NextResponse.json({
      error: 'Erro interno no webhook',
      detail: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Função melhorada para determinar duração do VIP
function getVIPDuration(amountInReais, planType) {
  console.log('💰 Calculando duração VIP:', { amountInReais, planType });

  // Primeiro, tentar usar o planType se fornecido
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

  // Fallback: usar valor pago
  const amount = parseFloat(amountInReais);
  
  if (amount <= 10.00) {
    return { days: 30, planType: 'mensal' };
  } else if (amount <= 25.00) {
    return { days: 90, planType: 'trimestral' };
  } else {
    return { days: 365, planType: 'anual' };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook Mercado Pago ativo!',
    timestamp: new Date().toISOString(),
    status: 'online',
    version: '2.0'
  });
}