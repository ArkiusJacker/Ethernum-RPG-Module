# 🎲 Ethernum RPG Module - Guia Rápido

## 📖 Conceitos Básicos

### O que é Éter?
Éter é uma energia mágica que todos os personagens podem usar, independente da classe. Funciona como pontos de mana.

### O que são Runas?
Runas são artefatos mágicos equipáveis que consomem éter para ativar efeitos especiais.

---

## 🔮 Sistema de Éter

### Fórmulas de Cálculo

| Atributo | Fórmula |
|----------|---------|
| **Éter Máximo** | `10 + (INT × 2) + SAB + (Nível × 3)` |
| **Regeneração** | `max(1, (SAB + CON) / 2)` |
| **Poder de Éter** | `INT + CAR` |

### Exemplo Rápido
- Nível 5, INT +3, SAB +2, CON +1, CAR +1
- Éter Máx: 10 + 6 + 2 + 15 = **33**
- Regeneração: (2 + 1) / 2 = **1**
- Poder: 3 + 1 = **+4**

---

## 💎 Sistema de Runas

### Tipos de Runas

| Tipo | Uso Principal |
|------|---------------|
| ⚔️ **Ofensiva** | Causar dano |
| 🛡️ **Defensiva** | Proteção |
| ✨ **Suporte** | Buff/Cura |
| 🔧 **Utilidade** | Efeitos diversos |

### Propriedades de Runa

- **Nome**: Identificação da runa
- **Custo de Éter**: Quanto consome ao ativar
- **Poder**: Dados rolados (XdY)
- **Descrição**: O que a runa faz
- **Equipada**: ✅ Sim / ❌ Não

---

## 🎯 Ações Rápidas

### Na Ficha do Personagem

| Ação | Onde | O que Faz |
|------|------|-----------|
| Ver Éter | Aba "Sistema de Éter" | Visualiza status atual |
| Recalcular | Botão "Recalcular" | Atualiza valores baseados em atributos |
| Descansar | Botão "Descansar" | Restaura éter ao máximo |
| Adicionar Runa | Botão "+" | Cria nova runa |
| Equipar Runa | Ícone ⭕/✅ | Equipa/desequipa |
| Ativar Runa | Ícone 🎲 | Usa runa e consome éter |
| Deletar Runa | Ícone 🗑️ | Remove runa |

---

## 📊 Progressão Sugerida

### Por Nível de Personagem

| Nível | Custo Éter | Poder | Exemplo |
|-------|------------|-------|---------|
| 1-4 | 1-3 | 1d6-2d6 | Míssil Básico |
| 5-10 | 3-7 | 2d6-4d6 | Explosão de Fogo |
| 11-15 | 7-12 | 4d6-7d6 | Raio Devastador |
| 16-20 | 12-20 | 7d6-10d6 | Meteoro |
| 20+ | 20+ | 10d6+ | Parar o Tempo |

---

## 🎮 Macros Úteis

### Ver Éter Atual
```javascript
const actor = game.user.character;
const ether = actor.getFlag("ethernum-rpg-module", "etherSystem");
ui.notifications.info(`Éter: ${ether.etherCurrent}/${ether.etherMax}`);
```

### Gastar Éter Rápido (5 pontos)
```javascript
const actor = game.user.character;
const ether = actor.getFlag("ethernum-rpg-module", "etherSystem");
await actor.setFlag("ethernum-rpg-module", "etherSystem.etherCurrent", 
  Math.max(0, ether.etherCurrent - 5));
```

### Descanso Rápido
```javascript
const actor = game.user.character;
const ether = actor.getFlag("ethernum-rpg-module", "etherSystem");
await actor.setFlag("ethernum-rpg-module", "etherSystem.etherCurrent", 
  ether.etherMax);
```

---

## 💡 Dicas de Jogo

### ✅ Faça
- Balance runas entre tipos diferentes
- Guarde éter para emergências
- Equipar runas antes do combate
- Combine runas com habilidades de classe
- Descanse quando seguro

### ❌ Evite
- Usar todo éter no primeiro turno
- Criar runas muito caras para seu éter máx
- Ignorar regeneração de éter
- Equipar runas que não vai usar
- Esquecer de recalcular após subir de nível

---

## 🔍 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Aba não aparece | Ativar módulo / Reabrir ficha |
| Éter errado | Clicar "Recalcular" |
| Runa não ativa | Verificar éter suficiente |
| Valores zerados | Configurar atributos do personagem |

---

## 📚 Exemplos de Runas Prontas

### Iniciante (Nível 1-4)

**⚔️ Mísseis de Éter**
- Custo: 3 | Poder: 2d6
- Dispara projéteis de energia

**🛡️ Escudo Básico**
- Custo: 2 | Poder: 1d6
- Absorve dano

**✨ Cura Menor**
- Custo: 3 | Poder: 2d6
- Restaura vida

### Intermediário (Nível 5-10)

**⚔️ Explosão Arcana**
- Custo: 6 | Poder: 4d6
- Área de efeito

**🛡️ Barreira Reflexiva**
- Custo: 5 | Poder: 3d6
- Reflete dano

**🔧 Teleporte Curto**
- Custo: 4 | Poder: 2d6
- Move-se instantaneamente

---

## 📞 Recursos

- **Guia Completo**: [USER_GUIDE.md](USER_GUIDE.md)
- **Mais Macros**: [examples/MACROS.md](examples/MACROS.md)
- **Mais Runas**: [examples/RUNES.md](examples/RUNES.md)
- **Suporte**: [GitHub Issues](https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues)

---

## ⚡ Atalhos do Teclado

| Tecla | Ação |
|-------|------|
| Clicar na aba | Abre Sistema de Éter |
| Enter no input | Salva valor |
| Tab | Navega entre campos |

---

**Divirta-se jogando! 🎲✨**

*Versão 1.0.0 - Ethernum RPG Module*
