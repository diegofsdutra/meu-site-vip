import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabaseClient';
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

    // Verificar se o usuário é VIP
    let isUserVIP = false;
    if (userEmail) {
      try {
        const vipData = await loadUserVIPData(userEmail);
        isUserVIP = isVIPActive({ email: userEmail, vip_data: vipData });
        console.log('👑 Status VIP:', isUserVIP);
      } catch (error) {
        console.error('❌ Erro ao verificar VIP:', error);
      }
    }

    // Buscar dados no Supabase (com fallback para JSON se tabela não existir)
    let peliculasData: PeliculaData[] = [];
    
    try {
      // Tentar buscar no Supabase primeiro
      const { data, error } = await supabase
        .from('peliculas_3d')
        .select('*')
        .ilike('modelo', `%${searchTerm}%`);

      if (error) {
        console.log('⚠️ Tabela peliculas_3d não existe, usando fallback JSON');
        throw error;
      }

      peliculasData = data || [];
      console.log(`📊 Encontrados ${peliculasData.length} registros no Supabase`);
      
    } catch (supabaseError) {
      // Fallback: usar dados do JSON
      console.log('📄 Usando dados do arquivo JSON como fallback');
      const dadosPeliculas = require('../../../data/dadosPeliculas.json');
      
      // Filtrar por termo de busca se fornecido
      peliculasData = dadosPeliculas.filter((item: PeliculaData) => 
        searchTerm === '' || 
        item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.compatibilidade.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Aplicar lógica VIP: se não for VIP, mostrar apenas 20% dos dados
    if (!isUserVIP && peliculasData.length > 0) {
      const limitedCount = Math.ceil(peliculasData.length * 0.2); // 20% dos dados
      peliculasData = peliculasData.slice(0, limitedCount);
      console.log(`🔒 Usuário não-VIP: limitando para ${limitedCount} registros (20%)`);
    } else if (isUserVIP) {
      console.log(`🎯 Usuário VIP: mostrando todos os ${peliculasData.length} registros (100%)`);
    }

    return NextResponse.json({
      success: true,
      data: peliculasData,
      isVIP: isUserVIP,
      totalShown: peliculasData.length,
      message: isUserVIP 
        ? 'Acesso VIP: dados completos disponíveis' 
        : 'Acesso limitado: apenas 20% dos dados. Assine o VIP para acesso completo!'
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
    
    // Carregar dados do JSON
    const dadosPeliculas = require('../../../data/dadosPeliculas.json');
    
    // Preparar dados para inserção no Supabase
    const peliculasForInsert = dadosPeliculas.map((item: PeliculaData, index: number) => ({
      modelo: item.modelo,
      compatibilidade: item.compatibilidade,
      is_premium: index >= Math.ceil(dadosPeliculas.length * 0.2) // Marcar 80% como premium
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