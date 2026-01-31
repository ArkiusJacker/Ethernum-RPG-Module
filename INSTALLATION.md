# Instalação do Ethernum RPG Module

## Método 1: Instalação via Foundry VTT (Recomendado)

1. Abra o Foundry VTT
2. Vá para "Add-on Modules"
3. Clique em "Install Module"
4. Cole o seguinte URL no campo "Manifest URL":
   ```
   https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/latest/download/module.json
   ```
5. Clique em "Install"
6. Aguarde a instalação
7. Ative o módulo nas configurações do seu mundo

## Método 2: Instalação Manual

### Windows

1. Localize sua pasta de dados do Foundry VTT:
   - Padrão: `%localappdata%\FoundryVTT\Data\modules`
   - Ou verifique em `Configuration` > `User Data Path` no Foundry

2. Baixe a última versão do módulo:
   - Visite: https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/latest
   - Baixe o arquivo `ethernum-rpg-module.zip`

3. Extraia o arquivo ZIP:
   - Extraia o conteúdo para `[Foundry Data]\modules\ethernum-rpg-module`
   - Certifique-se de que o `module.json` está diretamente em `ethernum-rpg-module`

4. Reinicie o Foundry VTT

5. Ative o módulo:
   - Abra seu mundo
   - Vá para "Settings" > "Manage Modules"
   - Marque "Ethernum RPG Module - Sistema de Éter"
   - Clique em "Save Module Settings"

### macOS

1. Localize sua pasta de dados do Foundry VTT:
   - Padrão: `~/Library/Application Support/FoundryVTT/Data/modules`
   - Ou verifique em `Configuration` > `User Data Path` no Foundry

2. Baixe e extraia:
   ```bash
   cd ~/Library/Application\ Support/FoundryVTT/Data/modules
   curl -L -o ethernum-rpg-module.zip https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/latest/download/ethernum-rpg-module.zip
   unzip ethernum-rpg-module.zip -d ethernum-rpg-module
   rm ethernum-rpg-module.zip
   ```

3. Reinicie o Foundry VTT

4. Ative o módulo (veja instruções acima)

### Linux

1. Localize sua pasta de dados do Foundry VTT:
   - Padrão: `~/.local/share/FoundryVTT/Data/modules`
   - Ou verifique em `Configuration` > `User Data Path` no Foundry

2. Baixe e extraia:
   ```bash
   cd ~/.local/share/FoundryVTT/Data/modules
   wget https://github.com/ArkiusJacker/Ethernum-RPG-Module/releases/latest/download/ethernum-rpg-module.zip
   unzip ethernum-rpg-module.zip -d ethernum-rpg-module
   rm ethernum-rpg-module.zip
   ```

3. Reinicie o Foundry VTT

4. Ative o módulo (veja instruções acima)

## Método 3: Instalação de Desenvolvimento

Para desenvolvedores que desejam contribuir ou testar a versão de desenvolvimento:

1. Clone o repositório:
   ```bash
   cd [Foundry Data]/modules
   git clone https://github.com/ArkiusJacker/Ethernum-RPG-Module.git ethernum-rpg-module
   ```

2. Reinicie o Foundry VTT

3. Ative o módulo

## Verificação da Instalação

Após instalar e ativar:

1. Crie ou abra um mundo com sistema Pathfinder 2E
2. Abra a ficha de um personagem
3. Você deve ver uma nova aba "Sistema de Éter" com ícone de varinha mágica
4. Clique na aba para acessar o sistema de éter e runas

## Requisitos

- **Foundry VTT**: Versão 11 ou superior (testado até v13)
- **Sistema**: Pathfinder 2E (pf2e) instalado e ativo
- **Navegador**: Chrome, Firefox, Edge ou Safari atualizado

## Solução de Problemas

### Módulo não aparece na lista
- Verifique se o `module.json` está no caminho correto
- Caminho correto: `[Foundry Data]/modules/ethernum-rpg-module/module.json`
- Reinicie completamente o Foundry VTT

### Aba não aparece na ficha
- Certifique-se de que o módulo está ativado
- Verifique se está usando o sistema Pathfinder 2E
- Verifique o console do navegador (F12) por erros
- Tente recarregar a ficha (fechar e abrir novamente)

### Erros no console
- Verifique se a versão do Foundry é compatível (11+)
- Verifique se todos os arquivos do módulo foram extraídos corretamente
- Desative outros módulos temporariamente para testar conflitos
- Reporte o erro no GitHub: https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues

### Sistema de éter não funciona
- Clique no botão "Recalcular" na aba de éter
- Verifique se o personagem tem os atributos (INT, WIS, CHA, CON) configurados
- Feche e reabra a ficha do personagem

## Desinstalação

1. Desative o módulo nas configurações do mundo
2. Feche o Foundry VTT
3. Exclua a pasta `ethernum-rpg-module` de `[Foundry Data]/modules`
4. Reinicie o Foundry VTT

**Nota**: Os dados de éter e runas nos personagens serão mantidos nos flags do ator, mas não serão visíveis sem o módulo.

## Atualizações

### Atualização Automática (Via Foundry)
Se instalou via manifest URL, o Foundry verificará automaticamente por atualizações.

### Atualização Manual
1. Baixe a nova versão
2. Substitua os arquivos na pasta `ethernum-rpg-module`
3. Reinicie o Foundry VTT

### Atualização de Desenvolvimento
```bash
cd [Foundry Data]/modules/ethernum-rpg-module
git pull origin main
```

## Suporte

Para ajuda adicional:
- **Issues**: https://github.com/ArkiusJacker/Ethernum-RPG-Module/issues
- **Documentação**: Leia o USER_GUIDE.md
- **Exemplos**: Veja a pasta `examples/`

## Próximos Passos

Após a instalação, recomendamos:
1. Ler o [USER_GUIDE.md](USER_GUIDE.md)
2. Experimentar os [exemplos de macros](examples/MACROS.md)
3. Ver os [exemplos de runas](examples/RUNES.md)
4. Criar seu primeiro personagem com sistema de éter!
