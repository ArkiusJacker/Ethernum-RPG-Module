# V — ARSENAL.EXE: notas para integração no módulo

Fonte de design: `V-ARSENAL-EXE-v0_5-Reboot.pdf`, 32 páginas, revisão datada de 07/10/2026. O protótipo inicial `arsenal-exe-v05_1.html` é uma implementação parcial e não deve substituir o PDF como referência de regra.

## Estado e intenção

- V é um novo perfil de mecânica única para o núcleo Concórdia.
- O material está em playtest; não é publicação oficial de Pathfinder 2e.
- O protótipo interativo offline `../arsenal-exe-v0_5.html` foi o primeiro entregável.
- O add-on separado `../addons/ethernum-v-redhand/` acrescenta o painel de V sem alterar a lógica, os flags ou o template do módulo-base.
- Separar no desenvolvimento os trechos definidos no PDF, os explicitamente marcados como proposta e as 13 decisões em aberto abaixo.

## Visão da mecânica

V abandona Cargas, Overclock, Calor, Resfriar, Clumsy e rank/B/amplificação nas armas-base. A restrição passa a ser ações, munição/recarga, mãos ocupadas, roleta, slots e cenas de progressão da Luva, orçamento e custos narrativos. A Luva de Vínculo é o vaso investido de runas e empresta seus benefícios à forma manifestada, incluindo as duas pistolas dos Pares. Ela não aplica runas a Cromas, canhões de braço ou armas de terceiros.

## Domínios candidatos para a ficha

1. **Boot / encontro**: modalidade ativa, contador de 0–3 giros, resultado atual, Cartucho Ultimate de 0/1 e modo/forma sorteada. Primeiro giro grátis com iniciativa; giros adicionais custam uma ação cada. O primeiro 1 natural do encontro concede o Cartucho; 1s posteriores só trocam a Suprema. Estado é de encontro, não recurso de longo prazo.
2. **Munição**: capacidades e recargas por forma de fogo. A proposta do documento é lembrar o pente de cada forma dentro do encontro, sem recarga ao re-manifestar.
3. **Luva**: Mk I–V, runas e slots; Mk III habilita Re-giro Forçado uma vez por dia e o uso provoca um Sintoma; Mk IV pode aceitar Runa Estática Corrompida após decisão de V.
4. **Pedido do Dia**: tier, itens selecionados, orçamento consumido, taxa d6 e buffs até amanhecer/próximo pedido. Armas, munição e Cromas não entram no pedido.
5. **Cromas**: instalação, raridade, slots corporais, peso, limiar por tier, defeito/risco, descanso e limite de uma troca por dia.
6. **Blackwall**: rolagens de Sintoma somente nos gatilhos previstos; sintomas são narrativos, não dano ou condição.

Na ficha do módulo, manter estados com escopos temporais separados (encontro, dia, descanso e permanente). Não modelar o Cartucho, dinheiro, sintomas ou custos de família como um contador genérico único.

## Dados da versão

- Duas tabelas de d20: 1 natural abre Glitch/Ultimate; resultados 2–20 cobrem as 19 armas normais. Uma Glitch escolhida usa uma das 18 Supremas do manual v0.4. Essa regra substitui a tabela original do PDF porque o usuário definiu a revelação da Ultimate no resultado 1.
- Gunslinger: 19 armas de fogo, pares e pesadas; Swordmaster: 19 formas corpo a corpo, incluindo a nova Frigideira.
- Capacidades indicadas: pistolas 6, Pares 6 por pistola, escopetas 2, pesadas 3, Lancer 5. Recargas: 1 ação pente completo, 1 ação por pistola, 1 ação por cartucho, 1 ação por bala, Lancer 2 ações por pente.
- A Luva evolui por cenas: Mk I +1 potência/striking/1 slot; Mk II +2 potência/striking/2 slots; Mk III +2/greater striking/2 slots; Mk IV +3/greater striking/3 slots; Mk V +3/major striking/3 slots.
- Pocket.Mart: T1 1 slot/5 pp; T2 2/1 po; T3 3/5 po; T4 4/15 po; T5 narrativo.
- Cromas: limiar de Peso T2 5, T3 7, T4 9; raridades pesam Common 1, Uncommon 2, Rare 3, Exotic 4, Blackwall 5.
- Acessórios rotativos: d20; libera no Mart T3 (adiantável a T2 pelo Mestre); 2 espaços carregados, 3 no T4.
- Reescrita: 1 slot ao abrir T3 e mais 1 no T4. Substitui uma arma entre d20 2–20; o resultado 1 permanece reservado à Glitch e o catálogo continua com 19 entradas normais.
- Referência de nível 10 do PDF: ataque fogo +22, melee +19/+20, CD 29, CA/PV 28/128, Fort/Ref/Vontade +18/+20/+16.

## Decisões do PDF que continuam em aberto

1. Normalização de dados das armas pesadas/leves.
2. Ray Gun: confirmar ausência de fatal apesar do conflito no catálogo.
3. Twin Colts: confirmar limite de um ataque extra por rodada.
4. W-870: primeiro incremento 4,5 m na planilha versus 12 m no v0.4.
5. Origem do pente e interpretação de recarga.
6. Noisy Cricket fora ou dentro da roleta.
7. Destino de Bolter, Mega Buster, Arm Cannon e Dominator.
8. Exigir forma Suprema carregada na abertura.
9. Re-giro Forçado entra ou não.
10. Croma inicial: opção A, B (recomendação) ou C.
11. Ajustar preços/orçamentos à economia da mesa.
12. Nome final de ARSENAL.EXE e Luva de Vínculo.
13. Penalidade das lâminas: redução no deslocamento de V ou do alvo.

O PDF também sugere que o Mart conceda buffs apesar de regra antiga do v0.4 “sem bônus de combate”; isso é retcon sugerido, apoiado narrativamente pela Pausa de 10 minutos. Preservar a diferença de versão em vez de tratar como decisão consolidada.

## Observações para arquitetura

- A estrutura atual de Mecânicas Únicas já prevê perfis para Concórdia e perfis reservados. A release v3.8.11 não oferece uma API pública de registro para extensões; o add-on v0.1.1 injeta a opção no seletor nativo durante a renderização da ficha, sem alterar o módulo-base.
- O estado de encontro e as escolhas persistentes devem usar escopos claros e funções de runtime separadas da apresentação da ficha.
- A ferramenta HTML salva o estado do encontro localmente no navegador para facilitar playtest. Isso é estado de protótipo, não deve ser confundido com persistência/autoridade do Foundry.
- Supremas: o HTML só apresenta nome, função e ações; o texto mecânico completo continua nas cartas do manual v0.4, pp. 32–40.
- Efeitos homebrew que citam condições, ações ou bônus PF2e precisam de adaptação/validação de regra antes de virar automação.

## Implementação da extensão v0.2.0

- Confirmação do usuário: 1 natural = Glitch/Ultimate; 2–20 = catálogo completo de 19 armas normais. O primeiro 1 por encontro concede um Cartucho; Glitches subsequentes permitem trocar a forma, sem restaurar Cartucho gasto. A revelação é narrada em duas mensagens: o 1 inicialmente parece falha e o Blackwall revela a arma impossível.
- A categoria da forma controla a Way ativa: Swordmaster usa Drifter; pistolas/pares usam Pistolero; escopetas e Lancer usam Vanguard; armas pesadas ou com alcance longo usam Sniper. Itens PF2e de ação são sincronizados no Actor junto com a arma e a Luva.
- O add-on cria itens reais para armas manifestadas, Luva, equipamentos Cromas, lâminas embutidas e Braço-Canhão. Pares criam duas armas de uma mão; a Luva configura potency/striking uma vez no perfil da arma, sem duplicar dados de runa.
- Cromas com Rule Elements compatíveis recebem efeitos passivos na ficha; ativações limitadas ganham botão e usos por encontro/dia. Sandevistan e camuflagem têm controles de encerramento das Conditions; Braço-Canhão rola o Strike do item, acompanha 3 disparos e recarrega com uma ação. Alvos, áreas, salvamentos, durações de cena e efeitos específicos sem regra segura ainda precisam de confirmação pelo chat/mesa.
- A aba escolhida é salva por usuário e Actor para sobreviver a ações e novas renderizações da ficha. O tema Blackwall usa as duas imagens fornecidas e aplica animação de rolagem/Glitch e tema às mensagens do add-on no chat.
- A cópia instalada para desenvolvimento segue em `C:\Users\Titan\AppData\Local\FoundryVTT\Data\modules\ethernum-v-redhand`; a distribuição da release será o ZIP com `module.json` na raiz.

## Registro da extensão v0.2.0 · 08/10/2026

- Pacote local: `../addons/ethernum-v-redhand-v0.2.0.zip`; manifesto `../addons/ethernum-v-redhand/module.json`.
- Release pública: [Pacote de extensão Concórdia: Mecânicas únicas v0.2.0](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/concordia-unique-mechanics-v0.2.0), tag `concordia-unique-mechanics-v0.2.0`; contém `ethernum-v-redhand.zip` e `module.json`.
- Sintaxe JavaScript e manifesto JSON verificados. A extensão foi copiada para o diretório instalado; ainda é preciso reiniciar o mundo Foundry e conferir os Strikes, itens, Cromas e estilo de chat na interface real.

## Implementação da extensão v0.3.0 · 08/10/2026

- A ficha V é uma janela separada que herda a classe de ficha do Ethernum encontrada em `CONFIG.Actor.sheetClasses.character`, preservando os dados, abas e ações da ficha Concórdia. Ela é registrada sem `makeDefault`; selecionar V na ficha comum mostra apenas um atalho para abrir a janela individual.
- O tema da ficha V combina a moldura Concórdia com vermelho Blackwall, amarelo Cyberpunk 2077, ciano e magenta. Os estilos são escopados à janela V, sem recolorir as fichas dos demais personagens.
- O hook de chat identifica mensagens pelo Actor de `speaker`, token e origem PF2e, além de links UUID para itens do Actor. Rolagens de ataque, dano, perícia, salvamento, iniciativa e mensagens de item do V recebem apresentação animada com fórmula, dados individuais e total. A Glitch só é chamada quando o 1 natural pertence a `Boot / giro`.
- Armas geradas gravam `system.damage.dice`, `die`, `damageType`, `equipped.carryType = held` e mãos ocupadas no formato PF2e. A sincronização de itens na abertura da ficha atualiza armas que já existiam e as deixa empunhadas; armas Pareadas ficam empunhadas em uma mão cada.
- O item é nomeado provisoriamente **Luva Sintonizadora Redhand**. Alternativas editoriais: **Nexo Redhand** e **Sintonizador do Blackwall**. O nome e o slug do item foram atualizados pelo mesmo `managedKey`, preservando a camada Mk existente.
- Pacote de desenvolvimento: `../addons/ethernum-v-redhand-v0.3.0.zip`; cópia instalada em `C:\Users\Titan\AppData\Local\FoundryVTT\Data\modules\ethernum-v-redhand`. Release pública: [Pacote de extensão Concórdia: Mecânicas únicas · V RedHand v0.3.0](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/concordia-unique-mechanics-v0.3.0), tag `concordia-unique-mechanics-v0.3.0`, com `ethernum-v-redhand.zip` e `module.json`.
- Node `--check` e parse do manifesto JSON passaram. A instalação foi atualizada; a ficha e os Strikes ainda precisam de conferência visual após reiniciar o mundo Foundry.

## Registro do add-on separado · v0.1.1 · 08/10/2026

- Pacote atualizado: `../addons/ethernum-v-redhand-v0.1.1.zip`; manifesto em `../addons/ethernum-v-redhand/module.json`.
- Release pública: [Pacote de extensão Concórdia: Mecânicas únicas](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/concordia-unique-mechanics-v0.1.1), tag `concordia-unique-mechanics-v0.1.1`; contém `ethernum-v-redhand.zip` e `module.json`.
- Dependências declaradas: Foundry VTT mínimo 13.351 (verificado em 14.368), PF2e mínimo 7.8.0 (verificado em 8.5.1) e Ethernum RPG Module mínimo 3.8.11 (verificado em 3.8.12), conforme a [release-base](https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/tag/v3.8.11).
- O add-on injeta a opção **V RedHand - Concórdia** no seletor nativo `.ethernum-unique-profile` e monta o painel na ficha quando `uniqueMechanics.activeCore === "concordia"`. A escolha V fica salva em flag própria; escolher outro perfil retorna o controle ao módulo-base.
- A primeira instalação não aparecia porque o add-on ouvia `renderActorSheet` e procurava `#ecs-panel-unique`, enquanto o módulo-base instalado (3.8.12) renderiza por `renderCharacterSheetPF2e`/`renderApplicationV2` e usa `.ethernum-unique-tab`. A v0.1.1 aguarda a renderização real, acrescenta a opção ao seletor e integra nos hooks usados pelo Ethernum.
- Estado persistente isolado em `flags.ethernum-v-redhand.state`. O add-on apenas lê o flag de Concórdia do módulo-base; não escreve nele nem substitui ficha ou perfil existente.
- Escopo implementado: roletas Gunslinger/Swordmaster, Suprema, munição por forma, Luva, Pocket.Mart, Prateleira Rotativa, Cromas, Sintomas, reescritas e diário de decisões ainda abertas.
- Compras debitam a carteira do Actor PF2e junto do registro do pedido; recibos e efeitos ficam como lembretes. A Taxa 6 marca o item mais barato para duração dobrada. A Caixa Entregue Antes e a Entrega Antecipada são presentes narrativos sem cobrança.
- Re-giro Forçado inicia desligado, e o GM pode habilitá-lo como playtest. Escolhas pendentes do PDF continuam explícitas; o add-on não automatiza bônus homebrew nas rolagens PF2e.
- A cópia local em `C:\Users\Titan\AppData\Local\FoundryVTT\Data\modules\ethernum-v-redhand` foi atualizada; os 8 arquivos batem com a fonte por SHA-256. O ZIP publicado também bate com o pacote local. Sintaxe JavaScript e parse dos JSON passaram; falta reiniciar o mundo e conferir o seletor e a troca de perfis na interface real.

## Próximo passo

Manter as 13 decisões em aberto até confirmação da mesa. Reiniciar o Foundry alvo e confirmar visualmente que **V RedHand - Concórdia** aparece no seletor, que o painel abre e que os outros perfis voltam a funcionar ao alternar para eles. Continuar automatizando somente quando o PDF e as decisões da mesa definirem o comportamento sem ambiguidade.
