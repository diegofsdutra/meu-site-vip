-- Script para criar um usuário VIP de teste

-- 1. Verificar usuários existentes
SELECT 
  'USUÁRIOS EXISTENTES:' as info,
  id,
  email,
  is_vip,
  vip_expires_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Tornar um usuário específico VIP (substitua pelo email do usuário teste)
-- Exemplo: tornar 'asas5@gmail.com' VIP por 30 dias
UPDATE profiles 
SET 
  is_vip = true,
  vip_expires_at = (NOW() + INTERVAL '30 days')::timestamp,
  updated_at = NOW()
WHERE email = 'asas5@gmail.com';

-- 3. Verificar se foi atualizado
SELECT 
  'USUÁRIO VIP CRIADO:' as info,
  id,
  email,
  is_vip,
  vip_expires_at,
  CASE 
    WHEN vip_expires_at > NOW() THEN '✅ VIP ATIVO'
    ELSE '❌ VIP EXPIRADO'
  END as status
FROM profiles 
WHERE email = 'asas5@gmail.com';

-- 4. Também criar registro na tabela usuarios_vip para consistência
INSERT INTO usuarios_vip (
  email,
  user_id,
  plano,
  data_inicio,
  data_expiraca,
  pagamento_aprovado,
  is_active,
  payment_id,
  payment_method,
  amount_paid,
  source,
  created_at,
  updated_at
)
SELECT 
  p.email,
  p.id,
  'mensal',
  NOW(),
  (NOW() + INTERVAL '30 days')::timestamp,
  true,
  true,
  'test_payment_' || extract(epoch from now())::text,
  'manual_test',
  770, -- R$ 7,70 em centavos
  'manual_creation',
  NOW(),
  NOW()
FROM profiles p
WHERE p.email = 'asas5@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_vip uv 
    WHERE uv.email = p.email 
    AND uv.pagamento_aprovado = true
  );

-- 5. Verificar resultado final
SELECT 
  'VERIFICAÇÃO FINAL:' as info,
  'profiles' as tabela,
  email,
  is_vip,
  vip_expires_at
FROM profiles 
WHERE email = 'asas5@gmail.com'
UNION ALL
SELECT 
  'VERIFICAÇÃO FINAL:' as info,
  'usuarios_vip' as tabela,
  email,
  is_active::text as is_vip,
  data_expiraca::text as vip_expires_at
FROM usuarios_vip 
WHERE email = 'asas5@gmail.com'
  AND pagamento_aprovado = true;

-- 6. Mostrar instruções
SELECT '============================================================================' as divisor;
SELECT 'USUÁRIO VIP DE TESTE CRIADO!' as titulo;
SELECT '============================================================================' as divisor2;
SELECT 'Email: asas5@gmail.com' as instrucao_1;
SELECT 'Status: VIP por 30 dias' as instrucao_2;
SELECT 'Para testar: faça login com asas5@gmail.com e veja se aparecem todas as películas' as instrucao_3;