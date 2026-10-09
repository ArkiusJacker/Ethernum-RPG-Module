# V RedHand — ARSENAL.EXE

Pacote de extensão **v0.3.1** para **Ethernum RPG Module v3.8.11 ou posterior**, validado com v3.8.12, Foundry VTT 14.368 e PF2e 8.5.1. Ele acrescenta **V RedHand** ao seletor nativo de Mecânicas Únicas e registra uma ficha individual baseada na estrutura Concórdia. O código do módulo-base não é alterado.

## Instalação para desenvolvimento

Copie esta pasta para `Data/modules/ethernum-v-redhand`, habilite o Ethernum RPG Module e o PF2e no mundo e então habilite **V RedHand — ARSENAL.EXE**. Reinicie o mundo após instalar ou atualizar o módulo. Na ficha do personagem Concórdia, abra **Mecânicas Únicas** e selecione **V RedHand - Concórdia** no seletor. Se a ficha mostrar o estado vazio do módulo-base sem seletor de perfis, use **Ativar perfil V** no painel da extensão. O painel mostra a mecânica completa e mantém o atalho **Abrir ficha individual**. A ficha individual usa o shell Concórdia sem trocar a preferência de ficha salva no Actor; o estado de V fica salvo no namespace próprio do add-on.

## Escopo

- Roleta Gunslinger/Swordmaster: **1 natural revela uma Glitch/Ultimate; resultados 2–20 cobrem as 19 armas normais**. O catálogo agora tem 22 Glitches/Ultimates e aceita novas entradas sem alterar a tabela normal. Inclui Cartucho Ultimate, histórico do encontro e munição por forma.
- Progressão da **Luva Sintonizadora Redhand**, Re-giro Forçado como proposta configurável e Runa Corrompida opcional.
- A forma manifestada cria uma arma PF2e real, já empunhada e com dados de dano, traços, alcance, runas e munição preparados. Armas, Luva e a Way/perks correspondentes são sincronizados no inventário do Actor; abrir a ficha atualiza os itens antigos. Golpes comuns usam o Strike PF2e da arma; assinaturas Glitch gastam o Cartucho e rolam seus dados no chat.
- A aba de Mecânica Única mostra a interface completa de V na ficha padrão do PF2e e mantém o atalho para a ficha individual.
- Rolagens de V e mensagens de itens vinculados ao Actor recebem moldura Blackwall animada e de alto contraste. Os cards PF2e mostram apenas os resultados individuais dos dados extras, sem repetir fórmula e descrição já visíveis. Um 1 natural só é rotulado como Glitch quando vem da roleta Boot / giro.
- Banco SFX expansível em `audio/`, com controles para tocar localmente, somente para proprietários do Actor V ou para toda a mesa. O GM pode registrar novos caminhos pela aba SFX. Os áudios fornecidos ficam fora do controle de versão.
- Twin Colts oferece prompt de segundo Strike após acerto ou crítico, com MAP normal; o playtest atual limita a 1 disparo extra por rodada.
- A ficha individual troca a paleta Concórdia por vermelho Blackwall, amarelo Cyberpunk 2077, ciano e magenta, com animações de baixa intensidade e suporte à preferência de movimento reduzido.
- Pocket.Mart com tiers, slots, orçamento, Taxa do Dia, carrinho, recibo e débito do dinheiro PF2e no mesmo `Actor.update` que registra o pedido. A Taxa 6 marca o item mais barato com duração dobrada; a Caixa Entregue Antes é registrada como presente do GM, sem cobrança.
- Prateleira Rotativa; no resultado 20, o GM escolhe um acessório gratuito. Acessórios podem ser descartados sem reembolso. Inclui catálogo de Cromas com verificação de slots/Peso, itens PF2e, ativações com usos controlados e tabela de Sintomas.
- Dados isolados no namespace de flags `ethernum-v-redhand`.

O módulo-base ainda não oferece uma API pública de registro de perfis externos. O add-on acrescenta a opção ao seletor Concórdia e registra a ficha de V usando a classe de ficha do módulo-base; não troca a ficha dos demais personagens nem a preferência de ficha do Actor. A aba Runa usa o Ateliê Rúnico Concórdia do módulo-base. As armas manifestadas são Strike items PF2e; a automação aplica alguns efeitos de condições compatíveis. Dano de assinaturas em área, salvamentos, durações de cena e efeitos homebrew específicos ainda exigem resolução pelo jogador/GM conforme a carta. Bônus de Cromas que não têm predicado seguro aparecem como lembrete no recibo/ação.

## Regras em playtest

As decisões ainda abertas no documento v0.5 continuam abertas. Pente por forma segue a proposta do PDF. Re-giro Forçado inicia desligado (decisão 09); o GM pode habilitar o experimento. O tier do Mart, Mk da Luva e Runa Corrompida são configuráveis pelo GM. As runas da Luva são aplicadas uma vez ao perfil da arma; efeitos narrativos ou dependentes de alvo continuam identificados no chat para resolução da mesa.

## Expandir Glitch / Ultimate

Para adicionar outra arma Glitch, inclua uma entrada em `ultimates` e um perfil com o mesmo nome em `ultimateProfiles`, em `scripts/data.js`. Os caminhos existentes criam o item PF2e, sincronizam a munição/capacidade, calculam a Way por categoria e listam a arma automaticamente. Para munição fora do padrão, informe `capacity`, `ammoKind` e `reload`; para efeitos seguros de Strike, use `kind: "strike"`; para área/salvamento, use `kind: "save"` e preencha fórmula, tipo, área e CD. Resultados 2–20 continuam ligados às 19 armas normais.

## Distribuição

O diretório é um módulo Foundry separado. A release v0.3.1 inclui as 13 faixas do banco SFX no repositório e no ZIP instalável. Para acrescentar sons, copie os arquivos à categoria correspondente e registre-os em `scripts/soundbank.js`. Para empacotar o módulo, compacte o conteúdo desta pasta mantendo `module.json` na raiz do ZIP; não compacte a pasta-pai `addons`.
