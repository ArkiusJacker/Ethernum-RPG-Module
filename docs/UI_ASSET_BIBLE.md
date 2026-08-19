# Ethernum RPG Module — UI Asset Bible

## Visual Asset Specification

> **Status:** Canonical UI asset specification
> **Introduced:** v3.7.7
> **Primary consumer:** Codex / Ethernum RPG Module
> **Initial asset pack:** Ethernum Company UI Asset Pack v1

Este documento define os assets visuais canônicos utilizados pelas interfaces do **Ethernum RPG Module**.

A partir da **v3.7.7**, elementos gráficos fornecidos especificamente para a interface devem ser tratados como parte oficial da identidade visual do projeto.

Eles **NÃO são apenas referências ou inspirações**.

Quando um asset canônico existir para determinado componente, a implementação deve utilizar esse asset em vez de tentar recriá-lo exclusivamente com CSS.

---

# 1. Instrução obrigatória para o Codex

Ao receber este arquivo junto dos assets visuais:

1. inspecionar visualmente todos os arquivos enviados;
2. associar cada arquivo ao `Asset ID` correto;
3. preservar o conteúdo deste documento como fonte principal do contrato visual;
4. atualizar somente:
   - nome real do arquivo;
   - path real;
   - dimensão física real;
   - aspect ratio real;
   - capacidade real de rotação/repetição, se necessário;
5. não reinterpretar os assets apenas como inspiração;
6. não recriar assets existentes utilizando somente CSS, gradients, pseudo-elements ou Font Awesome;
7. registrar qualquer asset ausente no diagnóstico da ficha;
8. nunca impedir a ficha de renderizar caso um asset falhe.

Os assets enviados pelo usuário são **canônicos**.

---

# 2. Filosofia

A interface é dividida em três responsabilidades.

## 2.1 HTML / Templates

Responsáveis por:

- conteúdo;
- dados;
- acessibilidade;
- estrutura;
- elementos interativos;
- informações dinâmicas;
- IDs;
- labels;
- valores;
- estados mecânicos.

## 2.2 CSS

Responsável por:

- layout;
- posicionamento;
- escala;
- responsividade;
- animações;
- hover;
- focus;
- estados;
- glow;
- cores dinâmicas;
- fallback;
- composição dos assets.

## 2.3 Assets gráficos

Responsáveis por:

- ornamentação;
- molduras;
- materiais;
- gravações;
- instrumentos;
- identidade visual;
- runas decorativas;
- elementos diegéticos;
- detalhes de acabamento;
- geometria ornamental complexa.

---

# 3. Regra fundamental

Nunca armazenar informação mecânica exclusivamente dentro de uma imagem.

## Proibido

- HP desenhado no asset;
- número de nível desenhado no asset;
- Company Rank fixo;
- nome do personagem;
- valor de recurso;
- modificador de Skill;
- nome de aba;
- custo;
- quantidade;
- contador;
- status que precise mudar em runtime.

Essas informações continuam sendo HTML.

Exemplo correto:

```html
<div class="eth-rank">
  <img
    src="modules/ethernum-rpg-module/assets/ui/ethernum/instruments/rank-ring.webp"
    aria-hidden="true"
    data-ui-asset="ETH-UI-03"
  >
  <span class="eth-rank__value">3</span>
</div>
```

---

# 4. Asset IDs

IDs possuem formato:

```text
[CORE]-UI-[NUMBER]
```

Prefixes atuais:

```text
ETH
Ethernum Company

CON
Concórdia

COM
Ethernum Field Communicator
```

Exemplo:

```text
ETH-UI-03
```

IDs devem permanecer estáveis entre versões.

O nome físico do arquivo pode mudar durante otimização.

O `Asset ID` não deve mudar sem migração explícita.

---

# 5. Diretórios

Assets otimizados utilizados pelo módulo:

```text
assets/ui/
```

Estrutura alvo:

```text
assets/ui/
├── shared/
│
├── ethernum/
│   ├── frames/
│   ├── corners/
│   ├── instruments/
│   ├── tabs/
│   ├── overlays/
│   ├── resources/
│   ├── accents/
│   └── icons/
│
├── concordia/
│   ├── frames/
│   ├── gears/
│   ├── pipes/
│   ├── instruments/
│   ├── parchment/
│   ├── diagrams/
│   └── textures/
│
└── communicator/
    ├── chassis/
    ├── icons/
    ├── instruments/
    └── overlays/
```

---

# 6. Arquivos-fonte

Quando necessário preservar versões originais em resolução máxima:

```text
assets/source/ui/
```

Esses arquivos não precisam ser carregados pelo Foundry em runtime.

As versões utilizadas pelo módulo ficam em:

```text
assets/ui/
```

Nunca sobrescrever silenciosamente o arquivo-fonte original durante otimização.

Fluxo recomendado:

```text
assets/source/ui/ethernum/
        ↓
optimization
        ↓
assets/ui/ethernum/
```

---

# 7. Formatos

Preferência geral:

```text
WebP
```

quando preservar corretamente:

- transparência;
- qualidade;
- detalhes;
- contornos;
- microgravações.

Utilizar PNG quando necessário.

SVG deve ser preferido para elementos puramente geométricos produzidos por código, como:

- ECG;
- ticks;
- linhas;
- indicadores;
- shapes simples;
- máscaras técnicas;
- medidores;
- divisores geométricos simples.

Não converter arte raster gerada em SVG apenas para fingir vetorização.

---

# 8. Transparência

Assets ornamentais devem normalmente possuir fundo transparente.

O elemento deve ser capaz de ser colocado sobre:

- painel;
- textura;
- background;
- retrato;
- conteúdo HTML.

Nenhum asset deve carregar um grande retângulo preto desnecessário se esse fundo puder ser realizado por CSS.

---

# 9. Acessibilidade

Todo asset puramente decorativo:

```html
aria-hidden="true"
```

e preferencialmente:

```css
pointer-events: none;
```

Assets não podem esconder conteúdo de leitores de tela.

Informações importantes continuam em HTML.

---

# 10. Aspect Ratio

Nunca distorcer um asset.

Evitar:

```css
width: 100%;
height: 100%;
```

quando isso alterar a proporção original.

Usar conforme necessário:

```css
object-fit: contain;
```

ou:

```css
background-size: contain;
```

ou:

```css
background-size: 100% 100%;
```

somente para assets explicitamente projetados para nine-slice/stretching.

---

# 11. Data attributes

Distinguir assets de UI de imagens de conteúdo.

## Asset ornamental

```html
<img data-ui-asset="ETH-UI-03">
```

## Imagem de conteúdo

```html
<img data-image-role="portrait">
```

Não aplicar indiscriminadamente as regras de thumbnails/portrait aos assets ornamentais.

---

# 12. Asset Registry

O módulo deve possuir um registry central.

Arquivo recomendado:

```text
scripts/ui/assets/EthernumUIAssetRegistry.ts
```

Estrutura:

```ts
export type EthernumUIAssetType =
  | "frame"
  | "corner"
  | "instrument"
  | "tab"
  | "overlay"
  | "resource"
  | "accent"
  | "icon";

export interface EthernumUIAssetDefinition {
  id: string;
  path: string;
  type: EthernumUIAssetType;

  repeatable?: boolean;
  rotatable?: boolean;
  tintable?: boolean;

  sourceWidth?: number;
  sourceHeight?: number;
  expectedAspectRatio?: number;
  preload?: boolean;
}
```

Exemplo:

```ts
export const ETHERNUM_UI_ASSETS = {
  ornamentalCorner: {
    id: "ETH-UI-01",
    path: "modules/ethernum-rpg-module/assets/ui/ethernum/corners/ornamental-corner.webp",
    type: "corner",
    rotatable: true,
    repeatable: false,
    preload: true,
  },

  rankRing: {
    id: "ETH-UI-03",
    path: "modules/ethernum-rpg-module/assets/ui/ethernum/instruments/rank-ring.webp",
    type: "instrument",
    rotatable: false,
    repeatable: false,
    preload: true,
  },
} satisfies Record<string, EthernumUIAssetDefinition>;
```

Os paths não devem ficar espalhados pelos templates.

---

# 13. Asset Pack Version

Versão inicial:

```ts
export const ETHERNUM_UI_ASSET_PACK_VERSION = 1;
```

Esta versão é independente da versão do módulo.

Ela representa mudanças no contrato dos assets.

---

# 14. Fonte de verdade

Quando houver conflito entre:

- CSS antigo;
- assets novos;
- mockup oficial;
- implementação anterior;

para **ornamentação visual da v3.7.7 em diante**:

```text
Asset canônico
+
UI_ASSET_BIBLE.md
+
mockup oficial
```

possuem prioridade.

Isso NÃO se aplica a:

- dados;
- regras;
- PF2e;
- mecânicas;
- permissões;
- ações;
- gameplay.

---

# ETHERNUM COMPANY — ASSET PACK V1

---

# ETH-UI-01 — Ethernum Ornamental Corner

## Função

Canto ornamental modular utilizado em:

- moldura externa;
- painéis importantes;
- cards maiores;
- componentes corporativos;
- containers principais.

## Diretório recomendado

```text
assets/ui/ethernum/corners/
```

## Nome recomendado

```text
ornamental-corner.webp
```

## Tipo

```text
corner
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Quadrado |
| Alpha | Sim |
| Rotacionável | Sim, se o asset real permitir |
| Repetível | Não |
| Tintable | Não por padrão |
| Conteúdo dinâmico | Nenhum |

Pode receber glow, opacity, brightness e filter leve via CSS.

Quando visualmente seguro, utilizar uma única imagem para `0deg`, `90deg`, `180deg`, `270deg`.

Não distorcer, não esticar e manter `pointer-events: none`.

---

# ETH-UI-02 — Ethernum Panel Edge / Divider

## Função

Borda estrutural e divisor longo utilizado para:

- divisões horizontais;
- bordas internas;
- início/fim de painéis;
- composição de frames escaláveis;
- organização do workspace.

## Diretório recomendado

```text
assets/ui/ethernum/frames/
```

## Nome recomendado

```text
panel-edge-divider.webp
```

## Tipo

```text
frame
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Horizontal |
| Alpha | Sim |
| Rotacionável | Opcional |
| Repetível | Se o desenho permitir repetição limpa |
| Tintable | Não por padrão |
| Conteúdo dinâmico | Nenhum |

Pode integrar `border-image`, nine-slice ou `background-repeat` quando apropriado.

Não usar `background-size: cover` se isso cortar a ornamentação.

---

# ETH-UI-03 — Ethernum Rank Ring

## Função

Instrumento circular utilizado para exibir o **Company Rank**.

## Diretório recomendado

```text
assets/ui/ethernum/instruments/
```

## Nome recomendado

```text
rank-ring.webp
```

## Tipo

```text
instrument
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Quadrado |
| Alpha | Sim |
| Rotacionável | Não |
| Repetível | Não |
| Tintable | Parcialmente via glow externo |
| Conteúdo dinâmico | Company Rank |

## Safe Area

Centro livre recomendado: aproximadamente **40–50% da largura total**, ajustado após inspeção do asset real.

O valor nunca deve estar baked na imagem.

## Regra crítica

PF2e Level e Ethernum Company Rank são conceitos diferentes.

Nunca:

```text
PF2e Level
↓
Company Rank fallback
```

Resolver Rank através de:

```text
explicit company rank
↓
company identity / squad rank
↓
—
```

---

# ETH-UI-04 — Ethernum HP Monitor Frame

## Função

Instrumento visual do HP.

## Diretório recomendado

```text
assets/ui/ethernum/instruments/
```

## Nome recomendado

```text
hp-monitor-frame.webp
```

## Tipo

```text
instrument
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Horizontal |
| Alpha | Sim |
| Rotacionável | Não |
| Repetível | Não |
| Tintable | Não |

## Conteúdo dinâmico

O HTML deve inserir:

```text
HP atual
HP máximo
Temporary HP
barra
ECG
```

## Safe Areas

Reservar zonas internas para:

1. valores;
2. barra;
3. ECG;
4. label de PV, quando necessário.

O asset permanece estático.

Animações ficam em HTML/CSS/SVG.

Preferir para a barra:

```css
transform: scaleX(var(--hp-ratio));
transform-origin: left center;
```

ECG deve ser SVG/CSS, nunca uma imagem diferente por estado de HP.

---

# ETH-UI-05 — Ethernum Portrait Frame

## Função

Moldura do retrato principal do personagem.

## Diretório recomendado

```text
assets/ui/ethernum/frames/
```

## Nome recomendado

```text
portrait-frame.webp
```

## Tipo

```text
frame
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Quadrado ou vertical curto, conforme asset real |
| Alpha | Sim |
| Rotacionável | Não |
| Repetível | Não |
| Tintable | Não |
| Conteúdo dinâmico | `Actor.img` |

## Layering

```text
portrait image
↓
portrait frame
↓
optional status accents
```

O asset nunca deve conter personagem desenhado.

Preservar no retrato:

```css
object-fit: cover;
object-position: center;
```

---

# ETH-UI-06 — Ethernum Tab Frame — Inactive

## Função

Base visual para uma aba inativa.

## Diretório recomendado

```text
assets/ui/ethernum/tabs/
```

## Nome recomendado

```text
tab-inactive.webp
```

## Tipo

```text
tab
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Horizontal |
| Alpha | Sim |
| Rotacionável | Não |
| Repetível | Sim entre tabs |
| Tintable | Não por padrão |
| Conteúdo dinâmico | ícone, label, badge |

O label nunca deve fazer parte da imagem.

---

# ETH-UI-07 — Ethernum Tab Frame — Active

## Função

Versão selecionada da aba.

## Diretório recomendado

```text
assets/ui/ethernum/tabs/
```

## Nome recomendado

```text
tab-active.webp
```

## Tipo

```text
tab
```

## Contrato

| Campo | Valor |
|---|---|
| Formato base | Horizontal |
| Alpha | Sim |
| Rotacionável | Não |
| Repetível | Sim |
| Tintable | Glow adicional via CSS |
| Conteúdo dinâmico | ícone, label, badge |

Deve possuir proporção e safe area compatíveis com `ETH-UI-06` para evitar layout shift na troca de estado.

---

# ETH-UI-08 — Ethernum Rune Overlay

## Função

Camada decorativa de fundo.

## Diretório recomendado

```text
assets/ui/ethernum/overlays/
```

## Nome recomendado

```text
rune-overlay.webp
```

## Tipo

```text
overlay
```

## Contrato

| Campo | Valor |
|---|---|
| Formato | Amplo / retangular |
| Alpha | Sim |
| Rotacionável | Opcional |
| Repetível | Somente sem seams visíveis |
| Tintable | Opacity/filter/brightness leve |
| Conteúdo dinâmico | Nenhum |

Opacidade recomendada em runtime:

```text
3%–8%
```

Obrigatório:

```css
pointer-events: none;
```

Nunca competir com texto e nunca representar mecanicamente uma runa específica.

No High Contrast Mode, pode ser removido.

---

# ETH-UI-09 — Ethernum Resource Gem — Filled

## Função

Marcador ativo/preenchido de recurso.

## Diretório recomendado

```text
assets/ui/ethernum/resources/
```

## Nome recomendado

```text
resource-gem-filled.webp
```

## Tipo

```text
resource
```

## Contrato

| Campo | Valor |
|---|---|
| Formato | Quadrado pequeno |
| Alpha | Sim |
| Rotacionável | Não necessário |
| Repetível | Sim |
| Tintable | Somente se visualmente seguro |
| Conteúdo dinâmico | Nenhum |

Possíveis usos:

- Hero Points;
- Focus Points;
- FE;
- charges;
- recursos discretos apropriados.

---

# ETH-UI-10 — Ethernum Resource Gem — Empty

## Função

Marcador vazio/inativo.

## Diretório recomendado

```text
assets/ui/ethernum/resources/
```

## Nome recomendado

```text
resource-gem-empty.webp
```

## Tipo

```text
resource
```

## Contrato

| Campo | Valor |
|---|---|
| Formato | Mesmo tamanho/proporção de ETH-UI-09 |
| Alpha | Sim |
| Repetível | Sim |
| Conteúdo dinâmico | Nenhum |

Deve ser geometricamente compatível com `ETH-UI-09` para evitar layout shift.

---

# ETH-UI-11 — Ethernum Skill / Row Accent Marker

## Função

Pequeno accent utilizado em:

- Skills;
- listas;
- atributos;
- rows interativas;
- subinformações;
- quick rolls.

## Diretório recomendado

```text
assets/ui/ethernum/accents/
```

## Nome recomendado

```text
skill-row-accent.webp
```

## Tipo

```text
accent
```

## Contrato

| Campo | Valor |
|---|---|
| Alpha | Sim |
| Repetível | Sim |
| Tintable | Pode receber glow ciano |
| Conteúdo dinâmico | Nenhum |

Pode reagir a:

```text
hover
focus
roll feedback
```

Não deve aumentar significativamente a altura da row.

---

# ETH-UI-12 — Ethernum Small Icon Frame

## Função

Moldura reutilizável para pequenos ícones.

## Diretório recomendado

```text
assets/ui/ethernum/frames/
```

## Nome recomendado

```text
small-icon-frame.webp
```

## Tipo

```text
frame
```

## Contrato

| Campo | Valor |
|---|---|
| Formato | Quadrado |
| Alpha | Sim |
| Repetível | Sim |
| Tintable | Não por padrão |
| Conteúdo dinâmico | ícone central |

O ícone pode ser:

```text
Font Awesome
SVG
custom icon
```

O centro deve possuir safe area suficiente.

O frame nunca deve possuir símbolo funcional fixo baked no asset.

---

# ETH-UI-13 — Ethernum Ornamental Divider

## Função

Divisor decorativo menor utilizado para:

- subtítulos;
- grupos;
- headers secundários;
- separações pequenas;
- detalhes de painel.

## Diretório recomendado

```text
assets/ui/ethernum/accents/
```

## Nome recomendado

```text
ornamental-divider.webp
```

## Tipo

```text
accent
```

## Contrato

| Campo | Valor |
|---|---|
| Formato | Horizontal |
| Alpha | Sim |
| Repetível | Não obrigatoriamente |
| Tintable | Não por padrão |
| Conteúdo dinâmico | Nenhum |

Diferença conceitual:

```text
ETH-UI-02 = estrutura
ETH-UI-13 = ornamentação
```

---

# 15. Nine-Slice Assets

Sempre que um frame precisar acomodar conteúdos de tamanhos diferentes, preferir **nine-slice** / `border-image` em vez de esticar o asset inteiro.

Estrutura conceitual:

```text
┌───┬──────────────┬───┐
│ TL│     TOP      │TR │
├───┼──────────────┼───┤
│ L │   CONTENT    │ R │
├───┼──────────────┼───┤
│ BL│    BOTTOM    │BR │
└───┴──────────────┴───┘
```

As regiões de canto preservam proporção.

As bordas podem esticar ou repetir dependendo do asset.

O centro permanece HTML/CSS.

---

# 16. Classes recomendadas

Criar helpers visuais reutilizáveis.

Exemplo:

```css
.eth-ui-asset {
  pointer-events: none;
  user-select: none;
}

.eth-frame {
  position: relative;
}

.eth-frame__asset {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.eth-frame__content {
  position: relative;
  z-index: 1;
}
```

Variantes possíveis:

```text
.eth-frame--major
.eth-frame--minor
.eth-frame--instrument
.eth-frame--interactive
.eth-frame--compact
```

---

# 17. Composição de layers

Ordem recomendada:

```text
background
↓
rune overlay
↓
frame asset
↓
content HTML
↓
state / interaction overlay
↓
focus outline
```

Não colocar ornamentação sobre texto importante.

---

# 18. Preloader

Criar preloader pequeno somente para assets frequentemente exibidos.

Pré-carregar prioritariamente:

```text
ETH-UI-01
ETH-UI-03
ETH-UI-04
ETH-UI-05
ETH-UI-06
ETH-UI-07
```

Arquivo sugerido:

```text
scripts/ui/assets/EthernumUIAssetPreloader.ts
```

Não carregar todos os assets do módulo antecipadamente.

---

# 19. Missing Asset

Se um asset não estiver disponível, a interface deve permanecer funcional.

Fluxo:

```text
asset found
→ canonical presentation

asset missing
→ CSS fallback
→ diagnostic warning
```

Nunca:

```text
asset missing
→ sheet render failure
```

---

# 20. Fallback CSS

O fallback deve ser simples.

Ele NÃO deve tentar reconstruir a concept art completa.

Exemplo:

```css
.eth-rank.is-asset-missing {
  border: 1px solid var(--eth-gold);
  border-radius: 50%;
  background: var(--eth-panel);
}
```

Objetivo:

```text
functional
not beautiful
```

Isso facilita detectar assets ausentes sem quebrar a ficha.

---

# 21. Diagnostics

Character Sheet Diagnostics deve mostrar:

```text
UI Theme: Ethernum Fidelity
UI Asset Pack: 1
Loaded Assets: X
Missing Assets: Y
```

Para cada asset ausente:

```text
ETH-UI-04
Expected:
assets/ui/ethernum/instruments/hp-monitor-frame.webp
```

Registrar também:

```text
Reference Overlay: On / Off
Motion Mode
High Contrast
```

---

# 22. Otimização

Antes da distribuição, verificar:

- file size;
- decode time;
- dimensions;
- alpha;
- visual artifacts;
- repeated usage count.

Objetivos gerais:

Pequenos ornamentos:

```text
idealmente dezenas de KB
```

Assets maiores:

```text
idealmente abaixo de algumas centenas de KB
```

sem sacrificar qualidade perceptível.

Não utilizar resolução absurdamente maior que o necessário.

---

# 23. Retina / HiDPI

Sempre que apropriado, manter resolução física aproximadamente:

```text
2× o tamanho CSS esperado
```

Exemplo:

Render esperado:

```text
128 × 128
```

Source:

```text
256 × 256
```

Não exigir exatamente esta relação quando o asset necessitar mais detalhes.

---

# 24. Responsividade

Em telas pequenas, ornamentação pode ser reduzida ou escondida.

Dados nunca.

Prioridade:

```text
1. Function
2. Content
3. Legibility
4. Identity
5. Decoration
```

---

# 25. Breakpoints

Validar pelo menos:

```text
1200px
1000px
800px
650px
```

---

# 26. Compact Mode

No Compact Mode pode remover/reduzir:

- Rune Overlay;
- divisores secundários;
- corners menores;
- glow;
- texturas;
- detalhes extras.

Preservar:

- portrait;
- HP;
- Company Rank quando existente;
- recursos;
- tabs;
- estados;
- controles.

---

# 27. High Contrast

High Contrast pode desativar:

```text
ETH-UI-08 Rune Overlay
```

e reduzir texturas, engravings de baixa opacidade e decorative glow.

Frames estruturais permanecem.

---

# 28. Motion

Assets são predominantemente estáticos.

Animações devem ocorrer no container.

Permitido:

```text
opacity
transform
filter
glow
```

Evitar deformar o asset, stretch animado ou rotação contínua desnecessária.

---

# 29. Reduced Motion

Respeitar:

```css
@media (prefers-reduced-motion: reduce)
```

e o `CharacterSheetMotionService`.

Modes:

```text
Full
Reduced
Off
```

---

# 30. Pointer Events

Quase toda ornamentação deve utilizar:

```css
pointer-events: none;
```

Os controles reais continuam HTML.

Isso evita assets bloqueando:

- Skill rolls;
- tabs;
- Strike buttons;
- item rows;
- resource controls.

---

# 31. Visual Reference Overlay

A v3.7.7 deve possuir ferramenta de desenvolvimento para comparação com o mockup.

Feature:

```text
Visual Reference Overlay
```

Somente GM/debug.

Funções:

- opacity;
- scale;
- x offset;
- y offset;
- fit width;
- fit height.

A imagem de referência deve usar:

```css
pointer-events: none;
```

O objetivo é comparar:

```text
mockup
vs
implementação
```

---

# 32. Reference Overlay e assets

O overlay é uma ferramenta de desenvolvimento.

Ele NÃO substitui os assets.

Nunca distribuir a ficha como:

```text
mockup image as background
+
clickable HTML on top
```

A composição final deve continuar modular.

---

# 33. Template split

A partir da v3.7.7, Ethernum pode possuir composição visual própria.

Estrutura recomendada:

```text
templates/sheets/ethernum/
├── shell.html
├── header.html
├── navigation.html
├── overview.html
├── combat.html
├── inventory.html
├── feats.html
├── spellcasting.html
├── ether.html
├── runes.html
├── unique.html
└── effects.html
```

Não duplicar lógica.

Somente composição visual quando necessário.

---

# 34. Shared behavior

Continuam compartilhados:

```text
PF2eCharacterAdapter
PF2ePreparedDataService
PF2eCharacterBridge
CharacterSheetController
CharacterSheetViewportService
CharacterSheetMotionService
CharacterRichTextService
UniqueMechanic services
```

Templates diferentes podem consumir os mesmos ViewModels.

---

# 35. Ethernum visual identity

O Asset Pack Ethernum deve transmitir:

```text
blackened steel
graphite
aged gold
controlled cyan aether
industrial engraving
corporate precision
runic technology
symmetry
operative equipment
```

Não utilizar como identidade predominante:

```text
leather
parchment
handwritten scribbles
copper workshop
organic asymmetry
```

Esses elementos pertencem principalmente à Concórdia.

---

# 36. Company Rank

O `ETH-UI-03` existe para Company Rank.

A implementação deve resolver dados por serviço compartilhado.

Arquivo recomendado:

```text
CompanyIdentityService.ts
```

Snapshot:

```ts
export interface CompanyIdentitySnapshot {
  codename?: string;
  rank?: number;
  squad?: string;
  department?: string;
  operationalStatus?: string;
}
```

Nunca utilizar PF2e Level como Rank da Company.

---

# 37. HP Monitor

O `ETH-UI-04` é somente frame.

Elementos dinâmicos:

```text
PV
current / max
temp
HP bar
ECG
status
```

Estados visuais:

```text
healthy
injured
critical
zero
```

podem alterar glow e cores sem mudar o asset.

---

# 38. Tabs

`ETH-UI-06` e `ETH-UI-07` devem manter a mesma área funcional.

Não permitir layout shift durante:

```text
inactive → active
```

Texto e ícone continuam HTML.

---

# 39. Resource Gems

`ETH-UI-09` e `ETH-UI-10` devem possuir as mesmas dimensões renderizadas.

Exemplo:

```html
<div class="eth-resource-track">
  <img data-ui-asset="ETH-UI-09" aria-hidden="true">
  <img data-ui-asset="ETH-UI-09" aria-hidden="true">
  <img data-ui-asset="ETH-UI-10" aria-hidden="true">
</div>
```

---

# 40. Rune Overlay

`ETH-UI-08` é decorativo.

Não utilizar para mostrar:

- runa selecionada;
- fórmula mecânica;
- autorização real;
- source;
- verbo;
- substantivo.

Esses continuam dados do sistema.

---

# 41. Content images

Não confundir os assets deste documento com:

```text
Actor portrait
Item icons
Feat icons
Spell icons
Action icons
Unique Mechanic art
```

Esses continuam usando o Image Role System.

---

# 42. Performance targets

Validar:

```text
Initial Render
Tab Change
HP Update
Skill Roll
Inventory Update
Unique Update
```

Asset loading não deve provocar regressões grandes.

Evitar centenas de nós `<img>` para ornamentação simples.

Quando apropriado, `background-image`, pseudo-element ou shared asset pode ser usado para posicionar o asset canônico.

A proibição é contra **recriar a arte em CSS**, não contra aplicar o asset via CSS.

---

# 43. CSS usage permitido

Permitido:

```css
background-image: var(--eth-panel-frame);
```

onde a variável aponta para o asset canônico.

Permitido:

```css
mask-image: url(...);
```

se o asset tiver sido explicitamente projetado para isso.

Permitido:

```css
filter: drop-shadow(...);
```

Não permitido:

recriar visualmente o asset inteiro com gradients quando ele já existir.

---

# 44. Futuros Asset Packs

Planejado:

```text
CONCORDIA_UI_ASSET_PACK_VERSION
```

para:

```text
v3.7.8
```

Posteriormente:

```text
COMMUNICATOR_UI_ASSET_PACK_VERSION
```

A mesma infraestrutura de registry pode ser reutilizada.

A identidade dos cores não deve ser misturada.

---

# 45. Future compatibility

O registry deve permitir futuramente:

```ts
resolveUIAsset("ETH-UI-03")
resolveUIAsset("CON-UI-04")
resolveUIAsset("COM-UI-02")
```

sem acoplar consumidores ao path físico.

---

# 46. Não criar runtime image generation

Os assets deste documento são:

```text
build-time / repository assets
```

Não gerar imagens em runtime dentro do Foundry.

Motivos:

- consistência;
- performance;
- offline use;
- determinismo;
- segurança;
- estética canônica.

---

# 47. Testes

Criar testes de contrato para:

```text
ETH-UI-01
ETH-UI-02
ETH-UI-03
ETH-UI-04
ETH-UI-05
ETH-UI-06
ETH-UI-07
ETH-UI-08
ETH-UI-09
ETH-UI-10
ETH-UI-11
ETH-UI-12
ETH-UI-13
```

Validar:

- registry;
- unique IDs;
- paths;
- fallback;
- no duplicate IDs;
- asset pack version.

---

# 48. Manual visual validation

Após integrar os assets, realizar screenshots de:

```text
Overview
Combat
Inventory
Feats
Spellcasting
Ether
Runes
Unique
Effects
```

Tamanhos:

```text
1200px
1000px
800px
650px
```

Zoom:

```text
80%
100%
125%
```

---

# 49. Visual Fidelity checklist

Comparar com o mockup oficial:

```text
[ ] Outer visual framing
[ ] Portrait framing
[ ] Company Rank ring
[ ] HP monitor
[ ] Hero/resources
[ ] Navigation tabs
[ ] Panel corners
[ ] Structural dividers
[ ] Ornamental dividers
[ ] Rune background
[ ] Skill row accents
[ ] Icon framing
[ ] Density
[ ] Spacing
[ ] Cyan/gold balance
[ ] Readability
```

---

# 50. Asset inspection table

O Codex deve preencher esta tabela após importar os arquivos reais.

| ID | File | Path | Source Size | Aspect | Alpha | Rotatable | Repeatable | Status |
|---|---|---|---:|---:|---|---|---|---|
| ETH-UI-01 | `ornamental-corner.webp` | `assets/ui/ethernum/corners/` | 1254x1254 | 1.000 | Yes | Yes | No | Integrated |
| ETH-UI-02 | `panel-edge-divider.webp` | `assets/ui/ethernum/frames/` | 2087x101 | 20.663 | Yes | No | Yes | Integrated |
| ETH-UI-03 | `rank-ring.webp` | `assets/ui/ethernum/instruments/` | 1254x1254 | 1.000 | Yes | No | No | Integrated |
| ETH-UI-04 | `hp-monitor-frame.webp` | `assets/ui/ethernum/instruments/` | 1707x420 | 4.064 | Yes | No | No | Integrated |
| ETH-UI-05 | `portrait-frame.webp` | `assets/ui/ethernum/frames/` | 981x1125 | 0.872 | Yes | No | No | Integrated |
| ETH-UI-06 | `tab-frame-inactive.webp` | `assets/ui/ethernum/tabs/` | 2069x274 | 7.551 | Yes | No | Yes | Integrated |
| ETH-UI-07 | `tab-frame-active.webp` | `assets/ui/ethernum/tabs/` | 2172x275 | 7.898 | Yes | No | Yes | Integrated |
| ETH-UI-08-A | `rune-overlay-a.webp` | `assets/ui/ethernum/overlays/` | 1677x938 | 1.788 | Yes | Yes | No | Integrated |
| ETH-UI-08-B | `rune-overlay-b.webp` | `assets/ui/ethernum/overlays/` | 1677x938 | 1.788 | Yes | Yes | No | Integrated |
| ETH-UI-09 | `resource-gem-filled.webp` | `assets/ui/ethernum/resources/` | 1254x1254 | 1.000 | Yes | No | Yes | Integrated |
| ETH-UI-10 | `resource-gem-empty.webp` | `assets/ui/ethernum/resources/` | 1254x1254 | 1.000 | Yes | No | Yes | Integrated |
| ETH-UI-11 | `skill-row-accent.webp` | `assets/ui/ethernum/accents/` | 246x1059 | 0.232 | Yes | No | Yes | Integrated |
| ETH-UI-12 | `small-icon-frame.webp` | `assets/ui/ethernum/icons/` | 1254x1254 | 1.000 | Yes | No | Yes | Integrated |
| ETH-UI-13 | `ornamental-divider.webp` | `assets/ui/ethernum/accents/` | 1565x165 | 9.485 | Yes | No | No | Integrated |

## Runtime optimization record

The supplied PNG files remain untouched in the official source package. Runtime copies are lossless WebP files resized for HiDPI presentation and registered centrally by `EthernumUIAssetRegistry`. The complete runtime pack is approximately 1.5 MB instead of approximately 7.5 MB, while preserving alpha, aspect ratio and canonical artwork.

The conceptual alias `ETH-UI-08` resolves to `ETH-UI-08-A`; both approved physical overlays remain individually addressable as `ETH-UI-08-A` and `ETH-UI-08-B`.

**Não remover esta tabela.** Atualizá-la durante a implementação.

---

# 51. Release checklist — v3.7.7

Antes de concluir a integração:

```text
[ ] Todos os 13 assets foram identificados
[ ] Todos possuem Asset ID
[ ] Registry criado
[ ] Asset Pack Version = 1
[ ] Paths centralizados
[ ] UI Asset Bible atualizado com filenames reais
[ ] Source dimensions registradas
[ ] Missing asset fallback testado
[ ] Diagnostics atualizado
[ ] Ethernum templates usam os assets
[ ] CSS antigo não recria os mesmos ornamentos
[ ] Scroll permanece preservado
[ ] Focus permanece preservado
[ ] PF2e source of truth intacto
[ ] Company Rank separado de PF2e Level
[ ] Pipping não regrediu
[ ] Concórdia não regrediu
[ ] Communicator não regrediu
[ ] Responsive validado
[ ] Reduced Motion validado
[ ] High Contrast validado
[ ] CI verde
```

---

# 52. Regra final

A pergunta correta não é:

```text
"como posso recriar este asset com CSS?"
```

A pergunta correta é:

```text
"como posso integrar este asset mantendo a UI dinâmica,
responsiva, acessível e compatível com PF2e?"
```

Esse é o princípio do **Visual Fidelity Arc**.

---

# 53. Próxima expansão

A próxima expansão deste documento será:

```text
CONCORDIA UI ASSET PACK
```

planejada para uma versão posterior ao arco de calibração Ethernum:

```text
versão futura
```

Ela deverá adicionar IDs:

```text
CON-UI-XX
```

sem substituir nem reutilizar a identidade visual dos assets Ethernum.

Posteriormente:

```text
COMMUNICATOR UI ASSET PACK
```

Status:

```text
AWAITING CANONICAL ASSETS
```

utilizará:

```text
COM-UI-XX
```

A infraestrutura pode ser compartilhada.

A arte não.

O registry compartilhado aceita os namespaces `ETH-UI`, `CON-UI` e `COM-UI`.
Enquanto o pacote canônico do Comunicador não for fornecido, resoluções `COM-UI`
retornam vazio e a apresentação CSS atual permanece como fallback oficial. Nenhum
raster provisório deve ser tratado como arte canônica.

---

# 54. Nota final para o Codex

Os arquivos anexados pelo usuário junto deste documento fazem parte da identidade oficial do projeto.

Ao implementar:

```text
PRESERVE THE ASSET
PRESERVE THE FUNCTION
PRESERVE THE DATA
PRESERVE ACCESSIBILITY
PRESERVE RESPONSIVENESS
```

O código deve se adaptar à arte canônica.

A arte canônica não deve ser descartada para simplificar o código.

---

# 55. Calibração óptica — v3.7.8

A dimensão física do arquivo não representa necessariamente o tamanho visual do instrumento. Cada definição do registry passa a declarar `visual`, com:

```text
preferredWidth / preferredHeight
minWidth / minHeight
maxWidth / maxHeight
opticalScale
opacity
fit
contentInset
```

Esses valores são publicados pelo shell como variáveis CSS e formam uma única fonte de verdade para composição e responsividade.

Alvos principais da ficha padrão:

| Instrumento | Alvo |
| --- | --- |
| Retrato | 150 × 172 px |
| Rank | 124 × 124 px |
| Monitor de PV | 112 px de altura |
| Gema do cabeçalho | 32 px |
| Gema do Overview | 26 px |
| Gema compacta | nunca menor que 20 px |

O cabeçalho usa duas linhas explícitas. A primeira pertence somente às ações da ficha. A segunda contém retrato, identidade, Rank, PV e Hero, sem posicionamento absoluto entre esses instrumentos.

Os frames de navegação são imagens completas sobre cada tab; os cantos e divisores usam os assets oficiais sem borda, fundo ou sombra herdados do Foundry. Overlays permanecem decorativos, não interceptam eventos e respeitam alto contraste e movimento reduzido.

O launcher minimizado do Comunicador possui posição própria, independente da janela aberta. O jogador pode arrastá-lo dentro do viewport e travá-lo; posição e trava são persistidas localmente por mundo e usuário.
