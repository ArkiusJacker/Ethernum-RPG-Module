/**
 * Ethernum RPG Module - Configurações e Constantes
 * Arquivo separado para melhor organização do código
 */

export const ETHERNUM = {
  MODULE_NAME: "ethernum-rpg-module",
  TEMPLATE_PATH: "modules/ethernum-rpg-module/templates/",
  
  // Rank progression system: F -> E -> D -> C -> B -> A -> S -> K
  RANKS: ["F", "E", "D", "C", "B", "A", "S", "K"],
  
  // Rank bonuses for attributes: F=+2, E=+4, D=+6, C=+8, B=+10, A=+12, S=+15, K=+20
  ATTRIBUTE_RANK_BONUS: {
    "F": 2, "E": 4, "D": 6, "C": 8, "B": 10, "A": 12, "S": 15, "K": 20
  },
  
  // Rank bonuses for talents: F=+3, E=+6, D=+9, C=+12, B=+15, A=+18, S=+21, K=+25
  TALENT_RANK_BONUS: {
    "F": 3, "E": 6, "D": 9, "C": 12, "B": 15, "A": 18, "S": 21, "K": 25
  },
  
  // Sistema de Fichas de Éter (FE) - Custo por nível em cada rank
  // Cada rank tem 10 níveis, então o custo total é cost * 10
  FE_COST_PER_LEVEL: {
    "F": 100,    // 1000 FE total para maxar rank F
    "E": 200,    // 2000 FE total para maxar rank E
    "D": 400,    // 4000 FE total para maxar rank D
    "C": 800,    // 8000 FE total para maxar rank C
    "B": 1600,   // 16000 FE total para maxar rank B
    "A": 3200,   // 32000 FE total para maxar rank A
    "S": 6400,   // 64000 FE total para maxar rank S
    "K": 12800   // 128000 FE total para maxar rank K
  },
  
  // Rune Classes (renamed: Latente, Tangível, Dissonante, Crítico, Evento Zero)
  RUNE_CLASSES: {
    1: {
      name: "Latente",
      nameEn: "Latent",
      defaultDC: 15,
      cost: "zero",
      focus: "Efeitos passivos, percepção sutil, conexão inicial",
      visual: "Runas brilham levemente, quase imperceptíveis"
    },
    2: {
      name: "Tangível",
      nameEn: "Tangible",
      defaultDC: 20,
      cost: "baixo",
      focus: "Efeitos físicos diretos, manipulação básica",
      visual: "Éter visível, emanações claras"
    },
    3: {
      name: "Dissonante",
      nameEn: "Dissonant",
      defaultDC: 30,
      cost: "médio",
      focus: "Alteração de regras locais, distorção da realidade",
      visual: "Ambiente distorce, leis físicas tremem"
    },
    4: {
      name: "Crítico",
      nameEn: "Critical",
      defaultDC: 40,
      cost: "alto",
      focus: "Efeitos permanentes, alterações fundamentais",
      visual: "Ruptura visível na realidade"
    },
    5: {
      name: "Evento Zero",
      nameEn: "Event Zero",
      defaultDC: 50,
      cost: "catastrófico",
      focus: "Reescrever a Narrativa/Realidade completamente",
      visual: "Colapso total - fim de jogo"
    }
  },
  
  // Min and max rune class constants
  MIN_RUNE_CLASS: 1,
  MAX_RUNE_CLASS: 5,
  
  // Min and max attribute/talent levels
  MIN_LEVEL: 1,
  MAX_LEVEL: 10,
  
  // Rune Trinity System (Verbo + Substantivo + Fonte)
  RUNE_TRINITY: {
    // Verbos (O que a runa FAZ) - divididos em Tiers
    VERBS: {
      tier1: ["INFLINGIR", "SUSTENTAR", "IDENTIFICAR", "IMBUIR", "TRAVAR", "AGENDAR"],
      tier2: ["MOLDAR", "ATRAVESSAR", "REFLETIR", "MODIFICAR", "EXECUTAR", "RASTREAR"],
      tier3: ["DESTRUIR", "DOMINAR", "TRANSPORTAR", "CRIAR", "REESCREVER", "OTIMIZAR"]
    },
    // Substantivos (O que a runa AFETA)
    NOUNS: [
      "Fogo", "Eletricidade", "Aço", "Corpo", "Mente", "Gelo", "Sombra", "Tempo",
      "Gravidade", "Natureza", "Luz", "Som", "Ar", "Sangue", "Destino", "Peso",
      "Velocidade", "Ligação", "Duração", "Destreza", "Ferocidade", "Água", 
      "Vida", "Madeira", "Percepção"
    ],
    // Fontes (De onde vem o PODER)
    SOURCES: [
      "Sangue", "Calor", "Dor", "Memória", "Força", "Vigor", "Destreza", 
      "Velocidade", "Personalidade", "Inteligência", "Sabedoria", "Conhecimento",
      "Coragem", "Sanidade", "Amor", "Raiva", "Desejo", "Empatia", "Sonho", "Éter"
    ]
  },
  
  // Default ether attributes
  DEFAULT_ETHER_ATTRIBUTES: {
    forca: { value: 1, rank: "F", points: 0 },
    destreza: { value: 1, rank: "F", points: 0 },
    constituicao: { value: 1, rank: "F", points: 0 },
    inteligencia: { value: 1, rank: "F", points: 0 },
    sabedoria: { value: 1, rank: "F", points: 0 },
    carisma: { value: 1, rank: "F", points: 0 }
  },
  
  // Default talents
  DEFAULT_TALENTS: {
    investigacao: { value: 1, rank: "F", points: 0 },
    percepcao: { value: 1, rank: "F", points: 0 },
    furtividade: { value: 1, rank: "F", points: 0 },
    atletismo: { value: 1, rank: "F", points: 0 },
    acrobacia: { value: 1, rank: "F", points: 0 },
    intimidacao: { value: 1, rank: "F", points: 0 },
    persuasao: { value: 1, rank: "F", points: 0 },
    enganacao: { value: 1, rank: "F", points: 0 },
    medicina: { value: 1, rank: "F", points: 0 },
    sobrevivencia: { value: 1, rank: "F", points: 0 },
    arcanismo: { value: 1, rank: "F", points: 0 },
    religiao: { value: 1, rank: "F", points: 0 },
    natureza: { value: 1, rank: "F", points: 0 },
    sociedade: { value: 1, rank: "F", points: 0 },
    ocultismo: { value: 1, rank: "F", points: 0 }
  },
  
  // Default FE (Fichas de Éter) - currency for upgrades
  DEFAULT_FE: {
    current: 0,
    total: 0  // Total acumulado (histórico)
  }
};
