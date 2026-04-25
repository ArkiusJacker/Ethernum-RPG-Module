export type Rank = "F" | "E" | "D" | "C" | "B" | "A" | "S" | "K";
export type RuneClassKey = 1 | 2 | 3 | 4 | 5;

export interface EtherAttribute {
  value: number;
  rank: Rank;
  points: number;
}

export interface RuneClassConfig {
  name: string;
  nameEn: string;
  defaultDC: number;
  cost: string;
  focus: string;
  visual: string;
}

export interface EthernumConfig {
  MODULE_NAME: "ethernum-rpg-module";
  TEMPLATE_PATH: string;
  RANKS: Rank[];
  ATTRIBUTE_RANK_BONUS: Record<Rank, number>;
  TALENT_RANK_BONUS: Record<Rank, number>;
  FE_COST_PER_LEVEL: Record<Rank, number>;
  RUNE_CLASSES: Record<RuneClassKey, RuneClassConfig>;
  MIN_RUNE_CLASS: number;
  MAX_RUNE_CLASS: number;
  MIN_LEVEL: number;
  MAX_LEVEL: number;
  RUNE_TRINITY: {
    VERBS: { tier1: string[]; tier2: string[]; tier3: string[] };
    NOUNS: string[];
    SOURCES: string[];
  };
  DEFAULT_ETHER_ATTRIBUTES: Record<string, EtherAttribute>;
  DEFAULT_TALENTS: Record<string, EtherAttribute>;
  DEFAULT_FE: { current: number; total: number };
}

export const ETHERNUM: EthernumConfig = {
  MODULE_NAME: "ethernum-rpg-module",
  TEMPLATE_PATH: "modules/ethernum-rpg-module/templates/",

  RANKS: ["F", "E", "D", "C", "B", "A", "S", "K"],

  ATTRIBUTE_RANK_BONUS: {
    "F": 2, "E": 4, "D": 6, "C": 8, "B": 10, "A": 12, "S": 15, "K": 20
  },

  TALENT_RANK_BONUS: {
    "F": 3, "E": 6, "D": 9, "C": 12, "B": 15, "A": 18, "S": 21, "K": 25
  },

  FE_COST_PER_LEVEL: {
    "F": 100,
    "E": 200,
    "D": 400,
    "C": 800,
    "B": 1600,
    "A": 3200,
    "S": 6400,
    "K": 12800
  },

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

  MIN_RUNE_CLASS: 1,
  MAX_RUNE_CLASS: 5,
  MIN_LEVEL: 1,
  MAX_LEVEL: 10,

  RUNE_TRINITY: {
    VERBS: {
      tier1: ["INFLINGIR", "SUSTENTAR", "IDENTIFICAR", "IMBUIR", "TRAVAR", "AGENDAR"],
      tier2: ["MOLDAR", "ATRAVESSAR", "REFLETIR", "MODIFICAR", "EXECUTAR", "RASTREAR"],
      tier3: ["DESTRUIR", "DOMINAR", "TRANSPORTAR", "CRIAR", "REESCREVER", "OTIMIZAR"]
    },
    NOUNS: [
      "Fogo", "Eletricidade", "Aço", "Corpo", "Mente", "Gelo", "Sombra", "Tempo",
      "Gravidade", "Natureza", "Luz", "Som", "Ar", "Sangue", "Destino", "Peso",
      "Velocidade", "Ligação", "Duração", "Destreza", "Ferocidade", "Água",
      "Vida", "Madeira", "Percepção"
    ],
    SOURCES: [
      "Sangue", "Calor", "Dor", "Memória", "Força", "Vigor", "Destreza",
      "Velocidade", "Personalidade", "Inteligência", "Sabedoria", "Conhecimento",
      "Coragem", "Sanidade", "Amor", "Raiva", "Desejo", "Empatia", "Sonho", "Éter"
    ]
  },

  DEFAULT_ETHER_ATTRIBUTES: {
    forca:         { value: 1, rank: "F", points: 0 },
    destreza:      { value: 1, rank: "F", points: 0 },
    constituicao:  { value: 1, rank: "F", points: 0 },
    inteligencia:  { value: 1, rank: "F", points: 0 },
    sabedoria:     { value: 1, rank: "F", points: 0 },
    carisma:       { value: 1, rank: "F", points: 0 }
  },

  DEFAULT_TALENTS: {
    investigacao:  { value: 1, rank: "F", points: 0 },
    percepcao:     { value: 1, rank: "F", points: 0 },
    furtividade:   { value: 1, rank: "F", points: 0 },
    atletismo:     { value: 1, rank: "F", points: 0 },
    acrobacia:     { value: 1, rank: "F", points: 0 },
    intimidacao:   { value: 1, rank: "F", points: 0 },
    persuasao:     { value: 1, rank: "F", points: 0 },
    enganacao:     { value: 1, rank: "F", points: 0 },
    medicina:      { value: 1, rank: "F", points: 0 },
    sobrevivencia: { value: 1, rank: "F", points: 0 },
    arcanismo:     { value: 1, rank: "F", points: 0 },
    religiao:      { value: 1, rank: "F", points: 0 },
    natureza:      { value: 1, rank: "F", points: 0 },
    sociedade:     { value: 1, rank: "F", points: 0 },
    ocultismo:     { value: 1, rank: "F", points: 0 }
  },

  DEFAULT_FE: {
    current: 0,
    total: 0
  }
};
