import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { planType, email, userId } = body;

    console.log('🛒 Iniciando checkout para:', email, 'plano:', planType, 'userId:', userId);

    // Validar apenas os dados mínimos necessários
    if (!email || !planType) {
      return NextResponse.json({ 
        error: 'Email e tipo de plano são obrigatórios' 
      }, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Email inválido' 
      }, { status: 400 });
    }

    const plans = {
      monthly: { title: 'VIP 1 Mês', price: 7.70, days: 30 },
      quarterly: { title: 'VIP 3 Meses', price: 19.90, days: 90 },
      yearly: { title: 'VIP 1 Ano', price: 59.90, days: 365 },
    };

    const plan = plans[planType];
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const mercadoPagoToken = process.env.MERCADO_PAGO_TOKEN;
    const webhookUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!mercadoPagoToken) {
      console.error('❌ MERCADO_PAGO_TOKEN not configured');
      return NextResponse.json({ 
        error: 'Payment system not configured' 
      }, { status: 500 });
    }

    if (!webhookUrl) {
      console.error('❌ Webhook URL not configured');
      return NextResponse.json({ 
        error: 'Webhook configuration missing' 
      }, { status: 500 });
    }

    const fullWebhookUrl = `${webhookUrl}/api/webhook/mercado_pago`;

    console.log('🔗 Configurações:', {
      webhookUrl: fullWebhookUrl,
      hasToken: !!mercadoPagoToken,
      usingEnvToken: !!process.env.MERCADO_PAGO_TOKEN
    });

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        notification_url: fullWebhookUrl,
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
      }),
    });

    const preference = await response.json();

    if (!response.ok) {
      console.error('❌ Erro na resposta do Mercado Pago:', preference);
      return NextResponse.json({ 
        error: 'Erro ao criar preferência', 
        detail: preference 
      }, { status: 500 });
    }

    console.log('✅ Preferência criada com sucesso:', preference.id);

    return NextResponse.json({ 
      init_point: preference.init_point,
      id: preference.id
    });

  } catch (error) {
    console.error('💥 Erro ao criar preferência:', error);
    return NextResponse.json({ 
      error: 'Erro ao criar preferência', 
      detail: error.message 
    }, { status: 500 });
  }
}
