-- ============================================================================
-- SCRIPT 1: CRIAÇÃO DAS TABELAS PRINCIPAIS
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Limpar tabelas existentes se necessário (CUIDADO em produção!)
-- DROP TABLE IF EXISTS vip_payments CASCADE;
-- DROP TABLE IF EXISTS usuarios_vip CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- 1. TABELA PROFILES (usuários do Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  first_purchase_bonus_used BOOLEAN DEFAULT FALSE, -- Para promoção "primeira compra grátis"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE profiles IS 'Perfis de usuários integrados com Supabase Auth';
COMMENT ON COLUMN profiles.is_vip IS 'Status VIP atual do usuário';
COMMENT ON COLUMN profiles.vip_expires_at IS 'Data de expiração do VIP (NULL = nunca expira)';
COMMENT ON COLUMN profiles.first_purchase_bonus_used IS 'Se já usou o bônus de primeira compra';

-- ============================================================================
-- 2. TABELA USUARIOS_VIP (compatibilidade + funcionalidades extras)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios_vip (
  id SERIAL PRIMARY KEY,
  
  -- Identificação do usuário
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Link com Supabase Auth
  
  -- Informações do plano
  plano TEXT NOT NULL DEFAULT 'mensal' CHECK (plano IN ('mensal', 'trimestral', 'anual')),
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_expiraca TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status do pagamento
  pagamento_aprovado BOOLEAN DEFAULT FALSE,
  payment_id TEXT, -- ID do pagamento no Mercado Pago
  payment_method TEXT, -- Método de pagamento (pix, cartao, etc)
  amount_paid INTEGER, -- Valor pago em centavos
  
  -- Metadata adicional
  source TEXT DEFAULT 'mercado_pago', -- Origem do VIP (mercado_pago, manual, promocao)
  notes TEXT, -- Observações administrativas
  
  -- Controle de timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (data_expiraca > data_inicio),
  CONSTRAINT valid_amount CHECK (amount_paid IS NULL OR amount_paid > 0)
);

-- Comentários
COMMENT ON TABLE usuarios_vip IS 'Registros de assinaturas VIP com histórico completo';
COMMENT ON COLUMN usuarios_vip.plano IS 'Tipo de plano: mensal, trimestral ou anual';
COMMENT ON COLUMN usuarios_vip.source IS 'Origem da ativação VIP (mercado_pago, manual, promocao)';
COMMENT ON COLUMN usuarios_vip.amount_paid IS 'Valor pago em centavos (770 = R$ 7,70)';

-- ============================================================================
-- 3. TABELA VIP_PAYMENTS (histórico detalhado de pagamentos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vip_record_id INTEGER REFERENCES usuarios_vip(id) ON DELETE SET NULL,
  
  -- Informações do pagamento Mercado Pago
  payment_id TEXT UNIQUE NOT NULL, -- ID único do Mercado Pago
  external_reference TEXT, -- Referência externa (JSON com dados do checkout)
  
  -- Valores e moeda
  amount INTEGER NOT NULL, -- Valor em centavos
  currency TEXT DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  
  -- Método e status
  payment_method TEXT NOT NULL, -- pix, credit_card, debit_card, etc
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  
  -- Dados brutos do webhook
  mercado_pago_data JSONB, -- Payload completo do webhook
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Controle de processamento
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_processing_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_amount_payment CHECK (amount > 0),
  CONSTRAINT valid_attempts CHECK (processing_attempts >= 0)
);

-- Comentários
COMMENT ON TABLE vip_payments IS 'Histórico completo de pagamentos do Mercado Pago';
COMMENT ON COLUMN vip_payments.payment_id IS 'ID único do pagamento no Mercado Pago';
COMMENT ON COLUMN vip_payments.mercado_pago_data IS 'Dados completos do webhook em JSON';
COMMENT ON COLUMN vip_payments.processed IS 'Se o pagamento já foi processado para ativar VIP';

-- ============================================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices na tabela profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_vip ON profiles(is_vip);
CREATE INDEX IF NOT EXISTS idx_profiles_vip_expires ON profiles(vip_expires_at) WHERE is_vip = true;

-- Índices na tabela usuarios_vip
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_email ON usuarios_vip(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_user_id ON usuarios_vip(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_pagamento_aprovado ON usuarios_vip(pagamento_aprovado);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_data_expiraca ON usuarios_vip(data_expiraca);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_payment_id ON usuarios_vip(payment_id) WHERE payment_id IS NOT NULL;

-- Índices na tabela vip_payments
CREATE INDEX IF NOT EXISTS idx_vip_payments_user_id ON vip_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_payment_id ON vip_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_status ON vip_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_vip_payments_processed ON vip_payments(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_vip_payments_webhook_received ON vip_payments(webhook_received_at);

-- Índice composto para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_active ON usuarios_vip(email, pagamento_aprovado, data_expiraca) 
  WHERE pagamento_aprovado = true;

-- ============================================================================
-- 5. CONSTRAINTS ADICIONAIS E UNIQUE INDEXES
-- ============================================================================

-- Garantir que cada email tenha apenas um VIP ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_vip_email_active 
  ON usuarios_vip(email) 
  WHERE pagamento_aprovado = true AND data_expiraca > NOW();

-- ============================================================================
-- 6. FUNÇÃO PARA ATUALIZAR TIMESTAMP AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Trigger para profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para usuarios_vip
DROP TRIGGER IF EXISTS update_usuarios_vip_updated_at ON usuarios_vip;
CREATE TRIGGER update_usuarios_vip_updated_at
  BEFORE UPDATE ON usuarios_vip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para vip_payments
DROP TRIGGER IF EXISTS update_vip_payments_updated_at ON vip_payments;
CREATE TRIGGER update_vip_payments_updated_at
  BEFORE UPDATE ON vip_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar erros se perfil já existir
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 9. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIL
-- ============================================================================

DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- ============================================================================
-- SCRIPT CONCLUÍDO
-- ============================================================================

-- Verificar se as tabelas foram criadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments')
ORDER BY tablename;

-- Verificar índices criados
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('profiles', 'usuarios_vip', 'vip_payments')
ORDER BY tablename, indexname;