# v3.8.11 — Relatório de QA Foundry

## Resultado

**Aprovado para publicação.** O candidato final da versão 3.8.11 foi compilado, copiado sem limpeza destrutiva para o Data Folder do Foundry e recarregado no mundo real `Testes para não matar o mundo`.

Ambiente validado:

- Foundry Virtual Tabletop 13, build 351;
- Pathfinder Second Edition 7.8.0;
- módulo instalado `ethernum-rpg-module` 3.8.11;
- Gamemaster primário `Gamemaster`, Gamemaster secundário `ChatGPT Gamemaster` e jogador `Bayle` conectados simultaneamente.

## Fluxos exercitados

1. **Multiplayer e autoridade:** os dois GMs e Bayle ficaram online ao mesmo tempo; o Command Device reconheceu o mestre primário e permaneceu exclusivo de GM.
2. **Command Device e Comunicador:** ambos ficaram abertos lado a lado no viewport real de 1280 × 720, sem sobreposição entre os painéis. Esse tamanho também exercitou o modo compacto abaixo da altura mínima recomendada pelo próprio Foundry.
3. **Teclado:** `ArrowRight` moveu o foco de Operações para Contratos e `Enter` ativou o painel correspondente, preservando `aria-selected` e o tabpanel correto.
4. **Catálogo rúnico:** a ficha PF2e original expôs o seletor Ethernum e a aba de runas. As classes canônicas apareceram como `Manifestation`, `Disruption` e `Event Horizon` em inglês e como `Manifestação`, `Disrupção` e `Horizonte de Eventos` em português do Brasil.
5. **Preservação rúnica:** nenhuma runa foi criada ou alterada no ator real. IDs estáveis, aliases históricos, valores desconhecidos/customizados e idempotência da migração foram cobertos pela suíte automatizada.
6. **Contratos e PDF:** o Contrato 01 abriu pelo Comunicador; o PDF oficial carregou com 13 páginas e navegou de `1 / 13` para `2 / 13`.
7. **Loja:** o perfil de QA permaneceu em `Catalog unavailable / No offer is released for this profile`; nenhuma compra ou publicação foi executada.
8. **Localização:** Comunicador, Command Device e catálogo rúnico foram exercitados em EN e PT-BR. Ao final, a preferência original do cliente foi restaurada para inglês.
9. **Movimento reduzido:** a preferência do Comunicador foi aplicada em `Reduzido`, validada na interface e restaurada para `Completo`.
10. **Smoke final:** após o último build e a cópia final para o Data Folder, uma nova recarga confirmou Comunicador, Command Device, `LOCAL DATA READY`, telemetria dos GMs e os três usuários online.

## Gates automatizados

- `npm run typecheck`: aprovado;
- `npm test -- --run`: **103 arquivos / 704 testes** aprovados;
- `npm run build`: aprovado;
- `npm run validate:manifest`: aprovado, 13 referências;
- `npm run validate:dist`: aprovado, incluindo imports locais;
- `npm audit --omit=dev`: 0 vulnerabilidades de produção;
- pacote: 77 arquivos no `dist`, 79 entradas no ZIP, 38.663.166 bytes expandidos e nenhuma entrada proibida;
- manifesto dentro do ZIP idêntico ao manifesto do `dist`.

## Pacote candidato

- `ethernum-rpg-module.zip`: 35.498.883 bytes (33,85 MiB);
- ZIP SHA-256: `F06BE01DBF632CA42E3D298800C4BEB5ABBF200EB4E10F39DA5C731F96FC450E`;
- `module.json` SHA-256: `FCFFF5747F292E9FC6F8E0AD880400B2A9DD08A0C1DF6C65923AFBC464737D94`;
- sem arquivos `.ts`, `.map`, `tests`, `docs/qa`, `node_modules` ou `.git` no artefato;
- 0 grupos de duplicatas exatas e 0 arquivos de arte-fonte.

## Proteção de dados

Nenhum ator, item, contrato, oferta, registro de loja ou documento de QA foi apagado. Nenhuma compra, recompensa, concessão de Fulgor, aplicação de Mecânica NPC ou edição rúnica foi realizada. A implantação substituiu somente arquivos do módulo pela saída final do build e não tocou nos dados do mundo.

Os atores existentes `Bayle`, `Pipping Black`, `Arkius Jacker`, `Adamantine Dragon (Adult, Spellcaster)`, `QA Loot Actor v3.8.8` e `QA NPC Mechanics v3.8.8` continuaram visíveis no diretório.

## Avisos conhecidos

- O chunk principal minificado permanece em 1.043,90 kB e gera o aviso de 500 kB do Vite. A divisão assíncrona continua como trabalho futuro.
- A ficha Ethernum ainda deriva de `ActorSheet` V1. A migração para ApplicationV2 permanece necessária antes do Foundry 16.
- A janela real do navegador tinha 720 px de altura, abaixo dos 768 px recomendados pelo Foundry; ainda assim, os painéis Ethernum permaneceram utilizáveis. A suíte também cobre posicionamento em 1280, 1366, 1600 e 1920 px, incluindo escalas de 125% e 150%.

## Evidências

- `foundry-player-bayle-three-users.png`
- `foundry-en-command-device-communicator-1280x720.png`
- `foundry-ptbr-command-device-communicator.png`
- `foundry-en-contract-pdf-page-2.png`
- `foundry-en-pf2e-sheet-selector.png`
- `foundry-en-rune-catalog.png`
- `foundry-ptbr-rune-catalog.png`
- `foundry-ptbr-reduced-motion.png`
- `foundry-en-existing-actors-preserved.png`
- `foundry-final-en-smoke.png`
