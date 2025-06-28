import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, planType, amount } = await req.json();

    console.log('🧪 Simulando webhook do Mercado Pago');

    // Simular dados de um webhook real do Mercado Pago
    const mockWebhookData = {
      type: 'payment',
      data: {
        id: 'TEST_' + Date.now()
      }
    };

    // Simular dados de um pagamento aprovado
    const mockPaymentData = {
      id: 'TEST_' + Date.now(),
      status: 'approved',
      transaction_amount: amount || 7.70,
      currency_id: 'BRL',
      payment_method_id: 'pix',
      payment_type_id: 'bank_transfer',
      date_created: new Date().toISOString(),
      date_approved: new Date().toISOString(),
      payer: {
        email: email
      },
      external_reference: JSON.stringify({
        planType: planType || 'monthly',
        email: email,
        userId: 'test_user_' + Date.now(),
        timestamp: Date.now()
      }),
      metadata: {
        planType: planType || 'monthly',
        email: email
      }
    };

    console.log('📦 Dados simulados:', {
      webhook: mockWebhookData,
      payment: mockPaymentData
    });

    // Chamar o webhook real
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/mercado_pago`;
    
    // Simular o webhook sendo chamado
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature',
        'x-request-id': 'test-request-' + Date.now()
      },
      body: JSON.stringify(mockWebhookData)
    });

    const webhookResult = await webhookResponse.json();

    console.log('🔔 Resposta do webhook:', webhookResult);

    return NextResponse.json({
      success: true,
      message: 'Teste de webhook executado',
      mockData: {
        webhook: mockWebhookData,
        payment: mockPaymentData
      },
      webhookResponse: {
        status: webhookResponse.status,
        result: webhookResult
      }
    });

  } catch (error) {
    console.error('💥 Erro no teste de webhook:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Teste de webhook Mercado Pago',
    usage: 'POST com { "email": "test@example.com", "planType": "monthly", "amount": 7.70 }',
    description: 'Simula um pagamento aprovado e testa o webhook'
  });
}