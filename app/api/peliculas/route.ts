import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../lib/supabaseServer';
import { loadUserVIPData, isVIPActive } from '../../lib/vipUtils';

// Interface para os dados de películas
interface PeliculaData {
  id?: number;
  modelo: string;
  compatibilidade: string;
  is_premium?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const searchTerm = searchParams.get('search') || '';
    
    console.log('🔍 API Películas - Email:', userEmail, 'Search:', searchTerm);
    
    // Criar cliente Supabase administrativo
    const supabase = createServerSupabaseClient();

    // Verificar se o usuário é VIP
    let isUserVIP = false;
    if (userEmail) {
      try {
        console.log('🔍 Verificando status VIP para:', userEmail);
        
        // Método 1: Verificar na tabela usuarios_vip
        const vipData = await loadUserVIPData(userEmail);
        if (vipData) {
          isUserVIP = isVIPActive({ email: userEmail, vip_data: vipData });
          console.log('👑 VIP encontrado na tabela usuarios_vip:', isUserVIP);
        } else {
          // Método 2: Verificar na tabela profiles
          console.log('🔄 Verificando VIP na tabela profiles...');
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_vip, vip_expires_at')
            .eq('email', userEmail)
            .single();
          
          if (!profileError && profileData) {
            if (profileData.is_vip && profileData.vip_expires_at) {
              const expiresAt = new Date(profileData.vip_expires_at);
              isUserVIP = expiresAt > new Date();
              console.log('👑 VIP encontrado na tabela profiles:', isUserVIP, 'expira em:', expiresAt);
            } else if (profileData.is_vip && !profileData.vip_expires_at) {
              // VIP sem data de expiração (VIP permanente)
              isUserVIP = true;
              console.log('👑 VIP permanente encontrado na tabela profiles');
            }
          } else {
            console.log('❌ Usuário não encontrado na tabela profiles:', profileError?.message);
          }
        }
        
        console.log('🎯 Status VIP final:', isUserVIP);
      } catch (error) {
        console.error('❌ Erro ao verificar VIP:', error);
      }
    }

    // 🔒 CORREÇÃO DE SEGURANÇA: Buscar dados aplicando limitação VIP no servidor
    let peliculasData: PeliculaData[] = [];
    
    try {
      // Tentar buscar no Supabase primeiro
      let query = supabase.from('peliculas_3d').select('*');
      
      // 🔒 SEGURANÇA: Se não for VIP, limitar busca apenas aos primeiros 10% dos registros
      if (!isUserVIP) {
        // Primeiro, obter o total de registros para calcular limite
        const { count } = await supabase
          .from('peliculas_3d')
          .select('*', { count: 'exact', head: true });
        
        if (count) {
          const maxAllowedId = Math.ceil(count * 0.1); // 10% dos registros
          query = query.lte('id', maxAllowedId);
          console.log(`🔒 Usuário não-VIP: limitando busca aos primeiros ${maxAllowedId} registros (10%)`);
        }
      }
      
      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.ilike('modelo', `%${searchTerm}%`);
      }
      
      const { data, error } = await query;

      if (error) {
        console.log('⚠️ Tabela peliculas_3d não existe, usando fallback JSON');
        throw error;
      }

      peliculasData = data || [];
      console.log(`📊 Encontrados ${peliculasData.length} registros no Supabase`);
      
    } catch (supabaseError) {
      // Fallback: usar dados do JSON com limitação segura
      console.log('📄 Usando dados do arquivo JSON como fallback');
      const dadosPeliculas = require('../../../data/dadosPeliculas.json');
      
      // 🔒 SEGURANÇA: Aplicar limitação ANTES da busca
      let limitedData = dadosPeliculas;
      if (!isUserVIP) {
        const limitedCount = Math.ceil(dadosPeliculas.length * 0.1); // 10% dos dados
        limitedData = dadosPeliculas.slice(0, limitedCount);
        console.log(`🔒 Usuário não-VIP: limitando dataset para ${limitedCount} registros antes da busca`);
      }
      
      // Filtrar por termo de busca APENAS nos dados já limitados
      peliculasData = limitedData.filter((item: PeliculaData) => 
        searchTerm === '' || 
        item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.compatibilidade.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Log final
    if (isUserVIP) {
      console.log(`🎯 Usuário VIP: acesso a todos os dados disponíveis (${peliculasData.length} registros)`);
    } else {
      console.log(`🔒 Usuário não-VIP: acesso limitado a ${peliculasData.length} registros`);
    }

    return NextResponse.json({
      success: true,
      data: peliculasData,
      isVIP: isUserVIP,
      totalShown: peliculasData.length,
      message: isUserVIP 
        ? 'Acesso VIP: dados completos disponíveis' 
        : 'Acesso limitado: apenas 10% dos dados. Assine o VIP para acesso completo!'
    });

  } catch (error) {
    console.error('❌ Erro na API películas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      data: []
    }, { status: 500 });
  }
}

// Função para migrar dados do JSON para Supabase (executar uma vez)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar se é uma requisição de migração autorizada
    if (body.action !== 'migrate' || body.adminKey !== 'migrate_peliculas_2024') {
      return NextResponse.json({ 
        success: false, 
        error: 'Ação não autorizada' 
      }, { status: 401 });
    }

    console.log('🚀 Iniciando migração dos dados de películas...');
    
    // Criar cliente Supabase administrativo
    const supabase = createServerSupabaseClient();
    
    // Carregar dados do JSON
    const dadosPeliculas = require('../../../data/dadosPeliculas.json');
    
    // Preparar dados para inserção no Supabase
    const peliculasForInsert = dadosPeliculas.map((item: PeliculaData, index: number) => ({
      modelo: item.modelo,
      compatibilidade: item.compatibilidade,
      is_premium: index >= Math.ceil(dadosPeliculas.length * 0.1) // Marcar 90% como premium
    }));

    // Inserir no Supabase em lotes
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < peliculasForInsert.length; i += batchSize) {
      const batch = peliculasForInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('peliculas_3d')
        .insert(batch);
      
      if (error) {
        console.error('❌ Erro no lote:', error);
        throw error;
      }
      
      totalInserted += batch.length;
      console.log(`✅ Inseridos ${batch.length} registros (total: ${totalInserted})`);
    }

    console.log('🎉 Migração concluída com sucesso!');
    
    return NextResponse.json({
      success: true,
      message: `Migração concluída: ${totalInserted} registros inseridos`,
      totalInserted
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro na migração: ' + (error as Error).message
    }, { status: 500 });
  }
}