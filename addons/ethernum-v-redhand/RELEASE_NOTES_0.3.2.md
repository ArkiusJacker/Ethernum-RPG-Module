# V RedHand 0.3.2

Pacote de playtest da extensão **ARSENAL.EXE** para Ethernum RPG Module 3.8.11+ e PF2e 8.5.1.

## Mudanças

- Disparos feitos pelo Strike PF2e atualizam a reserva de munição no estado de V e na descrição do item. Twin Colts desconta o carregador da mão usada. Uma arma sem munição fica guardada até ser recarregada no painel.
- Assinaturas que reservam munição antes do Strike evitam o desconto duplicado. O dano adicional continua ligado ao card do Strike e só fica disponível após acerto/crítico.
- As ações locais do painel são serializadas por Actor para evitar duplo clique em compras, roleta, Cartucho, munição e usos de Croma.
- A ficha do Actor inclui ações de assinatura e propriedades/técnicas declaradas para as armas normais, incluindo Gume do Infinito · Corte Perfeito.
- O CI do add-on valida os perfis, testes, manifesto, imports, arquivos de áudio e estrutura do ZIP.

## Verificações automatizadas

- Testes V RedHand: 11 passaram.
- Suíte do repositório: 859 testes passaram.
- TypeScript: `tsc --noEmit`.
- Build do módulo-base: Vite concluído.
- Verificador do pacote V RedHand: manifesto/imports/14 referências de SFX aprovados.
- Foundry 14.367/PF2e 8.5.1 em mundo com dois clientes: **não verificado nesta etapa**.

Esta versão permanece em playtest; não é a release estável 0.4.0. Antes de elevar para 0.4.0, valide Strike contra PC/NPC/monstro, munição em combate e fora dele, áudio entre clientes, atualização a partir de 0.3.1 e instalação limpa no Foundry.

## Arquivo de instalação

O arquivo `ethernum-v-redhand.zip` deve conter `module.json` na raiz. Copie a pasta do módulo para `Data/modules/ethernum-v-redhand` ou instale o ZIP pela interface de módulos do Foundry.

## Áudio

O pacote contém os 14 arquivos registrados no catálogo. As faixas recebidas do usuário ainda não têm origem/licença documentada no repositório; confirme os direitos de redistribuição antes de publicar o pacote. `THEME_Level_Up.wav` foi sintetizado para esta extensão.
