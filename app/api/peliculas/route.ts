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
 * 🎯 Função para diversificar marcas nos dados limitados para usuários não-VIP
 * Distribui 49 modelos entre diferentes marcas de forma equilibrada
 */
function diversifyBrandSelection(allData: PeliculaData[]): PeliculaData[] {
  const brandLimits = {
    samsung: 15,
    iphone: 15,
    motorola: 10,
    xiaomi: 9
  };
  
  // Agrupar dados por marca (detectar pela presença de palavras-chave no modelo)
  const brandGroups: { [key: string]: PeliculaData[] } = {
    samsung: [],
    iphone: [],
    motorola: [],
    xiaomi: [],
    others: []
  };
  
  allData.forEach(item => {
    const modelo = item.modelo.toLowerCase();
    if (modelo.includes('samsung') || modelo.includes('galaxy') || modelo.includes('sm-') || modelo.includes('a0') || modelo.includes('a1') || modelo.includes('a2') || modelo.includes('a3') || modelo.includes('a4') || modelo.includes('a5') || modelo.includes('a6') || modelo.includes('a7') || modelo.includes('a8') || modelo.includes('a9') || modelo.includes('j0') || modelo.includes('j1') || modelo.includes('j2') || modelo.includes('j3') || modelo.includes('j4') || modelo.includes('j5') || modelo.includes('j6') || modelo.includes('j7') || modelo.includes('j8') || modelo.includes('s20') || modelo.includes('s21') || modelo.includes('s22') || modelo.includes('s23') || modelo.includes('s24') || modelo.includes('note') || modelo.includes('m10') || modelo.includes('m20') || modelo.includes('m30')) {
      brandGroups.samsung.push(item);
    } else if (modelo.includes('iphone') || modelo.includes('apple')) {
      brandGroups.iphone.push(item);
    } else if (modelo.includes('moto') || modelo.includes('motorola')) {
      brandGroups.motorola.push(item);
    } else if (modelo.includes('xiaomi') || modelo.includes('redmi') || modelo.includes('poco') || modelo.includes('mi ')) {
      brandGroups.xiaomi.push(item);
    } else {
      brandGroups.others.push(item);
    }
  });
  
  console.log('📊 Distribuição de marcas encontrada:', {
    samsung: brandGroups.samsung.length,
    iphone: brandGroups.iphone.length,
    motorola: brandGroups.motorola.length,
    xiaomi: brandGroups.xiaomi.length,
    others: brandGroups.others.length
  });
  
  // Selecionar modelos respeitando os limites de cada marca
  const selectedModels: PeliculaData[] = [];
  
  // Samsung - máximo 15
  selectedModels.push(...brandGroups.samsung.slice(0, brandLimits.samsung));
  
  // iPhone - máximo 15
  selectedModels.push(...brandGroups.iphone.slice(0, brandLimits.iphone));
  
  // Motorola - máximo 10
  selectedModels.push(...brandGroups.motorola.slice(0, brandLimits.motorola));
  
  // Xiaomi - máximo 9
  selectedModels.push(...brandGroups.xiaomi.slice(0, brandLimits.xiaomi));
  
  // Se não atingiu 49 modelos, completar com outras marcas
  const remainingSlots = 49 - selectedModels.length;
  if (remainingSlots > 0) {
    selectedModels.push(...brandGroups.others.slice(0, remainingSlots));
  }
  
  console.log('🎯 Distribuição final para não-VIP:', {
    samsung: selectedModels.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return modelo.includes('samsung') || modelo.includes('galaxy') || modelo.includes('sm-') || modelo.includes('a0') || modelo.includes('a1') || modelo.includes('a2') || modelo.includes('a3') || modelo.includes('a4') || modelo.includes('a5') || modelo.includes('a6') || modelo.includes('a7') || modelo.includes('a8') || modelo.includes('a9') || modelo.includes('j0') || modelo.includes('j1') || modelo.includes('j2') || modelo.includes('j3') || modelo.includes('j4') || modelo.includes('j5') || modelo.includes('j6') || modelo.includes('j7') || modelo.includes('j8') || modelo.includes('s20') || modelo.includes('s21') || modelo.includes('s22') || modelo.includes('s23') || modelo.includes('s24') || modelo.includes('note') || modelo.includes('m10') || modelo.includes('m20') || modelo.includes('m30');
    }).length,
    iphone: selectedModels.filter(item => item.modelo.toLowerCase().includes('iphone') || item.modelo.toLowerCase().includes('apple')).length,
    motorola: selectedModels.filter(item => item.modelo.toLowerCase().includes('moto') || item.modelo.toLowerCase().includes('motorola')).length,
    xiaomi: selectedModels.filter(item => {
      const modelo = item.modelo.toLowerCase();
      return modelo.includes('xiaomi') || modelo.includes('redmi') || modelo.includes('poco') || modelo.includes('mi ');
    }).length,
    total: selectedModels.length
  });
  
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
          // Aplicar diversificação de marcas
          peliculasData = diversifyBrandSelection(allData);
          console.log(`🔒 Usuário não-VIP: aplicada diversificação de marcas, ${peliculasData.length} registros selecionados`);
          
          // Se há termo de busca, filtrar nos dados já diversificados
          if (searchTerm) {
            peliculasData = peliculasData.filter((item: PeliculaData) => 
              item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.compatibilidade.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
        } else {
          console.log('⚠️ Erro ao buscar todos os dados para diversificação, usando fallback JSON');
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
      
      // 🔒 SEGURANÇA: Aplicar limitação ANTES da busca com diversificação de marcas
      let limitedData = dadosPeliculas;
      if (!isUserVIP) {
        limitedData = diversifyBrandSelection(dadosPeliculas);
        console.log(`🔒 Usuário não-VIP: limitando dataset para ${limitedData.length} registros com diversificação de marcas`);
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