# Authority e recompensas administrativas

Este documento descreve o comportamento efetivo do modulo. `AuthorityBridge` e o
ledger de recompensas usam o mesmo criterio de eleicao, mas armazenamentos
distintos.

## Eleicao da authority

A authority e o GM ativo cujo `user.id` e lexicograficamente menor. A selecao e
deterministica e recalculada a partir de `game.users`; nao existe prioridade por
nome, ordem de login ou cargo manual.

| Sessao | Leitura | Solicitacao | Mutacao | Authority |
| --- | --- | --- | --- | --- |
| Primary GM online | Le queue/audit, politicas e ledger completo | Pode solicitar pelo bridge, com execucao local | Executa handlers, aprova/rejeita, grava queue/audit/politicas e aplica recompensas | Sim |
| Secondary GM online | Le queue/audit e ledger completo | Encaminha comandos e recompensas ao primary GM | Nao muta queue/audit/politicas nem aplica recompensa localmente | Nao |
| Primary GM offline, outro GM online | O GM ativo restante mantem leitura administrativa | Pedidos passam a ser dirigidos a ele | O novo primary executa e grava | O GM ativo de menor `user.id` assume automaticamente |
| Todos os GMs offline | Player ve apenas sua projecao filtrada de queue/audit | O pedido falha com `NO_PRIMARY_GM` | Nenhuma mutacao administrativa ocorre | Nenhuma |
| Player online | Nao le o ledger privado; queue/audit retornam apenas entradas do proprio usuario | Pode solicitar somente handlers que a funcionalidade publica expuser | Nunca executa handlers administrativos | Nunca |

A troca depende da lista de usuarios ativos que cada cliente recebeu do Foundry.
Durante a propagacao de uma desconexao pode existir um intervalo curto sem
authority. O bridge usa idempotencia persistente para que o novo primary nao
repita uma operacao terminal ja auditada.

## Recompensas

`CompanyRewardService.initialize()` e silencioso para Player: retorna um ledger
vazio em memoria e nao tenta ler ou criar o Journal administrativo. O bootstrap
principal tambem so inicializa esse servico em clientes GM.

Todo GM registra o handler `company-reward-grant` ao inicializar. Isso deixa o
secondary pronto para assumir sem recarregar a pagina. Um pedido feito pelo
secondary e enviado ao primary; somente o primary entra na fila local serial e
altera Actor/ledger. O handler valida novamente que solicitante e executor sao
GMs. Um Player que chame `grant()` diretamente continua recebendo negacao.

O ledger permanece em um Journal privado, com ownership padrao `NONE`. O
`transactionId` garante replay idempotente de uma recompensa concluida. Falhas
apos entrega parcial tentam compensar item e moeda e terminam como `rolledBack`
ou `recoveryRequired`, preservando o registro para intervencao.

## Divida de armazenamento do bridge

Queue e audit ainda ficam nos world settings ocultos
`authorityBridgeQueue` e `authorityBridgeAudit`. As APIs do bridge filtram a
leitura de Player pelo `requesterId`, e somente o primary GM possui caminhos de
escrita. Isso e controle de API, nao sigilo de armazenamento: world settings nao
sao equivalentes a um documento privado.

Nao foi feita migracao automatica para Journal nesta frente. Uma migracao segura
precisa resolver, em conjunto:

1. dual-read/dual-write durante handoff, sem perder pedidos em voo;
2. acesso do Player a sua propria fila sem expor o documento administrativo;
3. marcador de schema e ponteiro de cutover persistentes;
4. verificacao byte a byte antes de desativar o legado;
5. rollback que restaure leitura e escrita no world setting.

Mover os arrays apenas no login do primary quebraria a leitura filtrada dos
Players e poderia dividir a fila entre duas fontes durante uma troca de GM. Por
isso, os dados legados nao sao apagados nem parcialmente copiados. Ate existir
um protocolo versionado de leitura mediada por socket, os limites, a
serializacao no primary, a reconciliacao e a idempotencia persistente continuam
sendo as protecoes ativas.
