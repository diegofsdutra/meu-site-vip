import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('🧪 Testando checkout com dados:', body);

    // Simular a validação do checkout atual
    const { planType, email, userId } = body;

    console.log('📋 Dados recebidos:', {
      planType,
      email: email?.substring(0, 3) + '***',
      userId: userId || 'não fornecido',
      hasEmail: !!email,
      hasPlanType: !!planType
    });

    // Testar validações
    if (!email || !planType) {
      return NextResponse.json({ 
        error: 'Email e tipo de plano são obrigatórios',
        received: { email: !!email, planType: !!planType }
      }, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Email inválido',
        email: email
      }, { status: 400 });
    }

    const plans = {
      monthly: { title: 'VIP 1 Mês', price: 7.70, days: 30 },
      quarterly: { title: 'VIP 3 Meses', price: 19.90, days: 90 },
      yearly: { title: 'VIP 1 Ano', price: 59.90, days: 365 },
    };

    const plan = plans[planType];
    if (!plan) {
      return NextResponse.json({ 
        error: 'Plano inválido',
        validPlans: Object.keys(plans),
        received: planType
      }, { status: 400 });
    }

    // Verificar configuração do Mercado Pago
    const mercadoPagoToken = process.env.MERCADO_PAGO_TOKEN;
    const webhookUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!mercadoPagoToken) {
      return NextResponse.json({ 
        error: 'Payment system not configured',
        detail: 'MERCADO_PAGO_TOKEN missing'
      }, { status: 500 });
    }

    if (!webhookUrl) {
      return NextResponse.json({ 
        error: 'Webhook configuration missing',
        detail: 'WEBHOOK_BASE_URL and NEXT_PUBLIC_APP_URL missing'
      }, { status: 500 });
    }

    // Simular dados que seriam enviados ao Mercado Pago
    const preferenceData = {
      items: [
        {
          title: plan.title,
          quantity: 1,
          unit_price: plan.price,
          currency_id: 'BRL'
        },
      ],
      payer: {
        email,
      },
      back_urls: {
        success: `${webhookUrl}/checkout/success`,
        failure: `${webhookUrl}/checkout/failure`,
        pending: `${webhookUrl}/checkout/pending`,
      },
      auto_return: 'approved',
      notification_url: `${webhookUrl}/api/webhook/mercado_pago`,
      external_reference: JSON.stringify({ 
        planType, 
        email,
        userId: userId || 'guest_' + Date.now(),
        timestamp: Date.now()
      }),
      metadata: {
        email,
        planType,
        userId: userId || 'guest_' + Date.now()
      },
    };

    console.log('✅ Dados válidos, checkout pode prosseguir');

    return NextResponse.json({
      success: true,
      message: 'Checkout validation passed',
      plan: plan,
      preferenceData: preferenceData,
      config: {
        hasToken: !!mercadoPagoToken,
        hasWebhookUrl: !!webhookUrl,
        webhookUrl: webhookUrl
      }
    });

  } catch (error) {
    console.error('💥 Erro no teste de checkout:', error);
    return NextResponse.json({ 
      error: 'Erro interno no teste',
      detail: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Teste de checkout',
    usage: 'POST com { "planType": "monthly", "email": "test@example.com", "userId": "optional" }',
    validPlans: ['monthly', 'quarterly', 'yearly']
  });
}