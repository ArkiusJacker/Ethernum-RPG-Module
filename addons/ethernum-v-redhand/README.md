# V RedHand — ARSENAL.EXE

Pacote de extensão **v0.3.0** para **Ethernum RPG Module v3.8.11 ou posterior**, validado com v3.8.12, Foundry VTT 14.368 e PF2e 8.5.1. Ele acrescenta **V RedHand** ao seletor nativo de Mecânicas Únicas e registra uma ficha individual baseada na estrutura Concórdia. O código do módulo-base não é alterado.

## Instalação para desenvolvimento

Copie esta pasta para `Data/modules/ethernum-v-redhand`, habilite o Ethernum RPG Module e o PF2e no mundo e então habilite **V RedHand — ARSENAL.EXE**. Reinicie o mundo após instalar ou atualizar o módulo. Na ficha do personagem Concórdia, abra **Mecânicas Únicas** e selecione **V RedHand - Concórdia** no seletor. O painel compartilhado passa a mostrar apenas o botão **Abrir ficha Cyberpunk**; a ficha completa de V abre em uma janela separada, preservando abas, rolagens, inventário e recursos da ficha Concórdia. A escolha do perfil é feita pelo GM; o estado de V fica salvo no namespace próprio do add-on.

## Escopo

- Roleta Gunslinger/Swordmaster: **1 natural revela uma Glitch/Ultimate; resultados 2–20 cobrem as 19 armas normais**. Inclui Cartucho Ultimate, histórico do encontro e controle de munição por forma.
- Progressão da **Luva Sintonizadora Redhand**, Re-giro Forçado como proposta configurável e Runa Corrompida opcional.
- A forma manifestada cria uma arma PF2e real, já empunhada e com dados de dano, traços, alcance, runas e munição preparados. Armas, Luva e a Way/perks correspondentes são sincronizados no inventário do Actor; abrir a ficha atualiza os itens antigos. Golpes comuns usam o Strike PF2e da arma; assinaturas Glitch gastam o Cartucho e rolam seus dados no chat.
- Rolagens de V na ficha e mensagens de itens vinculados ao Actor recebem moldura Blackwall animada e resumo do título, fórmula, dados individuais e total. Um 1 natural só é rotulado como Glitch quando vem da roleta Boot / giro.
- A ficha individual troca a paleta Concórdia por vermelho Blackwall, amarelo Cyberpunk 2077, ciano e magenta, com animações de baixa intensidade e suporte à preferência de movimento reduzido.
- Pocket.Mart com tiers, slots, orçamento, Taxa do Dia, carrinho, recibo e débito do dinheiro PF2e no mesmo `Actor.update` que registra o pedido. A Taxa 6 marca o item mais barato com duração dobrada; a Caixa Entregue Antes é registrada como presente do GM, sem cobrança.
- Prateleira Rotativa; no resultado 20, o GM escolhe um acessório gratuito. Acessórios podem ser descartados sem reembolso. Inclui catálogo de Cromas com verificação de slots/Peso, itens PF2e, ativações com usos controlados e tabela de Sintomas.
- Dados isolados no namespace de flags `ethernum-v-redhand`.

O módulo-base ainda não oferece uma API pública de registro de perfis externos. O add-on acrescenta a opção ao seletor Concórdia e registra a ficha de V usando a classe de ficha do módulo-base; não troca a ficha padrão dos demais personagens. As armas manifestadas são Strike items PF2e; a automação aplica alguns efeitos de condições compatíveis. Dano de assinaturas em área, salvamentos, durações de cena e efeitos homebrew específicos ainda exigem resolução pelo jogador/GM conforme a carta. Bônus de Cromas que não têm predicado seguro aparecem como lembrete no recibo/ação.

## Regras em playtest

As decisões ainda abertas no documento v0.5 continuam abertas. Pente por forma segue a proposta do PDF. Re-giro Forçado inicia desligado (decisão 09); o GM pode habilitar o experimento. O tier do Mart, Mk da Luva e Runa Corrompida são configuráveis pelo GM. As runas da Luva são aplicadas uma vez ao perfil da arma; efeitos narrativos ou dependentes de alvo continuam identificados no chat para resolução da mesa.

## Distribuição

O diretório é um módulo Foundry separado. Para empacotar, compacte o conteúdo desta pasta mantendo `module.json` na raiz do ZIP; não compacte a pasta-pai `addons`.
