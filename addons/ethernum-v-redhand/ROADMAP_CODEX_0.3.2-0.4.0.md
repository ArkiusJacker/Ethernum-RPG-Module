# V RedHand — ARSENAL.EXE
## Roadmap de implementação para Codex — 0.3.2 até 0.4.0

> Objetivo: estabilizar o add-on `ethernum-v-redhand` para Foundry VTT 14 + PF2e 8.5.1, corrigindo roleta, armas reais na ficha, golpes especiais, áudio automatizado e pipeline de release.
> Base: `concordia-unique-mechanics-v0.3.1`.

## Instruções obrigatórias para Codex

1. Antes de editar, leia `README.md`, `CHANGELOG.md`, `scripts/main.js`, `scripts/data.js`, `scripts/foundry-items.js`, `scripts/soundbank.js`, `audio/soundbank.json`, `module.json` e os workflows/testes.
2. Mantenha o add-on separado do módulo-base sempre que possível; não reescreva tudo para corrigir bugs locais.
3. Separe estado mecânico, rolagem, atualização de Actor, chat e efeitos manuais. Um card no chat não significa que o efeito foi aplicado.
4. Não derive atributos de combate críticos somente por regex de descrição. Não herde traços do protótipo do compêndio sem que o perfil da arma os declare.
5. Preserve os dados existentes ao ativar/desativar. Migrações de flags devem ser compatíveis.
6. Proteja ações por Actor contra concorrência, duplo clique, eventos duplicados e re-renderizações. Não duplique compras, ataques, gasto de munição, Cartucho ou áudio.
7. Adicione testes de regras puras e de integração/mock com Foundry/PF2e. Execute testes, typecheck, build, validação do manifesto e do ZIP.
8. Se não for possível verificar runtime, marque como não verificado e descreva o teste manual necessário. Não declare sucesso sem evidência.
9. Diferencie versão do add-on e versão das regras mostrada na interface.

---

# 0.3.2 — Integridade da roleta, armas e estado

### Glitch e Ultimate
- Um 1 natural válido no Boot/giro deve registrar uma Glitch uma única vez, mostrar a Glitch no painel/chat e permitir escolher uma Ultimate.
- Após escolher, substituir a forma atual e criar/sincronizar a arma correspondente como item PF2e real na ficha.
- A Glitch deve continuar no histórico depois da seleção. Re-renderização não pode conceder Cartucho ou anunciar novamente.
- A primeira Glitch do encontro concede um Cartucho; Glitches posteriores podem trocar a forma, mas não restauram Cartucho gasto. O reset ocorre apenas ao iniciar encontro novo.
- Falhas intermediárias de gravação/sincronização devem ser tratadas sem deixar estado parcialmente atualizado.

### Armas com perfil explícito
- O compêndio pode fornecer a estrutura do item, mas não deve determinar traços finais da arma de V.
- Não herdar `fatal`, `deadly`, `agile`, `versatile`, `concussive` ou qualquer outro traço sem declaração explícita.
- Modelar em dados estruturados: `mode`, `hands`, `damage`, `damageOptions`, `traits`, `range`, `capacity`, `ammoKind`, `reload`, `runes`, `specialActions`.
- Suportar escolha de tipos de dano alternativos quando a regra permitir; não fixar apenas um tipo se a arma oferece opções.
- Validar todas as armas Gunslinger/Swordmaster e as 22 Ultimates: perfil válido, nomes únicos, Way existente, fórmula/dados válidos, alcance, mãos, munição e traços.

### Dano de assinatura
- Bônus que exige acerto só pode ser rolado após acerto ou crítico do Strike que o originou.
- Associar o bônus à mensagem/rolagem, Actor, item e turno de origem. Não permitir uso em Strike não relacionado.
- Em falha, cancelar o bônus salvo exceção expressa no perfil; bônus só pode ser consumido uma vez e deve expirar.
- Ultimates de área/salvamento devem indicar com clareza o que o sistema automatiza e o que ainda é resolução manual.

### Preservação de estado
- Separar “Ativar/reativar perfil” de “Reiniciar dados de V”.
- Ativar novamente deve preservar Luva Mk, catálogo customizado, SFX, Cromas, histórico, encontro/dia e preferências.
- Reinício exige ação separada, confirmação e descrição dos dados perdidos.

**Aceite 0.3.2:** 1 natural gera uma Glitch; escolher Ultimate cria arma na ficha; traços não são herdados indevidamente; bônus de acerto não funciona após falha; reativação preserva progresso.

---

# 0.3.3 — Golpes especiais e ataques na ficha

- Todo golpe especial de arma normal e Ultimate deve estar disponível como ação clicável na ficha PF2e, não apenas em descrição, painel ou chat.
- Caso explícito: **Gume do Infinito — Corte Perfeito** deve aparecer na ficha com custo de ações, Strike associado e bônus de precisão/dano conforme sua regra.
- Inventariar todos os campos especiais de `weaponsG`, `weaponsS` e `ultimateProfiles`; não omitir ataques que existam somente em texto.
- Quando apropriado, gerar itens de ação gerenciados, com chaves únicas, vinculados à arma/forma e removidos/atualizados junto dela.
- Preservar custo real de 1/2/3 ações, frequência, requisito, alcance, alvo, rolagem, dano e efeito. Não transformar tudo em Strike simples.
- Se um efeito não puder ser automatizado com segurança, abrir/registrar o procedimento correto e explicar a parte manual.

### Ataques e alvos
- Permitir Strike com armas manifestadas, Ultimates, Twin Colts e golpes especiais diretamente na ficha/painel.
- Usar o token de V/Actor correto e alvos selecionados no Foundry. Deve funcionar contra NPCs, monstros e PCs aceitos pelo PF2e.
- Se atacante ou alvo necessário não estiver selecionado, mostrar instrução clara; nunca realizar ataque ambíguo.
- Usar o fluxo nativo PF2e para bônus, MAP, crítico, runas, alcance, resistências e imunidades.
- Para áreas/múltiplos alvos, deixar claro quais alvos foram selecionados e quais salvamentos são necessários.

### Twin Colts e munição
- Disparo extra só após acerto/crítico válido; no máximo um disparo adicional por rodada.
- Usar MAP real quando disponível. Se não puder determinar, solicitar confirmação explícita.
- Sincronizar munição do painel e dos itens PF2e, consumindo a arma correta uma única vez.
- Testar combate ativo/fora de combate, ataques sucessivos, re-renderização, múltiplos usuários e mudança de encontro.

**Aceite 0.3.3:** ações especiais visíveis na ficha e utilizáveis; ataques a NPCs/monstros funcionam; MAP e munição não podem ser contornadas por clique duplo ou re-renderização.

---

# 0.3.4 — Motor de áudio: loops, stop e volume ao vivo

Criar um gerenciador único de áudio que registre cada instância/identificador reproduzido. Cada som deve suportar metadados como `id`, `name`, `path`, `category`, `trigger`, `audience`, `loop`, `defaultVolume` e `stopPolicy`.

- Suportar reprodução pontual e loop; parar som específico; parar todos os sons locais; e comando do GM para parar áudio compartilhado.
- Volume deve mudar **durante** a reprodução. Persistir preferência local por usuário. Separar multiplicador/limite global do GM do volume local de cada ouvinte.
- Não presumir que alterar o volume do remetente altera o áudio dos outros clientes. Cada cliente deve conseguir baixar o som compartilhado localmente.
- Se a API instalada não permitir mudar volume de uma instância viva, implementar atualização/fade ou reinício controlado quando possível e documentar a limitação real.
- Impedir loops duplicados por re-renderização. Encerrar loops conforme política ao fechar interface/desativar V, sem interromper música independente do GM.
- Tratar autoplay bloqueado sem quebrar a ficha; limpar listeners/hooks; validar caminhos locais e rejeitar `..`, paths absolutos e URLs externas quando não suportados.

## Eventos de áudio

| Som/ID provisório | Gatilho | Audiência | Loop |
|---|---|---|---|
| `CORE_GUI_Open.mp3` | Abrir ficha/interface individual de V, uma vez por abertura real | Proprietário/jogador de V | Não |
| `CORE_GUI_Loop.mp3` | Enquanto a interface de V estiver aberta | Proprietário/jogador de V | Sim; parar ao fechar |
| `CORE_Eurodollar_Transfer.mp3` | Mudança de moeda cp/sp/gp/pp: cobre, prata, ouro, platina | Proprietário do Actor alterado | Não; uma vez por transação |
| `CP_Scanner_Open.mp3` | Iniciar Recall Knowledge/Recordar Conhecimento ou teste de conhecimento compatível | Jogador que fez o teste | Não |
| `CP_Relic_Malfunction.mp3` | Uso/ativação da mecânica única de V conforme gatilho mecânico escolhido | Proprietário de V | Não; nunca por re-render |
| `ULT_Blackwall_Recalculate.mp3` | 1 natural válido no Boot/giro de V | Mesa toda | Não; volume configurável |
| `THEME_Mission_Complete.mp3` | Botão/comando explícito do GM para missão/objetivo concluído | Mesa toda | Não |
| `THEME_Level_Up.mp3` | Botão/comando explícito do GM para level up | Mesa toda ou audiência configurável | Configurável |
| Tema de V | Ação manual do GM/jogador autorizado | Audiência configurável | Configurável |

- Abrir ficha e iniciar ação são eventos distintos. A abertura não deve disparar Relic; a ação não deve reiniciar sons de abertura.
- Gatilho de moeda deve comparar valores anteriores/novos e tocar uma vez mesmo se várias denominações mudarem no mesmo update.
- Scanner deve tocar apenas para rolagens/ações de conhecimento identificadas, não em todo teste de perícia.
- Blackwall deve tocar somente na Glitch válida da roleta de V, não em qualquer d20 natural 1 da mesa.
- Missão concluída e level-up são comandos manuais do GM, nunca inferidos de texto livre no chat.

### Interface de áudio
- Botões: **Tocar**, **Parar este som**, **Parar todos os meus sons** e **Parar para a mesa** (GM).
- Slider de volume ao vivo, status tocando/parado/loop e audiência.
- Cadastro de SFX com validação de categoria, formato e caminho seguro dentro de `modules/ethernum-v-redhand/audio/`.
- Configurações locais separadas de flags compartilhadas do Actor; volume Blackwall controlável pelo GM e por cada ouvinte.

**Aceite 0.3.4:** interface abre = som pontual e loop iniciam uma vez; fechar para o loop; volume altera som atual; usuário pode parar sons; re-render não duplica áudio.

---

# 0.3.5 — Eventos automáticos e controles do GM

- Ligar eventos à API/hook adequado do Foundry/PF2e e garantir idempotência.
- Adicionar controles do GM para missão concluída, level-up, tocar/parar tema, audiência e volume compartilhado.
- Validar permissões no servidor/API de documento, não apenas esconder botões na UI.
- Testar pelo menos dois clientes: sons privados só chegam ao proprietário de V; sons de mesa chegam a todos; preferências locais afetam apenas o próprio ouvinte.

**Aceite 0.3.5:** moeda dispara uma transferência; Recall Knowledge dispara Scanner e testes não relacionados não; Blackwall não dispara fora da roleta; somente GM aciona anúncios compartilhados de missão/level-up.

# 0.3.6 — Concorrência, compras e segurança

- Serializar operações por Actor e revalidar recursos imediatamente antes de confirmar.
- Pocket.Mart: chave de idempotência por pedido; impedir débito/recibo duplicados; falhas de gravação não podem deixar estado financeiro inconsistente.
- Proteger munição, Cartucho, usos limitados e bônus pendente contra cliques simultâneos.
- Ao desativar V, limpar apenas condições temporárias aplicadas e rastreadas pelo add-on; não remover condições de outras fontes.
- Validar IDs, dados vindos do DOM, permissões e paths SFX. Não aceitar traversal ou caminho externo não suportado.

**Aceite 0.3.6:** duplo clique não repete compra, tiro, Cartucho, uso limitado ou som global; itens manuais e condições externas permanecem intactos.

# 0.3.7 — Testes de regressão

Criar testes dedicados do add-on para:

- Mapeamento 2–20 em Gunslinger e Swordmaster; resultado 1; seleção de Ultimate; primeira/segunda Glitch; Cartucho disponível/gasto.
- Re-giro, Runa Corrompida, mudança de encontro/dia e migração de estado.
- Perfil de cada arma, traços, dano alternativo, par de pistolas, capacidade/recarga.
- Assinatura após acerto/falha/crítico; ações especiais na ficha; ataque a PC/NPC/monstro; MAP e munição.
- Ativar/desativar/reiniciar; Pocket.Mart e atualizações de moeda concorrentes.
- Loops, stop, volume ao vivo, audiência local/proprietário/mesa e deduplicação de eventos.

**Aceite 0.3.7:** testes repetíveis que falham antes da correção e passam depois; incluir resultado de execução no registro da release.

# 0.3.8 — Pipeline e empacotamento

- Pipeline CI específico para `addons/ethernum-v-redhand`, além do módulo-base.
- Validar manifesto, versão, dependências, imports, catálogo, caminhos SFX e conteúdo do ZIP instalável.
- Garantir `module.json` na raiz do ZIP e todos os arquivos referenciados presentes.
- Remover/sinalizar ZIPs antigos que possam ser confundidos com a versão atual.
- Atualizar README, CHANGELOG, compatibilidade e limitações manuais; diferenciar versão do add-on da versão de regras.
- Testar instalação limpa, atualização desde 0.3.1, dados persistentes e desativação/rollback.

**Aceite 0.3.8:** pacote reproduzível, validado automaticamente, migração preserva dados e limitações manuais estão documentadas.

# 0.4.0 — Release estável candidata

- [ ] Glitch → seleção de Ultimate → arma real na ficha → Strike funcional.
- [ ] Todas as armas/Ultimates têm perfis validados e traços corretos.
- [ ] Golpes especiais aparecem e podem ser usados na ficha, incluindo Gume do Infinito / Corte Perfeito.
- [ ] Ataques funcionam contra NPCs/monstros com atacante e alvo selecionados.
- [ ] Dano de assinatura depende corretamente do resultado do Strike.
- [ ] Twin Colts, MAP, munição e Cartucho sincronizados.
- [ ] Reativação preserva dados; compras e ações críticas são idempotentes.
- [ ] SFX têm loops, stop, volume ao vivo, preferências locais e controles do GM.
- [ ] Abertura, moeda, Scanner, Relic, Blackwall, missão e level-up foram testados.
- [ ] CI, ZIP, instalação e migração foram testados em Foundry 14/PF2e 8.5.1.
- [ ] README, CHANGELOG e notas da release atualizados.

Não marcar a release como estável enquanto houver bloqueador P0 ou teste crítico sem evidência.

---

# Banco de SFX — espaço para adicionar sons na próxima atualização

Preencher os campos quando os novos sons forem definidos. Confirmar procedência, direitos/licença e formato antes de distribuir.

| # | Nome/ID provisório | Arquivo | Fonte/link/licença | Evento/arma | Audiência | Loop? | Estado |
|---:|---|---|---|---|---|---|---|
| 1 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 2 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 3 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 4 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 5 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 6 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 7 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 8 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 9 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 10 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 11 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 12 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 13 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 14 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |
| 15 | [ADICIONAR] | [arquivo.ext] | [fonte/licença] | [evento/arma] | [self/V/mesa] | [sim/não] | Pendente |

### Categorias sugeridas
- Armas normais: saque, disparo, recarga, vazio, crítico e golpe especial.
- Ultimates/Glitches: revelação, Cartucho, disparo/impacto, cancelamento/falha.
- Corpo a corpo: saque, corte, impacto, aparo, avanço e finalização.
- Cyberware: Sandevistan, scanner, camuflagem óptica, braço-cañão, Relic.
- Interface: abrir/fechar, confirmação, erro, compra, transferência, loop e stop.
- Vozes/temas: falas próprias, missão concluída, level-up, vitória e derrota.

## Decisões pendentes para confirmar durante a implementação
- [ ] Audiência padrão de cada novo SFX (proprietário de V ou mesa toda).
- [ ] Quando o loop da interface deve parar: fechar ficha, trocar aba ou comando explícito.
- [ ] Volume global padrão para Blackwall e temas compartilhados.
- [ ] Quais golpes usam Strike e quais usam salvamento/área.
- [ ] Quais efeitos devem permanecer manuais por decisão do GM.
- [ ] Lista final de SFX, fontes e licenças.
