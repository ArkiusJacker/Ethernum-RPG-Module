# Histórico de versões

## 0.3.2 — sincronização de munição e pacote de playtest

- Gasta munição após o card de Strike PF2e, com idempotência por mensagem; o item exibe a reserva e fica guardado quando esvazia. Recarregar pelo painel atualiza o item e o deixa empunhado novamente.
- Evita descontar a mesma munição duas vezes quando a assinatura Ultimate já reservou o disparo antes de rolar.
- Serializa as ações locais por Actor, incluindo instalação/uso de Cromas, Pocket.Mart, áudio, roleta e Cartucho.
- Adiciona ações de ficha com propriedades/técnicas de cada arma e mantém o item Gume do Infinito · Corte Perfeito.
- Extrai regras puras de migração, Glitch, Strike, munição e caminhos SFX; adiciona 11 testes do add-on.
- Adiciona CI próprio para testar o add-on, validar imports/manifesto/arquivos SFX e montar um ZIP com `module.json` na raiz.
- Registra compatibilidade verificada com Foundry VTT 14.367, PF2e 8.5.1 e Ethernum RPG Module 3.8.12, versões detectadas no ambiente local.
- Mantém 0.3.2 como versão de playtest. O fluxo de Strike, munição, áudio compartilhado e atualização ainda precisa de teste manual em Foundry com dois clientes antes da estabilidade 0.4.0.

## 0.3.1 — integração, Glitches e soundbank

- Corrige a aba de mecânica única nas fichas PF2e e Concórdia, inclusive o estado vazio sem seletor do módulo-base; mantém o atalho e abre a janela individual no shell Concórdia sem alterar a preferência do Actor.
- Mantém as runas da ficha individual no Ateliê Rúnico Concórdia do módulo-base.
- Remove a duplicação dos cards de chat, melhora o contraste e acrescenta um resumo dos resultados individuais dos dados.
- Twin Colts cria um prompt de segundo Strike após acerto ou crítico; quando a rolagem não informa a MAP atual, oferece MAP 1 e MAP 2.
- Adiciona Sussurro, Fishbones, Espada do Rei Destruído e Gume do Infinito; o catálogo passa a 22 Ultimates.
- Cria a aba SFX com reprodução local, direcionada aos proprietários de V ou transmitida para a mesa e cadastro de novas trilhas.

## 0.3.0 — ficha Cyberpunk individual e rolagens detalhadas

- Registra uma ficha separada para V, baseada na classe e nos dados da ficha Concórdia. A ficha comum mostra somente um atalho para abrir a janela individual.
- Aplica o tema Blackwall/Cyberpunk 2077 à ficha separada, sem alterar a apresentação das fichas dos demais personagens.
- Aplica o visual animado às rolagens feitas pelo V e aos pings de itens vinculados ao seu Actor. O resumo mostra ação/item, fórmula, resultados individuais dos dados e total; 1 natural só aciona o rótulo Glitch na roleta Boot / giro.
- Corrige as armas manifestadas para entrarem empunhadas e com seus dados de dano e runas no item PF2e. A ficha sincroniza automaticamente os itens existentes ao ser aberta.
- Cria a **Luva Sintonizadora Redhand** no inventário do Actor e atualiza o item antigo sem perder o progresso da Luva.

## 0.2.0 — Glitch, armas funcionais e Blackwall

- Natural 1 agora revela uma arma Ultimate/Glitch; resultados 2–20 cobrem as 19 armas normais. O primeiro Glitch concede um Cartucho por encontro; Glitches seguintes podem trocar a forma sem reabastecê-lo.
- Corrige a persistência da aba do V entre ações e renderizações da ficha.
- Cria/sincroniza a arma manifestada, a Luva, itens de Croma, Lâminas de Antebraço e Braço-Canhão na ficha PF2e; associa categoria de arma à Way e inclui as ações/perks correspondentes.
- Adiciona ações para usar assinaturas Ultimate e ativações limitadas de Cromas, com algumas condições compatíveis aplicadas diretamente ao Actor.
- Reaplica estilo cyberpunk/Blackwall, animação 3D do d20 e tema nas mensagens/rolagens do V.
- Corrige a narração da primeira Glitch e o reset diário dos usos de Croma; evita aplicar o bônus striking duas vezes no dano-base.

## 0.1.1 — Pacote de extensão Concórdia: Mecânicas únicas

- Adiciona **V RedHand - Concórdia** ao seletor nativo de Mecânicas Únicas.
- Integra pelos hooks `renderCharacterSheetPF2e` e `renderApplicationV2` usados pelo Ethernum.
- Mantém a troca para os demais perfis e núcleos, sem escrever no estado de perfil do módulo-base.
- Atualiza compatibilidade verificada para Foundry VTT 14.368, PF2e 8.5.1 e Ethernum RPG Module 3.8.12.
- Corrige a detecção do painel da ficha e conserva o estado de V no namespace do add-on.

## 0.1.0

- Primeira versão do painel ARSENAL.EXE para V RedHand.
