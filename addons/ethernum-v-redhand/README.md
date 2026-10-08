# V RedHand — ARSENAL.EXE

Pacote de extensão para **Ethernum RPG Module v3.8.11 ou posterior**, validado com v3.8.12, Foundry VTT 14.368 e PF2e 8.5.1. Ele acrescenta **V RedHand** ao seletor nativo de Mecânicas Únicas da ficha Concórdia. O código do módulo-base não é alterado.

## Instalação para desenvolvimento

Copie esta pasta para `Data/modules/ethernum-v-redhand`, habilite o Ethernum RPG Module e o PF2e no mundo e então habilite **V RedHand — ARSENAL.EXE**. Reinicie o mundo após instalar ou atualizar o módulo. Na ficha do personagem Concórdia, abra **Mecânicas Únicas** e selecione **V RedHand - Concórdia** no seletor. A escolha é feita pelo GM; o estado de V fica salvo no namespace próprio do add-on.

## Escopo

- Roleta Gunslinger/Swordmaster, Cartucho Ultimate, histórico do encontro e controle de munição por forma.
- Progressão da Luva de Vínculo, Re-giro Forçado como proposta configurável e Runa Corrompida opcional.
- Pocket.Mart com tiers, slots, orçamento, Taxa do Dia, carrinho, recibo e débito do dinheiro PF2e no mesmo `Actor.update` que registra o pedido. A Taxa 6 marca o item mais barato com duração dobrada; a Caixa Entregue Antes é registrada como presente do GM, sem cobrança.
- Prateleira Rotativa; no resultado 20, o GM escolhe um acessório gratuito. Acessórios podem ser descartados sem reembolso. Inclui catálogo de Cromas com verificação de slots/Peso e tabela de Sintomas.
- Dados isolados no namespace de flags `ethernum-v-redhand`.

O módulo-base ainda não oferece uma API pública de registro de perfis externos. O add-on acrescenta a opção ao seletor da ficha Concórdia e intercepta essa escolha para mostrar seu painel próprio; as demais opções continuam sob controle do módulo-base. A ficha principal continua responsável por ataques, ações, condições e perícias PF2e. A compra registra recibos e lembretes de efeitos; não cria itens mágicos nem automatiza bônus homebrew em rolagens.

## Regras em playtest

As decisões ainda abertas no documento v0.5 continuam abertas. Pente por forma segue a proposta do PDF. Re-giro Forçado inicia desligado (decisão 09); o GM pode habilitar o experimento. O tier do Mart, Mk da Luva e Runa Corrompida são configuráveis pelo GM. Buffs de itens permanecem como lembretes no recibo, sem aplicar modificadores ocultos à ficha.

## Distribuição

O diretório é um módulo Foundry separado. Para empacotar, compacte o conteúdo desta pasta mantendo `module.json` na raiz do ZIP; não compacte a pasta-pai `addons`.
