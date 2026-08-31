# v3.8.10 - Relatório de QA Foundry

## Resultado

**Aprovado.** A versão 3.8.10 foi instalada no Data Folder e carregada no mundo real com dois GMs online. Nenhum erro de runtime do Ethernum foi registrado durante a passagem final.

## Fluxos exercitados

1. Command Device: autoridade, operações, contratos, loja, sistema e diagnósticos carregaram sem perda de estado.
2. Loot: `DialogV2` abriu e gerou prévia determinística com 1.105 candidatos; nenhum Actor foi alterado.
3. Encontro: combate de nível desproporcional foi identificado como acima de extremo, em modo somente leitura.
4. Mecânica NPC: prévia elite experimental foi gerada para o dragão; `Aplicar` e `Reverter` não foram acionados nesta passagem.
5. Comunicador: início, notificações por usuário, contratos, esquadrão, loja e ajustes foram abertos.
6. Documento: o contrato oficial abriu no visualizador PDF em `1 / 13`.
7. Ficha: o Pipping abriu na ficha Ethernum; Overview, Combat, Equipment, Magic, Feats, Unique Mechanic e Effects alternaram corretamente.
8. Seletor: a troca acessível pela ficha original abriu em `DialogV2`; trocar, restaurar layout e cancelar continuam disponíveis.

## Achado corrigido durante QA

O primeiro ensaio revelou que o seletor de ficha ainda criava um `Dialog` V1. Ele foi migrado para o adaptador moderno e ganhou teste arquitetural. Após rebuild e recarga, esse aviso desapareceu.

A inspeção da evidência do Command Device também revelou que o texto de `NPC Mechanics` excedia a coluna mínima da barra. A largura mínima das abas roláveis foi ampliada para impedir sobreposição entre rótulos.

## Avisos conhecidos

- PF2e ainda instancia um menu de configurações V1 na inicialização.
- A ficha Ethernum deriva de `ActorSheet` V1; o Foundry 13 avisa sobre remoção futura na versão 16. A migração integral fica fora desta release e não afeta o funcionamento atual.

## Proteção de dados

Nenhuma compra, concessão de recompensa/Fulgor, alteração de contrato, aplicação de mecânica NPC ou exclusão foi executada. Os atores e itens de QA existentes foram preservados.

## Evidências

- `foundry-loot-dialog.png`
- `foundry-command-device.png`
- `foundry-field-communicator.png`
- `foundry-contract-pdf.png`
- `foundry-character-sheet.png`
