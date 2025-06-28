-- ============================================================================
-- SCRIPT 2: TRIGGERS E FUNÇÕES PARA INTEGRAÇÃO COM MERCADO PAGO
-- Execute este script APÓS o script 01-create-tables.sql
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO PARA DETERMINAR DURAÇÃO DO VIP BASEADO NO VALOR PAGO
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_vip_duration(amount_cents INTEGER)
RETURNS TABLE (days INTEGER, plan_type TEXT) AS $$
BEGIN
  -- Valores em centavos: R$ 7,70 = 770, R$ 19,90 = 1990, R$ 59,90 = 5990
  
  IF amount_cents <= 1000 THEN
    -- Até R$ 10,00 = 1 mês
    RETURN QUERY SELECT 30 as days, 'mensal'::TEXT as plan_type;
  ELSIF amount_cents <= 2500 THEN
    -- Até R$ 25,00 = 3 meses
    RETURN QUERY SELECT 90 as days, 'trimestral'::TEXT as plan_type;
  ELSE
    -- Mais que R$ 25,00 = 1 ano
    RETURN QUERY SELECT 365 as days, 'anual'::TEXT as plan_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION calculate_vip_duration IS 'Calcula duração do VIP baseado no valor pago em centavos';

-- ============================================================================
-- 2. FUNÇÃO PRINCIPAL: ATIVAR VIP APÓS PAGAMENTO APROVADO
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_vip_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_record RECORD;
  vip_duration_record RECORD;
  new_expiry_date TIMESTAMP WITH TIME ZONE;
  vip_record_id INTEGER;
BEGIN
  -- Só processar se o pagamento mudou para 'approved' e ainda não foi processado
  IF NEW.payment_status = 'approved' AND 
     (OLD.payment_status != 'approved' OR OLD.processed = false) AND 
     NEW.processed = false THEN
    
    -- Log da ativação
    RAISE NOTICE 'Iniciando ativação VIP para pagamento ID: %', NEW.payment_id;
    
    -- Buscar dados do usuário
    SELECT * INTO user_profile_record
    FROM profiles 
    WHERE id = NEW.user_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado: %', NEW.user_id;
    END IF;
    
    -- Calcular duração do VIP baseado no valor pago
    SELECT * INTO vip_duration_record
    FROM calculate_vip_duration(NEW.amount);
    
    -- Calcular nova data de expiração
    -- Se usuário já tem VIP ativo, estender a partir da data atual de expiração
    -- Se não tem VIP ou já expirou, começar a partir de agora
    IF user_profile_record.is_vip = true AND 
       user_profile_record.vip_expires_at > NOW() THEN
      new_expiry_date := user_profile_record.vip_expires_at + (vip_duration_record.days || ' days')::INTERVAL;
    ELSE
      new_expiry_date := NOW() + (vip_duration_record.days || ' days')::INTERVAL;
    END IF;
    
    -- Atualizar perfil do usuário
    UPDATE profiles 
    SET 
      is_vip = true,
      vip_expires_at = new_expiry_date,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Criar/atualizar registro na tabela usuarios_vip
    INSERT INTO usuarios_vip (
      email,
      user_id,
      plano,
      data_inicio,
      data_expiraca,
      pagamento_aprovado,
      payment_id,
      payment_method,
      amount_paid,
      source
    ) VALUES (
      user_profile_record.email,
      NEW.user_id,
      vip_duration_record.plan_type,
      NOW(),
      new_expiry_date,
      true,
      NEW.payment_id,
      NEW.payment_method,
      NEW.amount,
      'mercado_pago'
    )
    ON CONFLICT (email) 
    WHERE pagamento_aprovado = true AND data_expiraca > NOW()
    DO UPDATE SET
      data_expiraca = new_expiry_date,
      payment_id = NEW.payment_id,
      amount_paid = NEW.amount,
      updated_at = NOW();
    
    GET DIAGNOSTICS vip_record_id = PG_EXCEPTION_CONTEXT;
    
    -- Marcar pagamento como processado
    UPDATE vip_payments 
    SET 
      processed = true,
      vip_record_id = vip_record_id,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Log de sucesso
    RAISE NOTICE 'VIP ativado com sucesso para usuário % até %', 
      user_profile_record.email, new_expiry_date;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    RAISE NOTICE 'Erro ao ativar VIP para pagamento %: %', NEW.payment_id, SQLERRM;
    
    -- Atualizar contador de tentativas e erro
    UPDATE vip_payments 
    SET 
      processing_attempts = processing_attempts + 1,
      last_processing_error = SQLERRM,
      updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Re-raise o erro para debug
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION activate_vip_after_payment IS 'Ativa VIP automaticamente quando pagamento é aprovado';

-- ============================================================================
-- 3. TRIGGER PARA ATIVAÇÃO AUTOMÁTICA DE VIP
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_activate_vip ON vip_payments;
CREATE TRIGGER trigger_activate_vip
  AFTER INSERT OR UPDATE ON vip_payments
  FOR EACH ROW
  EXECUTE FUNCTION activate_vip_after_payment();

-- ============================================================================
-- 4. FUNÇÃO PARA VERIFICAR E DESATIVAR VIPs EXPIRADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_expired_vips()
RETURNS TABLE (
  deactivated_count INTEGER,
  users_affected TEXT[]
) AS $$
DECLARE
  affected_users TEXT[] := '{}';
  deactivated_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Buscar usuários com VIP expirado
  FOR user_record IN 
    SELECT id, email, vip_expires_at
    FROM profiles 
    WHERE is_vip = true 
      AND vip_expires_at <= NOW()
  LOOP
    -- Desativar VIP no perfil
    UPDATE profiles 
    SET 
      is_vip = false,
      updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Adicionar à lista de usuários afetados
    affected_users := array_append(affected_users, user_record.email);
    deactivated_count := deactivated_count + 1;
    
    -- Log da desativação
    RAISE NOTICE 'VIP desativado para usuário %: expirou em %', 
      user_record.email, user_record.vip_expires_at;
  END LOOP;
  
  RETURN QUERY SELECT deactivated_count, affected_users;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION deactivate_expired_vips IS 'Desativa VIPs expirados e retorna relatório';

-- ============================================================================
-- 5. FUNÇÃO PARA VERIFICAR STATUS VIP DE UM USUÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_vip_status(user_email TEXT)
RETURNS TABLE (
  is_vip BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  plan_type TEXT,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  total_payments INTEGER
) AS $$
DECLARE
  profile_record RECORD;
  last_vip_record RECORD;
  payment_count INTEGER;
BEGIN
  -- Buscar perfil do usuário
  SELECT * INTO profile_record
  FROM profiles 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    -- Usuário não encontrado
    RETURN QUERY SELECT false, NULL::TIMESTAMP WITH TIME ZONE, 0, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 0;
    RETURN;
  END IF;
  
  -- Buscar último registro VIP
  SELECT * INTO last_vip_record
  FROM usuarios_vip 
  WHERE email = user_email 
    AND pagamento_aprovado = true
  ORDER BY data_expiraca DESC 
  LIMIT 1;
  
  -- Contar total de pagamentos
  SELECT COUNT(*) INTO payment_count
  FROM vip_payments 
  WHERE user_id = profile_record.id 
    AND payment_status = 'approved';
  
  -- Retornar status
  RETURN QUERY SELECT 
    profile_record.is_vip,
    profile_record.vip_expires_at,
    CASE 
      WHEN profile_record.is_vip AND profile_record.vip_expires_at > NOW() 
      THEN EXTRACT(DAYS FROM profile_record.vip_expires_at - NOW())::INTEGER
      ELSE 0
    END,
    COALESCE(last_vip_record.plano, 'nenhum'),
    last_vip_record.created_at,
    payment_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION check_user_vip_status IS 'Verifica status VIP completo de um usuário';

-- ============================================================================
-- 6. FUNÇÃO PARA ATIVAR VIP MANUALMENTE (ADMIN)
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_vip_manually(
  user_email TEXT,
  duration_days INTEGER DEFAULT 30,
  admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_record RECORD;
  new_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar usuário
  SELECT * INTO user_record
  FROM profiles 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Usuário não encontrado: ' || user_email, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Calcular nova data de expiração
  IF user_record.is_vip = true AND user_record.vip_expires_at > NOW() THEN
    new_expiry_date := user_record.vip_expires_at + (duration_days || ' days')::INTERVAL;
  ELSE
    new_expiry_date := NOW() + (duration_days || ' days')::INTERVAL;
  END IF;
  
  -- Atualizar perfil
  UPDATE profiles 
  SET 
    is_vip = true,
    vip_expires_at = new_expiry_date,
    updated_at = NOW()
  WHERE id = user_record.id;
  
  -- Criar registro na tabela usuarios_vip
  INSERT INTO usuarios_vip (
    email,
    user_id,
    plano,
    data_inicio,
    data_expiraca,
    pagamento_aprovado,
    source,
    notes
  ) VALUES (
    user_email,
    user_record.id,
    CASE 
      WHEN duration_days <= 35 THEN 'mensal'
      WHEN duration_days <= 100 THEN 'trimestral'
      ELSE 'anual'
    END,
    NOW(),
    new_expiry_date,
    true,
    'manual',
    admin_notes
  );
  
  RETURN QUERY SELECT true, 'VIP ativado com sucesso', new_expiry_date;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Erro: ' || SQLERRM, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION activate_vip_manually IS 'Ativa VIP manualmente para um usuário (uso administrativo)';

-- ============================================================================
-- 7. FUNÇÃO PARA RELATÓRIO DE VIPS ATIVOS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vip_report()
RETURNS TABLE (
  total_vips_ativos INTEGER,
  total_vips_expirados INTEGER,
  receita_total_centavos BIGINT,
  receita_mes_atual_centavos BIGINT,
  novos_vips_mes INTEGER,
  planos_populares JSONB
) AS $$
DECLARE
  vips_ativos INTEGER;
  vips_expirados INTEGER;
  receita_total BIGINT;
  receita_mes BIGINT;
  novos_mes INTEGER;
  planos_stats JSONB;
BEGIN
  -- VIPs ativos
  SELECT COUNT(*) INTO vips_ativos
  FROM profiles 
  WHERE is_vip = true AND vip_expires_at > NOW();
  
  -- VIPs expirados
  SELECT COUNT(*) INTO vips_expirados
  FROM profiles 
  WHERE is_vip = false AND vip_expires_at IS NOT NULL;
  
  -- Receita total
  SELECT COALESCE(SUM(amount), 0) INTO receita_total
  FROM vip_payments 
  WHERE payment_status = 'approved';
  
  -- Receita do mês atual
  SELECT COALESCE(SUM(amount), 0) INTO receita_mes
  FROM vip_payments 
  WHERE payment_status = 'approved' 
    AND webhook_received_at >= date_trunc('month', NOW());
  
  -- Novos VIPs do mês
  SELECT COUNT(*) INTO novos_mes
  FROM usuarios_vip 
  WHERE pagamento_aprovado = true 
    AND created_at >= date_trunc('month', NOW());
  
  -- Estatísticas de planos
  SELECT jsonb_object_agg(plano, count) INTO planos_stats
  FROM (
    SELECT plano, COUNT(*) as count
    FROM usuarios_vip 
    WHERE pagamento_aprovado = true 
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY plano
  ) t;
  
  RETURN QUERY SELECT 
    vips_ativos,
    vips_expirados,
    receita_total,
    receita_mes,
    novos_mes,
    COALESCE(planos_stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION get_vip_report IS 'Gera relatório completo de VIPs e receita';

-- ============================================================================
-- 8. FUNÇÃO PARA LIMPEZA DE DADOS ANTIGOS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 365)
RETURNS TABLE (
  deleted_payments INTEGER,
  deleted_vip_records INTEGER
) AS $$
DECLARE
  deleted_payments_count INTEGER;
  deleted_vip_count INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Deletar pagamentos antigos cancelados/rejeitados
  DELETE FROM vip_payments 
  WHERE webhook_received_at < cutoff_date 
    AND payment_status IN ('cancelled', 'rejected', 'refunded');
  
  GET DIAGNOSTICS deleted_payments_count = ROW_COUNT;
  
  -- Deletar registros VIP antigos não aprovados
  DELETE FROM usuarios_vip 
  WHERE created_at < cutoff_date 
    AND pagamento_aprovado = false;
  
  GET DIAGNOSTICS deleted_vip_count = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_payments_count, deleted_vip_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION cleanup_old_data IS 'Remove dados antigos desnecessários';

-- ============================================================================
-- 9. VIEWS ÚTEIS PARA CONSULTAS
-- ============================================================================

-- View para VIPs ativos
CREATE OR REPLACE VIEW vips_ativos AS
SELECT 
  p.email,
  p.name,
  p.vip_expires_at,
  uv.plano,
  uv.data_inicio,
  EXTRACT(DAYS FROM p.vip_expires_at - NOW()) as dias_restantes
FROM profiles p
JOIN usuarios_vip uv ON p.email = uv.email
WHERE p.is_vip = true 
  AND p.vip_expires_at > NOW()
  AND uv.pagamento_aprovado = true
ORDER BY p.vip_expires_at;

-- View para histórico de pagamentos
CREATE OR REPLACE VIEW historico_pagamentos AS
SELECT 
  p.email,
  vp.payment_id,
  vp.amount / 100.0 as valor_reais,
  vp.payment_method,
  vp.payment_status,
  vp.webhook_received_at,
  vp.processed
FROM profiles p
JOIN vip_payments vp ON p.id = vp.user_id
ORDER BY vp.webhook_received_at DESC;

-- ============================================================================
-- GRANTS DE PERMISSÃO
-- ============================================================================

-- Permitir que funções sejam executadas por usuários autenticados
GRANT EXECUTE ON FUNCTION check_user_vip_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_vip_duration TO authenticated;

-- Funções administrativas apenas para service_role
GRANT EXECUTE ON FUNCTION activate_vip_manually TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_expired_vips TO service_role;
GRANT EXECUTE ON FUNCTION get_vip_report TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_data TO service_role;

-- Views para consulta
GRANT SELECT ON vips_ativos TO authenticated, service_role;
GRANT SELECT ON historico_pagamentos TO service_role;

-- ============================================================================
-- SCRIPT CONCLUÍDO
-- ============================================================================

-- Testar uma das funções
SELECT * FROM get_vip_report();

RAISE NOTICE 'Script de triggers e funções executado com sucesso!';