# v3.8.10 - Auditoria de arquitetura e confiabilidade

## Painel do mestre

`GMControlCenterBridge` ficou restrito a snapshot compartilhado, montagem, callbacks de autoridade e dispatch. Formulários e ações foram separados em controladores simples para Geradores, Contratos, Loja, Companhia e Comunicador. O dispatcher para no primeiro domínio que reconhece o comando e falha explicitamente para ações desconhecidas.

Não foi introduzido um framework de comandos. Os controladores usam funções e um pequeno contrato comum testável.

## Loja e contratos

A Loja já possuía limites úteis entre `CompanyStoreRepository`, `PF2eStoreAdapter`, modelo e serviço transacional. Recuperação, autorização e execução permanecem no serviço porque compartilham lock, revisão e rollback; uma nova divisão nesta release aumentaria o risco sem reduzir acoplamento real.

Contratos já separam modelo, armazenamento de documentos, adaptador de FilePicker e serviço de ACL/projeção. A estabilidade dos ACLs foi priorizada e nenhuma estrutura persistida foi alterada.

## Hooks e projeções

O antigo grupo amplo sincronizava Loja e Contratos para qualquer alteração de User, Actor, Item ou Journal. A v3.8.10 separa os gatilhos:

| Documento | Identidade | Contratos | Loja | Comunicador |
| --- | --- | --- | --- | --- |
| User | sim | sim | sim | atualizar |
| Actor | sim | sim | sim | atualizar |
| Item | não | não | sim | atualizar |
| JournalEntry | não | sim | não | atualizar |

Cada serviço faz debounce e somente o GM primário sincroniza projeções. Isso mantém um evento em uma sincronização lógica por domínio, sem cascatas síncronas.

## Observadores e ciclo de vida

O `MutationObserver` de colisão do Command Device agora acompanha o elemento exato do Comunicador. Se a janela for destruída e recriada, o observer anterior é desconectado e um novo é ligado. `destroy()` limpa observer, timers, listeners com `AbortController`, painel e raiz.

## PDF.js

- render anterior é cancelado antes de trocar página/documento;
- canvas ativo é limpo, reduzido para `1x1` e ocultado ao fechar;
- cache LRU simples é limitado a três documentos;
- tarefas de carregamento são destruídas na remoção e no encerramento;
- worker continua único, empacotado localmente, sem CDN/eval.

## Diálogos

Geradores de Loot/NPC, Loja, Contratos, Companhia, formulários administrativos do Comunicador e o seletor de ficha usam um adaptador `DialogV2.wait` no Foundry 13. O fallback `Dialog` é deliberado e centralizado para compatibilidade. Interfaces de mecânica/combat não foram migradas às cegas nesta release.

A ficha personalizada ainda deriva de `ActorSheet` V1. O Foundry 13 emite um aviso de depreciação com remoção anunciada para a versão 16; migrar o ciclo completo da ficha para `ApplicationV2` exige uma fase própria de compatibilidade PF2e, renderização e drag-and-drop. O aviso não bloqueia a v3.8.10 e foi registrado para planejamento, sem ocultar ou suprimir o diagnóstico.

## CSS e assets

A auditoria encontrou quatro folhas principais, sem seletores globais de `body/html`. Os sistemas continuam escopados por raiz de ficha, comunicador, Command Device e chat. Foram identificados 28 usos de `!important`, concentrados em integração com estilos PF2e/Foundry e estados de acessibilidade; não houve remoção mecânica sem teste visual.

O build copia apenas templates, estilos, idiomas, licença, manifesto, README, CHANGELOG, worker PDF e `assets/`. Evidências em `docs/qa`, fontes TypeScript e assets de autoria não entram em `dist`.

## Source maps e dependências

Builds de produção não incluem source maps. `npm run dev` usa modo development e mantém mapas para depuração local.

`pdfjs-dist` permanece fixado em `4.10.38`; upgrades maiores mudariam worker/API. Vite, Vitest e TypeScript permanecem nas faixas já validadas. A tentativa de migrar os typings para Foundry 13 gerou incompatibilidades de declaração global em massa, portanto o pacote de tipos 12 foi mantido como ferramenta de compilação. `npm audit --omit=dev` retorna zero vulnerabilidades; os avisos do audit completo são transitivos de TinyMCE nos typings e não entram no runtime ou release.

## Erros e logging

As ações do Comunicador continuam com limite local: desabilitam somente o controle em processamento, encaminham detalhe técnico ao console do mestre e restauram o restante da interface no `finally`. A telemetria de desempenho agrega contagens e durações em memória sem logs por render.

## Fora de escopo

- Encounter Generator/Analyzer 2.0 (v3.8.11);
- automação runtime ampla de mecânicas geradas;
- integração canônica de novos assets COM-UI;
- reescrita visual do Command Device.
