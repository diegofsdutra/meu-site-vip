// Serviço para gerenciar dados de películas com controle VIP
import { supabase } from './supabaseClient';

export interface PeliculaData {
  id?: number;
  modelo: string;
  compatibilidade: string;
  is_premium?: boolean;
}

export interface PeliculasResponse {
  success: boolean;
  data: PeliculaData[];
  isVIP: boolean;
  totalShown: number;
  message: string;
  error?: string;
}

/**
 * Buscar películas com controle de acesso VIP
 * @param userEmail - Email do usuário (opcional)
 * @param searchTerm - Termo de busca (opcional)
 * @returns Dados filtrados baseados no status VIP
 */
export const fetchPeliculas = async (
  userEmail?: string | null, 
  searchTerm: string = ''
): Promise<PeliculasResponse> => {
  try {
    // Construir URL da API
    const params = new URLSearchParams();
    if (userEmail) params.append('email', userEmail);
    if (searchTerm) params.append('search', searchTerm);
    
    const url = `/api/peliculas?${params.toString()}`;
    
    console.log('🔍 Buscando películas:', { userEmail, searchTerm, url });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: PeliculasResponse = await response.json();
    
    console.log('✅ Películas carregadas:', {
      total: result.totalShown,
      isVIP: result.isVIP,
      message: result.message
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao buscar películas:', error);
    
    return {
      success: false,
      data: [],
      isVIP: false,
      totalShown: 0,
      message: 'Erro ao carregar dados',
      error: (error as Error).message
    };
  }
};

/**
 * Criar tabela de películas no Supabase (executar uma vez)
 */
export const createPeliculasTable = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // SQL para criar a tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS peliculas_3d (
        id SERIAL PRIMARY KEY,
        modelo VARCHAR(255) NOT NULL,
        compatibilidade TEXT NOT NULL,
        is_premium BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Índices para melhor performance
      CREATE INDEX IF NOT EXISTS idx_peliculas_modelo ON peliculas_3d(modelo);
      CREATE INDEX IF NOT EXISTS idx_peliculas_premium ON peliculas_3d(is_premium);
      
      -- Trigger para atualizar updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_peliculas_updated_at ON peliculas_3d;
      CREATE TRIGGER update_peliculas_updated_at
        BEFORE UPDATE ON peliculas_3d
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      return {
        success: false,
        message: 'Erro ao criar tabela: ' + error.message
      };
    }
    
    console.log('✅ Tabela peliculas_3d criada com sucesso');
    
    return {
      success: true,
      message: 'Tabela criada com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    return {
      success: false,
      message: 'Erro interno: ' + (error as Error).message
    };
  }
};

/**
 * Migrar dados do JSON para Supabase
 */
export const migratePeliculasData = async (): Promise<{ success: boolean; message: string; totalMigrated?: number }> => {
  try {
    console.log('🚀 Iniciando migração de películas...');
    
    const response = await fetch('/api/peliculas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'migrate',
        adminKey: 'migrate_peliculas_2024'
      })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erro na migração');
    }
    
    console.log('✅ Migração concluída:', result.message);
    
    return {
      success: true,
      message: result.message,
      totalMigrated: result.totalInserted
    };
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return {
      success: false,
      message: 'Erro na migração: ' + (error as Error).message
    };
  }
};

/**
 * Verificar se a tabela de películas existe no Supabase
 */
export const checkPeliculasTable = async (): Promise<{ exists: boolean; count?: number }> => {
  try {
    const { data, error, count } = await supabase
      .from('peliculas_3d')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.log('⚠️ Tabela não existe:', error.message);
      return { exists: false };
    }
    
    console.log(`✅ Tabela existe com ${count} registros`);
    return { exists: true, count: count || 0 };
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
    return { exists: false };
  }
};

/**
 * Função utilitária para debug - mostrar estatísticas VIP
 */
export const getVIPStats = async (userEmail?: string): Promise<{
  isVIP: boolean;
  totalRecords: number;
  accessibleRecords: number;
  percentage: number;
}> => {
  try {
    const result = await fetchPeliculas(userEmail, '');
    
    // Buscar total real (assumindo que dados no JSON são a fonte verdadeira)
    const dadosPeliculas = require('../../data/dadosPeliculas.json');
    const totalRecords = dadosPeliculas.length;
    
    return {
      isVIP: result.isVIP,
      totalRecords,
      accessibleRecords: result.totalShown,
      percentage: Math.round((result.totalShown / totalRecords) * 100)
    };
    
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas VIP:', error);
    return {
      isVIP: false,
      totalRecords: 0,
      accessibleRecords: 0,
      percentage: 0
    };
  }
};