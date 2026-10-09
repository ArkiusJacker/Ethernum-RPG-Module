import { isSafeSfxPath } from "./rules.js";

export const soundCategories = [
  ["00_CORE", "Núcleo", "Roleta, interface, celular e transições."],
  ["01_CYBERPUNK", "Cyberpunk", "Tecnologia, varredura e cromo."],
  ["02_DEVIL_MAY_CRY", "Devil May Cry", "Combate corpo a corpo e estilo."],
  ["03_DOOM", "DOOM", "Armas pesadas e impacto."],
  ["04_NO_MORE_HEROES", "No More Heroes", "Katana de feixe e sons arcade."],
  ["05_TRIGUN", "Trigun", "Revólveres, duelos e disparos energéticos."],
  ["06_ULTIMATE", "Ultimate", "Glitches, Blackwall e revelações."],
  ["07_STYLE_RANK", "Style Rank", "Combos e classificação de estilo."],
  ["08_VOICE_LINES", "Vozes", "Chamadas, falas e citações."],
  ["09_THEMES", "Temas", "Combate, exploração, vitória e cenas dramáticas."],
  ["10_AMBIENCE", "Ambiência", "Passos, esquivas, impactos e ambientes."],
];

export const soundEffects = [
  { id: "gui-open", name: "Abrir interface", category: "00_CORE", file: "CORE_GUI_Open.mp3", audience: "v", trigger: "sheet-open", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "gui-loop", name: "Loop da interface", category: "00_CORE", file: "CORE_GUI_Loop.mp3", audience: "v", trigger: "sheet-open", loop: true, defaultVolume: 0.45, stopPolicy: "sheet-close" },
  { id: "phone-call", name: "Chamada de celular", category: "00_CORE", file: "CORE_Phone_Call.mp3", audience: "v", trigger: "manual", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "phone-notification", name: "Notificação do celular", category: "00_CORE", file: "CORE_Phone_Notification.mp3", audience: "v", trigger: "manual", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "eurodollar-transfer", name: "Transferência de eurodólares", category: "00_CORE", file: "CORE_Eurodollar_Transfer.mp3", audience: "v", trigger: "currency-update", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "scanner-open", name: "Abrir scanner", category: "01_CYBERPUNK", file: "CP_Scanner_Open.mp3", audience: "v", trigger: "recall-knowledge", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "relic-malfunction", name: "Falha do Relic", category: "01_CYBERPUNK", file: "CP_Relic_Malfunction.mp3", audience: "v", trigger: "ultimate-use", loop: false, defaultVolume: 0.75, stopPolicy: "once" },
  { id: "knife-headshot", name: "Impacto de faca", category: "10_AMBIENCE", file: "AMB_Melee_Knife_Headshot_01.mp3", audience: "all", trigger: "manual", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "blackwall-recalculate", name: "Recalcular Blackwall", category: "06_ULTIMATE", file: "ULT_Blackwall_Recalculate.mp3", audience: "all", trigger: "valid-glitch", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "mission-complete", name: "Missão concluída", category: "09_THEMES", file: "THEME_Mission_Complete.mp3", audience: "all", trigger: "gm-mission-complete", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "level-up", name: "Level up", category: "09_THEMES", file: "THEME_Level_Up.wav", audience: "all", trigger: "gm-level-up", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "theme-chipping-in", name: "Chippin' In", category: "09_THEMES", file: "THEME_Chipping_In.mp3", audience: "all", trigger: "manual", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "theme-rebel-path", name: "The Rebel Path", category: "09_THEMES", file: "THEME_Rebel_Path.mp3", audience: "all", trigger: "manual", loop: false, defaultVolume: 0.7, stopPolicy: "once" },
  { id: "theme-v", name: "V Theme", category: "09_THEMES", file: "THEME_V.mp3", audience: "all", trigger: "manual", loop: true, defaultVolume: 0.55, stopPolicy: "gm-stop" },
];

export function soundPath(sound) {
  const path = sound.path ?? `modules/ethernum-v-redhand/audio/${sound.category}/${sound.file}`;
  if (!isSafeSfxPath(path)) throw new Error("Caminho SFX inválido: use apenas arquivos dentro de audio/ do add-on.");
  return path.replaceAll("\\", "/");
}
