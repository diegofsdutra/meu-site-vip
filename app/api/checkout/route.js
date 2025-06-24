import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { planType, email } = body;

    console.log('🛒 Iniciando checkout para:', email, 'plano:', planType);

    const plans = {
      monthly: { title: 'VIP 1 Mês', price: 7.70, days: 30 },
      quarterly: { title: 'VIP 3 Meses', price: 19.90, days: 90 },
      yearly: { title: 'VIP 1 Ano', price: 59.90, days: 365 },
    };

    const plan = plans[planType];
    if (!plan) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const mercadoPagoToken = process.env.MERCADO_PAGO_TOKEN || 'APP_USR-5004009313003728-061315-c81aaefb6eb2221c9b902dfbd00a8aa7-167454602';
    const webhookUrl = 'https://seven-oranges-greet.loca.lt';  // Novo tunnel

    const fullWebhookUrl = `${webhookUrl}/api/webhook/mercado_pago`;

    console.log('🔗 Configurações:', {
      webhookUrl: fullWebhookUrl,
      hasToken: true,
      tokenLength: mercadoPagoToken.length,
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
          timestamp: Date.now()
        }),
        metadata: {
          email,
          planType
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
