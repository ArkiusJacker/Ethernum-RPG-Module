# HARVEST

## Conselho da Colheita Experimental

HARVEST e o protocolo de governanca de desenvolvimento usado durante o roadmap
`v3.7.9 -> v3.8.6`. Ele organiza exploracao tecnica sem reduzir a autoridade do
usuario, a compatibilidade com mundos existentes ou a disciplina de release.

HARVEST e documentacao de desenvolvimento. Ele nao cria lore, regra ou interface
para jogadores por conta propria.

## Classificacao

Toda mudanca deve ser distinguida como:

- **CANONICA**: requisito solicitado pelo usuario, correcao confirmada ou trabalho
  explicitamente aprovado no roadmap.
- **[TESTE]**: funcionalidade nova proposta durante o desenvolvimento e ainda nao
  aprovada pelo usuario como parte permanente do modulo.

Correcao de bug nao e experimento. Paridade com dados preparados do PF2e, reparos
de permissao, migracoes necessarias e requisitos do roadmap permanecem canonicos.

## Perspectivas

O conselho usa quatro perspectivas principais:

1. **Facilitador / Coordenador**: define o problema, protege o escopo, resolve
   conflitos e registra a decisao.
2. **Especialista**: avalia Foundry, PF2e, TypeScript, ciclo de vida, autoridade,
   migracao, desempenho e testes.
3. **Critico / Revisor**: procura regressoes, perda de dados, falhas de permissao,
   estados obsoletos, duplicacao, acessibilidade e custo operacional.
4. **Sonhador / Visionario**: propoe possibilidades de UX, apresentacao diegetica,
   automacao e design de jogo sem transforma-las diretamente em codigo.

Uma quinta perspectiva, **Diretor de Experiencia**, pode ser usada como `[TESTE]`
em revisoes visuais. Ela avalia hierarquia, leitura, assets, movimento,
responsividade e identidade.

Quando agentes independentes estiverem disponiveis, sessoes Full devem preferir
execucao multiagente. Caso contrario, cada perspectiva e executada como uma
passagem independente e isso e informado sem simular colaboracao inexistente.

## Modos

### HARVEST Lite

Usado para pequenas interacoes, animacoes discretas, feedback visual ou ideias de
UX com alcance reduzido:

```text
IDEIA -> VERIFICACAO TECNICA -> REVISAO CRITICA -> DECISAO
```

### Full HARVEST

Usado para subsistemas, transacoes, migracoes, permissoes e autoridade. O roadmap
exige esse modo para Comunicador, Contratos, Loja, Administracao GM, Loot,
Encounter Analyzer, gerador de mecanica para NPC e arquitetura de IA.

```text
SEED -> GERMINATION -> CULTIVATION -> PRUNING -> EXPERIENCE REVIEW -> HARVEST
```

## Registro Experimental

IDs sao estaveis e independentes da release:

```text
HARVEST-EXP-0001
HARVEST-EXP-0002
```

A versao de origem fica separada em `introducedIn`. Cada experimento registra:

- ID, nome, origem e versao de introducao;
- objetivo, motivo, escopo e estrategia tecnica;
- risco, estado padrao e criterios de aceitacao;
- rollback, status e aprovacao do usuario.

Status permitidos:

```text
PROPOSED
APPROVED_FOR_TEST
IMPLEMENTED_TEST
AWAITING_USER_APPROVAL
PROMOTED_TO_CANONICAL
REJECTED
REMOVED
BACKLOG
```

Experimentos que alterem comportamento devem possuir flag explicita e iniciar
desligados. Experimentos visuais inofensivos so podem iniciar ligados quando nao
afetarem mecanica, permissao ou desempenho significativo, e continuam marcados
como `[TESTE]`. Um registry de runtime so deve existir quando houver flags reais.

## Autoridade E Seguranca

- Dados preparados e operacoes publicas do PF2e tem prioridade.
- APIs publicas do Foundry tem prioridade sobre implementacoes paralelas.
- Um P0 de corrupcao, duplicacao, perda de moeda, desvio de permissao ou segredo
  exposto bloqueia a promocao.
- O Comunicador Administrativo deve reutilizar Control Center, Authority Bridge,
  fila de aprovacao, auditoria, politicas e diagnosticos existentes.
- Loot e preview-first; mutacao exige comando explicito e trilha de auditoria.
- Mecanicas geradas para NPC sao dados declarativos versionados, nunca JavaScript
  arbitrario, `eval`, `new Function` ou texto de macro executavel.
- Integracao viva de IA exige proxy seguro, acao explicita do mestre e exportacao
  minima. Segredos nunca entram no cliente, HTML, local storage ou settings
  visiveis a jogadores. O gerador deterministico permanece disponivel.

## Autoridade Do Usuario

Um experimento implementado continua `[TESTE]` ate revisao do usuario:

```text
PROPOSED
-> APPROVED_FOR_TEST
-> IMPLEMENTED_TEST
-> FOUNDRY QA
-> USER REVIEW
-> PROMOTED_TO_CANONICAL
```

Sessoes e decisoes ficam em [HARVEST_LOG.md](HARVEST_LOG.md). Experimentos ficam
em [EXPERIMENTAL_TESTS.md](EXPERIMENTAL_TESTS.md). Os requisitos completos ficam
em [ROADMAP_3.7.9_3.8.6.md](ROADMAP_3.7.9_3.8.6.md).
