# Ethernum RPG Module v3.8.11

## Resumo

Hotfix do catálogo canônico de runas e de confiabilidade das interfaces. Esta
versão não inclui o Encounter Suite 2.0 e não altera regras fundamentais do
Sistema de Éter ou cálculos do PF2e.

## Correções principais

- Classes 3–5 renomeadas para Manifestação, Disrupção e Horizonte de Eventos.
- Loja e Contratos isolam falhas e retry no próprio painel; um erro da Loja não
  produz mais o estado global “Arquivo indisponível”.
- Command Device tenta direita, esquerda, acima e abaixo do Comunicador e usa um
  fallback compacto acessível somente quando a viewport não comporta ambos.
- As treze abas do Command Device operam por teclado com roving tabindex,
  setas, Home, End, Enter/Espaço, foco visível e indicador de overflow.
- Interfaces modificadas possuem tradução PT-BR/EN com paridade automatizada.

## Migração do catálogo

O catálogo schema 2 usa IDs estáveis para 17 Verbos, 24 Substantivos e 19
Fontes, na ordem editorial oficial. A migração converte apenas labels PT-BR/EN
com correspondência exata. Palavras legadas, personalizadas ou desconhecidas
continuam preservadas; sinônimos não são convertidos automaticamente.

## Garantias de preservação

- IDs numéricos das classes, CDs, custos, efeitos e disponibilidade não mudam.
- Actors, Items, documentos, UUIDs, ACLs, ownership, aliases, flags desconhecidas
  e registros de QA não são apagados ou substituídos.
- Loja, Contratos, Loot, automações, mecânicas únicas e autoridade do GM
  primário mantêm seus contratos existentes.
- A migração é idempotente e o mundo continua abrindo com valores desconhecidos.

## Compatibilidade validada

- Foundry VTT 13.351: mínimo, verificado e testado.
- PF2e 7.8.0: baseline de QA.
- Foundry 14: experimental; não é declarado plenamente suportado.

## Limitações conhecidas

- A ficha personalizada ainda usa ActorSheet V1; a migração para ApplicationV2
  está planejada para a linha 3.9.x.
- O chunk principal permanece acima do aviso de 500 kB do Vite; divisão
  assíncrona está planejada para v3.8.13.
- Encounter Suite 2.0 foi movido para v3.8.12.

## Validação

- `npm ci`: concluído.
- Typecheck: aprovado.
- Testes: **103 arquivos / 704 testes aprovados**.
- Build, manifesto, distribuição e imports locais: aprovados.
- Audit de produção: **0 vulnerabilidades conhecidas**.
- ZIP: 33.85 MiB; 79 entradas lidas, sem `.ts`, `.map`, `tests/`, `docs/qa/`,
  `node_modules/` ou metadados Git.
- Candidato local — ZIP SHA-256:
  `F06BE01DBF632CA42E3D298800C4BEB5ABBF200EB4E10F39DA5C731F96FC450E`.
- Candidato local — `module.json` SHA-256:
  `FCFFF5747F292E9FC6F8E0AD880400B2A9DD08A0C1DF6C65923AFBC464737D94`.

Os hashes dos assets finais gerados pelo GitHub Actions serão conferidos após a
publicação e registrados na página desta release.

## Rollback

1. Antes de abrir o mundo com a 3.8.11, faça um backup do mundo.
2. Desative a 3.8.11 e instale o manifesto da
   [v3.8.10](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/download/v3.8.10/module.json).
3. Para retornar também a apresentação persistida exatamente ao estado anterior
   à migração do catálogo, restaure o backup do mundo. Sem restauração, nenhum
   dado é apagado, mas a v3.8.10 pode exibir IDs canônicos como texto bruto.

[Comparar v3.8.10...v3.8.11](https://github.com/ArkiusJacker/Ethernum-RPG-Module/compare/v3.8.10...v3.8.11)
