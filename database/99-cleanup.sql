-- ============================================================================
-- SCRIPT DE LIMPEZA E MANUTENÇÃO DO BANCO DE DADOS
-- Use com CUIDADO - Este script pode deletar dados!
-- ============================================================================

-- ============================================================================
-- ATENÇÃO: LEIA ANTES DE EXECUTAR
-- ============================================================================

/*
  ESTE SCRIPT CONTÉM COMANDOS PERIGOSOS!
  
  ⚠️  CUIDADOS:
  - NÃO execute em produção sem backup
  - Descomente apenas as seções que você precisa
  - Teste primeiro em ambiente de desenvolvimento
  - Alguns comandos são IRREVERSÍVEIS
  
  FUNCIONALIDADES:
  1. Limpeza de dados antigos
  2. Reset completo do banco (PERIGOSO!)
  3. Manutenção de performance
  4. Comandos de debug e teste
*/

-- ============================================================================
-- SEÇÃO 1: LIMPEZA DE DADOS ANTIGOS (SEGURO)
-- ============================================================================

-- Limpar pagamentos cancelados/rejeitados antigos (mais de 1 ano)
/*
DELETE FROM vip_payments 
WHERE webhook_received_at < NOW() - INTERVAL '365 days'
  AND payment_status IN ('cancelled', 'rejected', 'refunded', 'charged_back');
*/

-- Limpar registros VIP não aprovados antigos (mais de 6 meses)
/*
DELETE FROM usuarios_vip 
WHERE created_at < NOW() - INTERVAL '180 days'
  AND pagamento_aprovado = false;
*/

-- Limpar tentativas de processamento antigas
/*
UPDATE vip_payments 
SET last_processing_error = NULL,
    processing_attempts = 0
WHERE last_processing_error IS NOT NULL 
  AND updated_at < NOW() - INTERVAL '30 days';
*/

-- ============================================================================
-- SEÇÃO 2: MANUTENÇÃO DE PERFORMANCE (RECOMENDADO)
-- ============================================================================

-- Reindexar tabelas para melhor performance
/*
REINDEX TABLE profiles;
REINDEX TABLE usuarios_vip;
REINDEX TABLE vip_payments;
*/

-- Atualizar estatísticas das tabelas
/*
ANALYZE profiles;
ANALYZE usuarios_vip;
ANALYZE vip_payments;
*/

-- Limpar planos de execução antigos
/*
SELECT pg_stat_reset();
*/

-- ============================================================================
-- SEÇÃO 3: VERIFICAÇÕES E CORREÇÕES (SEGURO)
-- ============================================================================

-- Verificar VIPs expirados que ainda estão marcados como ativos
SELECT 'VIPs expirados que precisam ser desativados:' as verificacao;
SELECT email, vip_expires_at, 
       EXTRACT(DAYS FROM NOW() - vip_expires_at) as dias_expirado
FROM profiles 
WHERE is_vip = true 
  AND vip_expires_at <= NOW()
ORDER BY vip_expires_at;

-- Corrigir VIPs expirados (descomente para executar)
/*
UPDATE profiles 
SET is_vip = false 
WHERE is_vip = true 
  AND vip_expires_at <= NOW();
*/

-- Verificar pagamentos aprovados não processados
SELECT 'Pagamentos aprovados não processados:' as verificacao;
SELECT payment_id, user_id, amount, webhook_received_at, processing_attempts
FROM vip_payments 
WHERE payment_status = 'approved' 
  AND processed = false
ORDER BY webhook_received_at DESC;

-- Reprocessar pagamentos aprovados não processados (descomente para executar)
/*
UPDATE vip_payments 
SET processed = false,
    processing_attempts = 0,
    last_processing_error = NULL
WHERE payment_status = 'approved' 
  AND processed = false
  AND processing_attempts > 0;
*/

-- Verificar inconsistências entre profiles e usuarios_vip
SELECT 'Inconsistências de dados VIP:' as verificacao;
SELECT p.email, p.is_vip, p.vip_expires_at, 
       COUNT(uv.id) as registros_vip_ativos
FROM profiles p
LEFT JOIN usuarios_vip uv ON p.email = uv.email 
  AND uv.pagamento_aprovado = true 
  AND uv.data_expiraca > NOW()
WHERE p.is_vip = true
GROUP BY p.email, p.is_vip, p.vip_expires_at
HAVING COUNT(uv.id) = 0;

-- ============================================================================
-- SEÇÃO 4: COMANDOS DE DEBUG (SEGURO)
-- ============================================================================

-- Estatísticas gerais do sistema
SELECT 'ESTATÍSTICAS DO SISTEMA:' as tipo;

SELECT 
  'Total de usuários' as metrica,
  COUNT(*) as valor
FROM profiles
UNION ALL
SELECT 
  'Usuários VIP ativos' as metrica,
  COUNT(*) as valor
FROM profiles 
WHERE is_vip = true AND vip_expires_at > NOW()
UNION ALL
SELECT 
  'Total de pagamentos' as metrica,
  COUNT(*) as valor
FROM vip_payments
UNION ALL
SELECT 
  'Pagamentos aprovados' as metrica,
  COUNT(*) as valor
FROM vip_payments 
WHERE payment_status = 'approved'
UNION ALL
SELECT 
  'Receita total (R$)' as metrica,
  ROUND(SUM(amount) / 100.0, 2) as valor
FROM vip_payments 
WHERE payment_status = 'approved';

-- Últimos 10 pagamentos
SELECT 'ÚLTIMOS 10 PAGAMENTOS:' as tipo;
SELECT 
  p.email,
  vp.payment_id,
  vp.amount / 100.0 as valor_reais,
  vp.payment_method,
  vp.payment_status,
  vp.webhook_received_at,
  vp.processed
FROM vip_payments vp
JOIN profiles p ON vp.user_id = p.id
ORDER BY vp.webhook_received_at DESC
LIMIT 10;

-- VIPs que expiram nos próximos 7 dias
SELECT 'VIPs EXPIRANDO EM 7 DIAS:' as tipo;
SELECT 
  email,
  name,
  vip_expires_at,
  EXTRACT(DAYS FROM vip_expires_at - NOW()) as dias_restantes
FROM profiles 
WHERE is_vip = true 
  AND vip_expires_at > NOW()
  AND vip_expires_at <= NOW() + INTERVAL '7 days'
ORDER BY vip_expires_at;

-- ============================================================================
-- SEÇÃO 5: COMANDOS DE TESTE (SEGURO)
-- ============================================================================

-- Testar função de cálculo de duração VIP
SELECT 'TESTE DE CÁLCULO DE DURAÇÃO:' as tipo;
SELECT 
  '770 centavos (R$ 7,70)' as valor,
  * 
FROM calculate_vip_duration(770)
UNION ALL
SELECT 
  '1990 centavos (R$ 19,90)' as valor,
  * 
FROM calculate_vip_duration(1990)
UNION ALL
SELECT 
  '5990 centavos (R$ 59,90)' as valor,
  * 
FROM calculate_vip_duration(5990);

-- Testar relatório VIP
SELECT 'RELATÓRIO VIP ATUAL:' as tipo;
SELECT * FROM get_vip_report();

-- Testar função de desativação de VIPs expirados (apenas simulação)
SELECT 'SIMULAÇÃO DE DESATIVAÇÃO DE VIPs EXPIRADOS:' as tipo;
SELECT 
  COUNT(*) as vips_que_seriam_desativados,
  array_agg(email) as emails_afetados
FROM profiles 
WHERE is_vip = true 
  AND vip_expires_at <= NOW();

-- ============================================================================
-- SEÇÃO 6: RESET COMPLETO (⚠️ EXTREMAMENTE PERIGOSO!)
-- ============================================================================

/*
⚠️⚠️⚠️ ATENÇÃO: COMANDOS DESTRUTIVOS ⚠️⚠️⚠️

Os comandos abaixo DELETAM TODOS OS DADOS e recriam as tabelas.
USE APENAS EM DESENVOLVIMENTO!
NÃO execute em produção sem backup completo!

-- DESCOMENTE APENAS SE TIVER CERTEZA:

-- Deletar todas as views
DROP VIEW IF EXISTS my_vip_info CASCADE;
DROP VIEW IF EXISTS historico_pagamentos CASCADE;
DROP VIEW IF EXISTS vips_ativos CASCADE;

-- Deletar todas as funções
DROP FUNCTION IF EXISTS activate_vip_after_payment CASCADE;
DROP FUNCTION IF EXISTS calculate_vip_duration CASCADE;
DROP FUNCTION IF EXISTS check_user_vip_status CASCADE;
DROP FUNCTION IF EXISTS deactivate_expired_vips CASCADE;
DROP FUNCTION IF EXISTS activate_vip_manually CASCADE;
DROP FUNCTION IF EXISTS get_vip_report CASCADE;
DROP FUNCTION IF EXISTS get_my_vip_status CASCADE;
DROP FUNCTION IF EXISTS get_my_payment_history CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS create_profile_for_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Deletar todas as tabelas
DROP TABLE IF EXISTS vip_payments CASCADE;
DROP TABLE IF EXISTS usuarios_vip CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Após executar os comandos acima, execute novamente o script 00-setup-master.sql
*/

-- ============================================================================
-- SEÇÃO 7: COMANDOS ÚTEIS PARA DESENVOLVIMENTO
-- ============================================================================

-- Inserir usuário de teste (descomente se necessário)
/*
INSERT INTO profiles (id, email, name, is_vip, vip_expires_at)
VALUES (
  gen_random_uuid(),
  'teste' || floor(random() * 1000) || '@exemplo.com',
  'Usuário Teste',
  true,
  NOW() + INTERVAL '30 days'
);
*/

-- Simular pagamento de teste (descomente se necessário)
/*
WITH new_user AS (
  INSERT INTO profiles (id, email, name)
  VALUES (gen_random_uuid(), 'teste_pagamento@exemplo.com', 'Teste Pagamento')
  RETURNING id, email
)
INSERT INTO vip_payments (user_id, payment_id, amount, payment_method, payment_status, processed)
SELECT id, 'TEST_' || extract(epoch from now()), 770, 'pix', 'approved', false
FROM new_user;
*/

-- Forçar processamento de todos os pagamentos não processados
/*
UPDATE vip_payments 
SET processed = false,
    processing_attempts = 0
WHERE payment_status = 'approved' 
  AND processed = true;
*/

-- ============================================================================
-- SEÇÃO 8: BACKUP E RESTORE (INFORMATIVO)
-- ============================================================================

/*
COMANDOS PARA BACKUP (execute no terminal, não no SQL Editor):

-- Backup completo
pg_dump "postgresql://user:pass@host:port/database" > backup_completo.sql

-- Backup apenas das tabelas VIP
pg_dump "postgresql://user:pass@host:port/database" \
  --table=profiles \
  --table=usuarios_vip \
  --table=vip_payments \
  > backup_vip_tables.sql

-- Backup apenas dos dados (sem estrutura)
pg_dump "postgresql://user:pass@host:port/database" \
  --data-only \
  --table=profiles \
  --table=usuarios_vip \
  --table=vip_payments \
  > backup_vip_data.sql

COMANDOS PARA RESTORE:

-- Restore completo
psql "postgresql://user:pass@host:port/database" < backup_completo.sql

-- Restore apenas dados
psql "postgresql://user:pass@host:port/database" < backup_vip_data.sql
*/

-- ============================================================================
-- SCRIPT DE LIMPEZA CONCLUÍDO
-- ============================================================================

SELECT '🧹 Script de limpeza carregado - Descomente apenas as seções necessárias!' as aviso;
SELECT 'LEMBRE-SE: Sempre faça backup antes de executar comandos destrutivos!' as lembrete;