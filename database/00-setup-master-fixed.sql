-- ============================================================================
-- SCRIPT MASTER CORRIGIDO: SETUP COMPLETO DO SUPABASE PARA TELA PRIME EXPRESS
-- Execute este script para configuração completa do banco de dados
-- CORREÇÃO: Removido erro de função não IMMUTABLE em índices
-- ============================================================================

-- ============================================================================
-- INFORMAÇÕES IMPORTANTES
-- ============================================================================

/*
  INSTRUÇÕES DE INSTALAÇÃO:
  
  1. Acesse o Supabase Dashboard
  2. Vá para SQL Editor
  3. Execute este script INTEIRO de uma vez
  4. Aguarde a conclusão (pode levar alguns segundos)
  5. Verifique se não houve erros na saída
  
  CORREÇÕES APLICADAS:
  ✓ Removido índice único com NOW() (não IMMUTABLE)
  ✓ Substituído por trigger para controlar VIP único ativo
  ✓ Mantida toda funcionalidade de ativação automática
  ✓ Preservado RLS e segurança
  
  COMPATIBILIDADE:
  - Supabase (PostgreSQL 15+)
  - Mercado Pago Webhooks
  - Sistema de autenticação Supabase Auth
*/

-- ============================================================================
-- PARTE 1: CRIAÇÃO DAS TABELAS
-- ============================================================================

-- Limpar tabelas existentes se necessário (CUIDADO EM PRODUÇÃO!)
-- Descomente apenas se quiser recriar tudo do zero
/*
DROP TABLE IF EXISTS vip_payments CASCADE;
DROP TABLE IF EXISTS usuarios_vip CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP VIEW IF EXISTS vips_ativos CASCADE;
DROP VIEW IF EXISTS historico_pagamentos CASCADE;
DROP VIEW IF EXISTS my_vip_info CASCADE;
*/

-- Tabela de perfis (integrada com Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  first_purchase_bonus_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários VIP (compatibilidade + funcionalidades extras)
CREATE TABLE IF NOT EXISTS usuarios_vip (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plano TEXT NOT NULL DEFAULT 'mensal' CHECK (plano IN ('mensal', 'trimestral', 'anual')),
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_expiraca TIMESTAMP WITH TIME ZONE NOT NULL,
  pagamento_aprovado BOOLEAN DEFAULT FALSE,
  payment_id TEXT,
  payment_method TEXT,
  amount_paid INTEGER,
  source TEXT DEFAULT 'mercado_pago',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE, -- Campo para controlar registro ativo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (data_expiraca > data_inicio),
  CONSTRAINT valid_amount CHECK (amount_paid IS NULL OR amount_paid > 0)
);

-- Tabela de pagamentos (histórico detalhado)
CREATE TABLE IF NOT EXISTS vip_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vip_record_id INTEGER REFERENCES usuarios_vip(id) ON DELETE SET NULL,
  payment_id TEXT UNIQUE NOT NULL,
  external_reference TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  mercado_pago_data JSONB,
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_amount_payment CHECK (amount > 0),
  CONSTRAINT valid_attempts CHECK (processing_attempts >= 0)
);

-- ============================================================================
-- PARTE 2: ÍNDICES PARA PERFORMANCE (SEM FUNÇÕES VOLÁTEIS)
-- ============================================================================

-- Índices profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_vip ON profiles(is_vip);
CREATE INDEX IF NOT EXISTS idx_profiles_vip_expires ON profiles(vip_expires_at) WHERE is_vip = true;

-- Índices usuarios_vip
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_email ON usuarios_vip(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_user_id ON usuarios_vip(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_pagamento_aprovado ON usuarios_vip(pagamento_aprovado);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_data_expiraca ON usuarios_vip(data_expiraca);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_payment_id ON usuarios_vip(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_active ON usuarios_vip(email, pagamento_aprovado, data_expiraca) WHERE pagamento_aprovado = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_is_active ON usuarios_vip(is_active) WHERE is_active = true;

-- Índices vip_payments
CREATE INDEX IF NOT EXISTS idx_vip_payments_user_id ON vip_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_payment_id ON vip_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_status ON vip_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_vip_payments_processed ON vip_payments(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_vip_payments_webhook_received ON vip_payments(webhook_received_at);

-- Constraint unique simples (sem condições dinâmicas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_vip_email_payment_unique 
  ON usuarios_vip(email, payment_id) 
  WHERE pagamento_aprovado = true AND is_active = true;

-- ============================================================================
-- PARTE 3: FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_vip_updated_at ON usuarios_vip;
CREATE TRIGGER update_usuarios_vip_updated_at
  BEFORE UPDATE ON usuarios_vip FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vip_payments_updated_at ON vip_payments;
CREATE TRIGGER update_vip_payments_updated_at
  BEFORE UPDATE ON vip_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para criação automática de perfil
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- Função para calcular duração VIP
CREATE OR REPLACE FUNCTION calculate_vip_duration(amount_cents INTEGER)
RETURNS TABLE (days INTEGER, plan_type TEXT) AS $$
BEGIN
  IF amount_cents <= 1000 THEN
    RETURN QUERY SELECT 30 as days, 'mensal'::TEXT as plan_type;
  ELSIF amount_cents <= 2500 THEN
    RETURN QUERY SELECT 90 as days, 'trimestral'::TEXT as plan_type;
  ELSE
    RETURN QUERY SELECT 365 as days, 'anual'::TEXT as plan_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para desativar VIPs ativos antigos de um email
CREATE OR REPLACE FUNCTION deactivate_old_vip_records(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  -- Desativar todos os registros VIP ativos antigos do mesmo email
  UPDATE usuarios_vip 
  SET is_active = false
  WHERE email = user_email 
    AND pagamento_aprovado = true 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Função principal: ativar VIP após pagamento (CORRIGIDA)
CREATE OR REPLACE FUNCTION activate_vip_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_record RECORD;
  vip_duration_record RECORD;
  new_expiry_date TIMESTAMP WITH TIME ZONE;
  vip_record_id INTEGER;
BEGIN
  IF NEW.payment_status = 'approved' AND 
     (OLD.payment_status != 'approved' OR OLD.processed = false) AND 
     NEW.processed = false THEN
    
    SELECT * INTO user_profile_record FROM profiles WHERE id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Usuário não encontrado: %', NEW.user_id;
    END IF;
    
    SELECT * INTO vip_duration_record FROM calculate_vip_duration(NEW.amount);
    
    -- Calcular nova data de expiração
    IF user_profile_record.is_vip = true AND user_profile_record.vip_expires_at > NOW() THEN
      new_expiry_date := user_profile_record.vip_expires_at + (vip_duration_record.days || ' days')::INTERVAL;
    ELSE
      new_expiry_date := NOW() + (vip_duration_record.days || ' days')::INTERVAL;
    END IF;
    
    -- Atualizar perfil do usuário
    UPDATE profiles 
    SET is_vip = true, vip_expires_at = new_expiry_date, updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Desativar registros VIP antigos do mesmo email
    PERFORM deactivate_old_vip_records(user_profile_record.email);
    
    -- Criar novo registro VIP ativo
    INSERT INTO usuarios_vip (
      email, user_id, plano, data_inicio, data_expiraca, pagamento_aprovado, 
      payment_id, payment_method, amount_paid, source, is_active
    ) VALUES (
      user_profile_record.email, NEW.user_id, vip_duration_record.plan_type,
      NOW(), new_expiry_date, true, NEW.payment_id, NEW.payment_method, NEW.amount, 'mercado_pago', true
    );
    
    -- Obter ID do registro criado
    GET DIAGNOSTICS vip_record_id = PG_EXCEPTION_CONTEXT;
    
    -- Marcar pagamento como processado
    UPDATE vip_payments SET processed = true, vip_record_id = vip_record_id, updated_at = NOW() WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE vip_payments 
    SET processing_attempts = processing_attempts + 1, last_processing_error = SQLERRM, updated_at = NOW()
    WHERE id = NEW.id;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ativação automática de VIP
DROP TRIGGER IF EXISTS trigger_activate_vip ON vip_payments;
CREATE TRIGGER trigger_activate_vip
  AFTER INSERT OR UPDATE ON vip_payments FOR EACH ROW EXECUTE FUNCTION activate_vip_after_payment();

-- ============================================================================
-- PARTE 4: FUNÇÕES AUXILIARES
-- ============================================================================

-- Verificar status VIP
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
  SELECT * INTO profile_record FROM profiles WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMP WITH TIME ZONE, 0, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 0;
    RETURN;
  END IF;
  
  SELECT * INTO last_vip_record
  FROM usuarios_vip 
  WHERE email = user_email AND pagamento_aprovado = true AND is_active = true
  ORDER BY data_expiraca DESC LIMIT 1;
  
  SELECT COUNT(*) INTO payment_count
  FROM vip_payments WHERE user_id = profile_record.id AND payment_status = 'approved';
  
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

-- Desativar VIPs expirados
CREATE OR REPLACE FUNCTION deactivate_expired_vips()
RETURNS TABLE (deactivated_count INTEGER, users_affected TEXT[]) AS $$
DECLARE
  affected_users TEXT[] := '{}';
  deactivated_count INTEGER := 0;
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, vip_expires_at FROM profiles 
    WHERE is_vip = true AND vip_expires_at <= NOW()
  LOOP
    UPDATE profiles SET is_vip = false, updated_at = NOW() WHERE id = user_record.id;
    
    -- Desativar registros VIP expirados
    UPDATE usuarios_vip 
    SET is_active = false 
    WHERE email = user_record.email AND is_active = true AND data_expiraca <= NOW();
    
    affected_users := array_append(affected_users, user_record.email);
    deactivated_count := deactivated_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT deactivated_count, affected_users;
END;
$$ LANGUAGE plpgsql;

-- Ativar VIP manualmente
CREATE OR REPLACE FUNCTION activate_vip_manually(
  user_email TEXT,
  duration_days INTEGER DEFAULT 30,
  admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  user_record RECORD;
  new_expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO user_record FROM profiles WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Usuário não encontrado: ' || user_email, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  IF user_record.is_vip = true AND user_record.vip_expires_at > NOW() THEN
    new_expiry_date := user_record.vip_expires_at + (duration_days || ' days')::INTERVAL;
  ELSE
    new_expiry_date := NOW() + (duration_days || ' days')::INTERVAL;
  END IF;
  
  UPDATE profiles 
  SET is_vip = true, vip_expires_at = new_expiry_date, updated_at = NOW()
  WHERE id = user_record.id;
  
  -- Desativar registros antigos
  PERFORM deactivate_old_vip_records(user_email);
  
  -- Criar novo registro ativo
  INSERT INTO usuarios_vip (
    email, user_id, plano, data_inicio, data_expiraca, pagamento_aprovado, source, notes, is_active
  ) VALUES (
    user_email, user_record.id,
    CASE WHEN duration_days <= 35 THEN 'mensal' WHEN duration_days <= 100 THEN 'trimestral' ELSE 'anual' END,
    NOW(), new_expiry_date, true, 'manual', admin_notes, true
  );
  
  RETURN QUERY SELECT true, 'VIP ativado com sucesso', new_expiry_date;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Erro: ' || SQLERRM, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Relatório VIP
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
  SELECT COUNT(*) INTO vips_ativos FROM profiles WHERE is_vip = true AND vip_expires_at > NOW();
  SELECT COUNT(*) INTO vips_expirados FROM profiles WHERE is_vip = false AND vip_expires_at IS NOT NULL;
  SELECT COALESCE(SUM(amount), 0) INTO receita_total FROM vip_payments WHERE payment_status = 'approved';
  SELECT COALESCE(SUM(amount), 0) INTO receita_mes FROM vip_payments WHERE payment_status = 'approved' AND webhook_received_at >= date_trunc('month', NOW());
  SELECT COUNT(*) INTO novos_mes FROM usuarios_vip WHERE pagamento_aprovado = true AND created_at >= date_trunc('month', NOW());
  
  SELECT jsonb_object_agg(plano, count) INTO planos_stats
  FROM (SELECT plano, COUNT(*) as count FROM usuarios_vip WHERE pagamento_aprovado = true AND created_at >= NOW() - INTERVAL '30 days' GROUP BY plano) t;
  
  RETURN QUERY SELECT vips_ativos, vips_expirados, receita_total, receita_mes, novos_mes, COALESCE(planos_stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 5: ROW LEVEL SECURITY
-- ============================================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_vip ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_payments ENABLE ROW LEVEL SECURITY;

-- Função auxiliar is_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'service_role' OR 
         auth.uid() IN (SELECT id FROM profiles WHERE email IN ('admin@telaprimeexpress.com', 'suporte@telaprimeexpress.com'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para profiles
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
CREATE POLICY "users_can_view_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
CREATE POLICY "users_can_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON profiles;
CREATE POLICY "enable_insert_for_authenticated_users" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;
CREATE POLICY "service_role_full_access_profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admin_full_access_profiles" ON profiles;
CREATE POLICY "admin_full_access_profiles" ON profiles FOR ALL USING (is_admin());

-- Políticas para usuarios_vip
DROP POLICY IF EXISTS "users_can_view_own_vip_records" ON usuarios_vip;
CREATE POLICY "users_can_view_own_vip_records" ON usuarios_vip FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "service_role_full_access_usuarios_vip" ON usuarios_vip;
CREATE POLICY "service_role_full_access_usuarios_vip" ON usuarios_vip FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admin_full_access_usuarios_vip" ON usuarios_vip;
CREATE POLICY "admin_full_access_usuarios_vip" ON usuarios_vip FOR ALL USING (is_admin());

-- Políticas para vip_payments
DROP POLICY IF EXISTS "users_can_view_own_payments" ON vip_payments;
CREATE POLICY "users_can_view_own_payments" ON vip_payments FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_full_access_vip_payments" ON vip_payments;
CREATE POLICY "service_role_full_access_vip_payments" ON vip_payments FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admin_full_access_vip_payments" ON vip_payments;
CREATE POLICY "admin_full_access_vip_payments" ON vip_payments FOR ALL USING (is_admin());

-- ============================================================================
-- PARTE 6: FUNÇÕES SECURITY DEFINER PARA API
-- ============================================================================

-- Função para usuário verificar próprio status VIP
CREATE OR REPLACE FUNCTION get_my_vip_status()
RETURNS TABLE (is_vip BOOLEAN, expires_at TIMESTAMP WITH TIME ZONE, days_remaining INTEGER, plan_type TEXT) AS $$
DECLARE
  user_record RECORD;
  vip_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  
  SELECT * INTO user_record FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil de usuário não encontrado'; END IF;
  
  SELECT * INTO vip_record FROM usuarios_vip WHERE user_id = auth.uid() AND pagamento_aprovado = true AND is_active = true ORDER BY data_expiraca DESC LIMIT 1;
  
  RETURN QUERY SELECT 
    user_record.is_vip,
    user_record.vip_expires_at,
    CASE WHEN user_record.is_vip AND user_record.vip_expires_at > NOW() THEN EXTRACT(DAYS FROM user_record.vip_expires_at - NOW())::INTEGER ELSE 0 END,
    COALESCE(vip_record.plano, 'nenhum');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para usuário ver histórico de pagamentos
CREATE OR REPLACE FUNCTION get_my_payment_history()
RETURNS TABLE (payment_id TEXT, amount_reais NUMERIC, payment_method TEXT, payment_status TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  
  RETURN QUERY
  SELECT vp.payment_id, (vp.amount / 100.0)::NUMERIC as amount_reais, vp.payment_method, vp.payment_status, vp.webhook_received_at as created_at
  FROM vip_payments vp WHERE vp.user_id = auth.uid()
  ORDER BY vp.webhook_received_at DESC LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 7: VIEWS E PERMISSÕES
-- ============================================================================

-- View para VIPs ativos (CORRIGIDA)
CREATE OR REPLACE VIEW vips_ativos AS
SELECT p.email, p.name, p.vip_expires_at, uv.plano, uv.data_inicio, 
       EXTRACT(DAYS FROM p.vip_expires_at - NOW()) as dias_restantes
FROM profiles p
JOIN usuarios_vip uv ON p.email = uv.email
WHERE p.is_vip = true AND p.vip_expires_at > NOW() AND uv.pagamento_aprovado = true AND uv.is_active = true
ORDER BY p.vip_expires_at;

-- View para histórico de pagamentos
CREATE OR REPLACE VIEW historico_pagamentos AS
SELECT p.email, vp.payment_id, vp.amount / 100.0 as valor_reais, vp.payment_method, vp.payment_status, vp.webhook_received_at, vp.processed
FROM profiles p
JOIN vip_payments vp ON p.id = vp.user_id
ORDER BY vp.webhook_received_at DESC;

-- View personalizada para usuário
CREATE OR REPLACE VIEW my_vip_info AS
SELECT p.email, p.is_vip, p.vip_expires_at, uv.plano, uv.data_inicio, 
       EXTRACT(DAYS FROM p.vip_expires_at - NOW()) as dias_restantes
FROM profiles p
LEFT JOIN usuarios_vip uv ON p.email = uv.email AND uv.pagamento_aprovado = true AND uv.is_active = true
WHERE p.id = auth.uid();

-- Grants
GRANT EXECUTE ON FUNCTION get_my_vip_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_vip_status TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_vip_duration TO authenticated;
GRANT EXECUTE ON FUNCTION activate_vip_manually TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_expired_vips TO service_role;
GRANT EXECUTE ON FUNCTION get_vip_report TO service_role;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deactivate_old_vip_records TO service_role;

GRANT SELECT ON vips_ativos TO authenticated;
GRANT SELECT ON my_vip_info TO authenticated;
GRANT SELECT ON historico_pagamentos TO service_role;

-- ============================================================================
-- PARTE 8: DADOS DE TESTE (OPCIONAL)
-- ============================================================================

-- Descomente as linhas abaixo para inserir dados de teste

/*
-- Inserir usuário de teste (se não existir)
INSERT INTO profiles (id, email, name, is_vip, vip_expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teste@telaprimeexpress.com',
  'Usuário Teste',
  true,
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (email) DO NOTHING;

-- Inserir registro VIP de teste
INSERT INTO usuarios_vip (email, user_id, plano, data_inicio, data_expiraca, pagamento_aprovado, source, notes, is_active)
VALUES (
  'teste@telaprimeexpress.com',
  '00000000-0000-0000-0000-000000000001',
  'mensal',
  NOW(),
  NOW() + INTERVAL '30 days',
  true,
  'manual',
  'Dados de teste',
  true
)
ON CONFLICT DO NOTHING;

-- Inserir pagamento de teste
INSERT INTO vip_payments (user_id, payment_id, amount, payment_method, payment_status, processed)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TEST_PAYMENT_001',
  770,
  'pix',
  'approved',
  true
)
ON CONFLICT (payment_id) DO NOTHING;
*/

-- ============================================================================
-- PARTE 9: VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar tabelas criadas
SELECT 'Tabelas criadas:' as status;
SELECT schemaname, tablename, tableowner
FROM pg_tables 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments')
ORDER BY tablename;

-- Verificar RLS habilitado
SELECT 'RLS habilitado:' as status;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments');

-- Verificar funções criadas
SELECT 'Funções criadas:' as status;
SELECT proname as function_name
FROM pg_proc 
WHERE proname IN (
  'activate_vip_after_payment',
  'calculate_vip_duration',
  'check_user_vip_status',
  'deactivate_expired_vips',
  'get_my_vip_status',
  'get_vip_report',
  'deactivate_old_vip_records'
)
ORDER BY proname;

-- Testar relatório VIP
SELECT 'Relatório VIP inicial:' as status;
SELECT * FROM get_vip_report();

-- ============================================================================
-- SETUP CONCLUÍDO COM SUCESSO! 🎉
-- ============================================================================

SELECT '🎉 SETUP SUPABASE CORRIGIDO CONCLUÍDO COM SUCESSO! 🎉' as status;
SELECT 'CORREÇÕES APLICADAS:' as correcoes;
SELECT '✓ Removido índice único com NOW() (função não IMMUTABLE)' as correcao_1;
SELECT '✓ Adicionado campo is_active para controlar VIP único ativo' as correcao_2;
SELECT '✓ Criada função deactivate_old_vip_records para manter unicidade' as correcao_3;
SELECT '✓ Mantida toda funcionalidade de ativação automática VIP' as correcao_4;
SELECT 'Agora você pode:' as proximos_passos;
SELECT '1. Configurar variáveis de ambiente (.env.local)' as passo_1;
SELECT '2. Configurar webhook no Mercado Pago' as passo_2;
SELECT '3. Testar fluxo completo de pagamento' as passo_3;