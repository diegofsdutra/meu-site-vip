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

/**
 * 🎯 Função para seleção estratégica por linhas de produtos para usuários não-VIP
 * Distribui 49 modelos baseado em linhas específicas e populares
 */
function selectStrategicProductLines(allData: PeliculaData[]): PeliculaData[] {
  const selectedModels: PeliculaData[] = [];
  
  // Samsung (20 modelos) - Linhas específicas
  const samsungLines = [
    { pattern: ['a0'], limit: 3, name: 'Linha A0x' },
    { pattern: ['a1'], limit: 5, name: 'Linha A1x' },
    { pattern: ['a2'], limit: 4, name: 'Linha A2x' },
    { pattern: ['a3'], limit: 3, name: 'Linha A3x' },
    { pattern: ['a5'], limit: 3, name: 'Linha A5x' },
    { pattern: ['m1', 'm2', 'm3', 'm4'], limit: 2, name: 'Linha M' }
  ];
  
  samsungLines.forEach(line => {
    const lineModels = allData.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return (modelo.includes('samsung') || modelo.includes('galaxy') || modelo.includes('sm-')) &&
             line.pattern.some(pattern => modelo.includes(pattern));
    });
    selectedModels.push(...lineModels.slice(0, line.limit));
    console.log(`📱 Samsung ${line.name}: ${Math.min(lineModels.length, line.limit)} modelos selecionados`);
  });
  
  // Motorola (13 modelos) - Linhas Moto E e Moto G
  const motorolaModels = allData.filter(item => {
    const modelo = item.modelo.toLowerCase();
    return (modelo.includes('moto e') || modelo.includes('moto g')) && 
           (modelo.includes('moto') || modelo.includes('motorola'));
  });
  selectedModels.push(...motorolaModels.slice(0, 13));
  console.log(`📱 Motorola (Moto E/G): ${Math.min(motorolaModels.length, 13)} modelos selecionados`);
  
  // Xiaomi (7 modelos) - Linhas Redmi Note e Redmi
  const xiaomiModels = allData.filter(item => {
    const modelo = item.modelo.toLowerCase();
    return (modelo.includes('redmi note') || modelo.includes('redmi')) &&
           (modelo.includes('xiaomi') || modelo.includes('redmi'));
  });
  selectedModels.push(...xiaomiModels.slice(0, 7));
  console.log(`📱 Xiaomi (Redmi): ${Math.min(xiaomiModels.length, 7)} modelos selecionados`);
  
  // iPhone (5 modelos) - Modelos específicos
  const iphoneTargets = ['iphone 7', 'iphone 8', 'iphone x', 'iphone 11', 'iphone 12'];
  iphoneTargets.forEach(target => {
    const iphoneModel = allData.find(item => 
      item.modelo.toLowerCase().includes(target)
    );
    if (iphoneModel) {
      selectedModels.push(iphoneModel);
    }
  });
  console.log(`📱 iPhone (específicos): ${selectedModels.filter(item => 
    item.modelo.toLowerCase().includes('iphone')).length} modelos selecionados`);
  
  // LG (4 modelos) - Linha K
  const lgModels = allData.filter(item => {
    const modelo = item.modelo.toLowerCase();
    return modelo.includes('lg') && modelo.includes('k');
  });
  selectedModels.push(...lgModels.slice(0, 4));
  console.log(`📱 LG (Linha K): ${Math.min(lgModels.length, 4)} modelos selecionados`);
  
  // Log final da distribuição estratégica
  const finalDistribution = {
    samsung: selectedModels.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return modelo.includes('samsung') || modelo.includes('galaxy') || modelo.includes('sm-');
    }).length,
    motorola: selectedModels.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return modelo.includes('moto') || modelo.includes('motorola');
    }).length,
    xiaomi: selectedModels.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return modelo.includes('xiaomi') || modelo.includes('redmi');
    }).length,
    iphone: selectedModels.filter(item => 
      item.modelo.toLowerCase().includes('iphone')
    ).length,
    lg: selectedModels.filter(item => 
      item.modelo.toLowerCase().includes('lg')
    ).length,
    total: selectedModels.length
  };
  
  console.log('🎯 Distribuição final estratégica para não-VIP:', finalDistribution);
  
  return selectedModels;
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
      // 🔒 SEGURANÇA: Tratamento diferenciado para VIP vs não-VIP
      if (!isUserVIP) {
        // Para não-VIP: buscar todos os dados e aplicar diversificação
        const { data: allData, error: allError } = await supabase
          .from('peliculas_3d')
          .select('*');
        
        if (!allError && allData) {
          // Aplicar seleção estratégica por linhas de produtos
          peliculasData = selectStrategicProductLines(allData);
          console.log(`🔒 Usuário não-VIP: aplicada seleção estratégica por linhas, ${peliculasData.length} registros selecionados`);
          
          // Se há termo de busca, filtrar nos dados já diversificados
          if (searchTerm) {
            peliculasData = peliculasData.filter((item: PeliculaData) => 
              item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.compatibilidade.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
        } else {
          console.log('⚠️ Erro ao buscar todos os dados para seleção estratégica, usando fallback JSON');
          throw allError;
        }
      } else {
        // Para VIP: busca normal com filtros aplicados diretamente
        let query = supabase.from('peliculas_3d').select('*');
        
        // Aplicar filtro de busca se fornecido
        if (searchTerm) {
          query = query.ilike('modelo', `%${searchTerm}%`);
        }
        
        const { data, error } = await query;

        if (error) {
          console.log('⚠️ Tabela peliculas_3d não existe, usando fallback JSON');
          throw error;
        }

        peliculasData = data || [];
        console.log(`📊 Usuário VIP: encontrados ${peliculasData.length} registros no Supabase`);
      }
      
    } catch (supabaseError) {
      // Fallback: usar dados do JSON com limitação segura
      console.log('📄 Usando dados do arquivo JSON como fallback');
      const dadosPeliculas = require('../../../data/dadosPeliculas.json');
      
      // 🔒 SEGURANÇA: Aplicar limitação ANTES da busca com seleção estratégica por linhas
      let limitedData = dadosPeliculas;
      if (!isUserVIP) {
        limitedData = selectStrategicProductLines(dadosPeliculas);
        console.log(`🔒 Usuário não-VIP: limitando dataset para ${limitedData.length} registros com seleção estratégica por linhas`);
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