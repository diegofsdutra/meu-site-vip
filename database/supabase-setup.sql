-- Supabase Database Setup for Tela Prime Express
-- Execute estas queries no SQL Editor do Supabase

-- 1. Criar tabela profiles se não existir
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  vip_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (id)
);

-- 2. Criar tabela vip_payments para histórico de pagamentos
CREATE TABLE IF NOT EXISTS vip_payments (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id TEXT UNIQUE NOT NULL, -- ID do Mercado Pago
  amount INTEGER NOT NULL, -- valor em centavos
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL, -- pending, approved, rejected, cancelled
  external_reference TEXT, -- referência externa do pagamento
  mercado_pago_data JSONB, -- dados completos do webhook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (id)
);

-- 3. Criar tabela usuarios_vip (manter compatibilidade com código existente)
CREATE TABLE IF NOT EXISTS usuarios_vip (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plano TEXT NOT NULL DEFAULT 'mensal',
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_expiraca TIMESTAMP WITH TIME ZONE NOT NULL,
  pagamento_aprovado BOOLEAN DEFAULT FALSE,
  payment_id TEXT, -- referência ao pagamento do Mercado Pago
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_vip ON profiles(is_vip);
CREATE INDEX IF NOT EXISTS idx_vip_payments_user_id ON vip_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_payment_id ON vip_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_status ON vip_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_email ON usuarios_vip(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_vip_pagamento_aprovado ON usuarios_vip(pagamento_aprovado);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vip_payments_updated_at ON vip_payments;
CREATE TRIGGER update_vip_payments_updated_at
  BEFORE UPDATE ON vip_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_vip_updated_at ON usuarios_vip;
CREATE TRIGGER update_usuarios_vip_updated_at
  BEFORE UPDATE ON usuarios_vip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Função para ativar VIP após pagamento aprovado
CREATE OR REPLACE FUNCTION activate_vip_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_id UUID;
  vip_duration INTERVAL;
BEGIN
  -- Verificar se o pagamento foi aprovado
  IF NEW.payment_status = 'approved' AND OLD.payment_status != 'approved' THEN
    
    -- Buscar o user_id do pagamento
    SELECT user_id INTO user_profile_id FROM vip_payments WHERE id = NEW.id;
    
    -- Determinar duração do VIP baseado no valor
    CASE 
      WHEN NEW.amount <= 1000 THEN -- R$ 10.00 ou menos = 1 mês
        vip_duration := INTERVAL '1 month';
      WHEN NEW.amount <= 2500 THEN -- até R$ 25.00 = 3 meses  
        vip_duration := INTERVAL '3 months';
      ELSE -- mais que R$ 25.00 = 1 ano
        vip_duration := INTERVAL '1 year';
    END CASE;
    
    -- Atualizar perfil do usuário
    UPDATE profiles 
    SET 
      is_vip = TRUE,
      vip_expires_at = GREATEST(
        COALESCE(vip_expires_at, NOW()), 
        NOW()
      ) + vip_duration,
      updated_at = NOW()
    WHERE id = user_profile_id;
    
    -- Também atualizar na tabela usuarios_vip (compatibilidade)
    INSERT INTO usuarios_vip (email, plano, data_inicio, data_expiraca, pagamento_aprovado, payment_id)
    SELECT 
      p.email,
      CASE 
        WHEN NEW.amount <= 1000 THEN 'mensal'
        WHEN NEW.amount <= 2500 THEN 'trimestral'
        ELSE 'anual'
      END,
      NOW(),
      profiles.vip_expires_at,
      TRUE,
      NEW.payment_id
    FROM profiles p
    WHERE p.id = user_profile_id
    ON CONFLICT (email) DO UPDATE SET
      data_expiraca = EXCLUDED.data_expiraca,
      pagamento_aprovado = TRUE,
      payment_id = EXCLUDED.payment_id,
      updated_at = NOW();
    
    -- Log da ativação
    RAISE NOTICE 'VIP ativado para usuário % até %', user_profile_id, (SELECT vip_expires_at FROM profiles WHERE id = user_profile_id);
    
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar trigger para ativação automática de VIP
DROP TRIGGER IF EXISTS activate_vip_trigger ON vip_payments;
CREATE TRIGGER activate_vip_trigger
  AFTER UPDATE ON vip_payments
  FOR EACH ROW
  EXECUTE FUNCTION activate_vip_on_payment();

-- 9. Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Criar trigger para criação automática de perfil
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- 11. Row Level Security (RLS) - será configurado no próximo passo