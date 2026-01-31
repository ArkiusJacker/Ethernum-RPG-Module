# Guia de Contribuição

Obrigado por considerar contribuir para o Ethernum RPG Module! Este documento fornece diretrizes para contribuir com o projeto.

## Como Posso Contribuir?

### Reportando Bugs

Se você encontrou um bug, por favor:

1. Verifique se o bug já foi reportado nas [Issues](https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues)
2. Se não foi, crie uma nova issue incluindo:
   - Título descritivo
   - Passos detalhados para reproduzir o problema
   - Comportamento esperado vs. comportamento atual
   - Versão do Foundry VTT
   - Versão do sistema Pathfinder 2E
   - Versão do módulo Ethernum
   - Screenshots se aplicável
   - Console logs se houver erros

### Sugerindo Melhorias

Para sugerir uma nova funcionalidade:

1. Verifique se já não existe uma issue similar
2. Crie uma nova issue com o label "enhancement" incluindo:
   - Descrição clara da funcionalidade
   - Por que seria útil
   - Como deveria funcionar
   - Exemplos de uso

### Pull Requests

1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie uma branch** para sua funcionalidade:
   ```bash
   git checkout -b feature/minha-funcionalidade
   ```
4. **Faça suas alterações** seguindo as diretrizes de código
5. **Teste** suas alterações extensivamente
6. **Commit** com mensagens descritivas:
   ```bash
   git commit -m "Adiciona funcionalidade X que faz Y"
   ```
7. **Push** para seu fork:
   ```bash
   git push origin feature/minha-funcionalidade
   ```
8. **Abra um Pull Request** descrevendo suas mudanças

## Diretrizes de Código

### JavaScript

- Use JavaScript moderno (ES6+)
- Mantenha funções pequenas e focadas
- Comente código complexo
- Use nomes descritivos para variáveis e funções
- Siga o padrão de indentação existente (2 espaços)

### CSS

- Use variáveis CSS do Foundry quando possível
- Organize seletores logicamente
- Comente seções principais
- Mantenha especificidade baixa
- Prefixe classes customizadas com `ethernum-`

### HTML/Templates

- Use templates Handlebars consistentemente
- Mantenha estrutura semântica
- Use classes CSS descritivas
- Adicione acessibilidade (ARIA labels quando apropriado)

### Localização

- Sempre adicione strings em **ambos** pt-BR.json e en.json
- Use chaves descritivas e hierárquicas
- Mantenha traduções precisas e naturais

## Estrutura do Projeto

```
ethernum-rpg-module/
├── scripts/
│   └── ethernum.js          # Lógica principal do módulo
├── templates/
│   └── ether-tab.html       # Template da aba de éter
├── styles/
│   └── ethernum.css         # Estilos do módulo
├── lang/
│   ├── pt-BR.json          # Strings em português
│   └── en.json             # Strings em inglês
├── packs/                   # Compêndios (futuro)
├── module.json             # Manifest do módulo
├── README.md               # Documentação principal
├── USER_GUIDE.md          # Guia do usuário
├── CHANGELOG.md           # Registro de mudanças
└── CONTRIBUTING.md        # Este arquivo
```

## Testando Suas Mudanças

1. Copie o módulo para a pasta de módulos do Foundry:
   ```bash
   cp -r . ~/foundry-data/Data/modules/ethernum-rpg-module/
   ```

2. Inicie o Foundry VTT

3. Crie/abra um mundo com sistema PF2E

4. Ative o módulo Ethernum RPG Module

5. Teste suas mudanças em diferentes cenários:
   - Criação de personagem novo
   - Personagem existente
   - Diferentes níveis
   - Diferentes atributos
   - Várias runas
   - Rolagens de dados

## Áreas que Precisam de Ajuda

### Funcionalidades Prioritárias

- [ ] Integração com API do PF2E para aplicar efeitos automaticamente
- [ ] Compêndio de runas pré-criadas
- [ ] Sistema de progressão de runas (melhorias com uso)
- [ ] Efeitos visuais na ativação de runas
- [ ] Macros de exemplo
- [ ] Integração com módulos populares (Better Rolls, Dice So Nice)

### Melhorias

- [ ] Testes automatizados
- [ ] Mais traduções (Espanhol, Francês, etc.)
- [ ] Temas alternativos de cores
- [ ] Sons ao ativar runas
- [ ] Animações adicionais
- [ ] Sistema de categorias de runas
- [ ] Limitador de runas equipadas (configurável)

### Documentação

- [ ] Vídeos tutoriais
- [ ] Mais exemplos de uso
- [ ] Guia de integração com outras classes do PF2E
- [ ] API documentation para desenvolvedores
- [ ] Wiki completo

## Processo de Revisão

Quando você submeter um Pull Request:

1. Um mantenedor revisará suas mudanças
2. Podem ser solicitadas alterações ou melhorias
3. Testes adicionais podem ser necessários
4. Após aprovação, o PR será mesclado

## Código de Conduta

### Nosso Compromisso

Estamos comprometidos em fornecer uma experiência acolhedora e livre de assédio para todos.

### Comportamento Esperado

- Use linguagem acolhedora e inclusiva
- Respeite pontos de vista diferentes
- Aceite críticas construtivas graciosamente
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

### Comportamento Inaceitável

- Linguagem ou imagens sexualizadas
- Comentários ofensivos ou depreciativos
- Assédio público ou privado
- Publicação de informações privadas sem permissão
- Conduta que seria considerada inapropriada profissionalmente

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença MIT do projeto.

## Dúvidas?

Se tiver dúvidas sobre como contribuir, sinta-se à vontade para:
- Abrir uma issue com suas perguntas
- Entrar em contato através do GitHub

## Agradecimentos

Obrigado por dedicar tempo para contribuir! Cada contribuição, grande ou pequena, ajuda a tornar este módulo melhor para toda a comunidade.

---

**Happy Coding! 🎲✨**
