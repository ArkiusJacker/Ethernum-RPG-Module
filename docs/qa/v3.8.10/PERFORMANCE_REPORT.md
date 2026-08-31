# v3.8.10 - Baseline de desempenho

## Ambiente

- Foundry VTT 13, PF2e e módulo Ethernum 3.8.10;
- mundo real acessado em `http://26.225.175.192:30000/game`;
- dois GMs online (`Gamemaster` primário e `ChatGPT Gamemaster`);
- navegador integrado, cena e combate existentes, sem limpeza de cache do Foundry.

## Telemetria interna

`PerformanceTelemetry` mantém no máximo 64 métricas agregadas em memória e não escreve por render. A leitura pública suportada é:

```js
game.ethernum.diagnostics.performance()
```

Foram instrumentados `module.ready`, construção e troca de abas da ficha, snapshots/abertura do Comunicador e Command Device, snapshots de Loja/Contratos e análises dos geradores de Loot, Encontro e Mecânica NPC.

## Observação real

| Fluxo | Observação |
| --- | ---: |
| Inicialização Ethernum até `ready`, duas recargas | 1,447 ms e 2,646 ms |
| Loot: abrir/confirmar e renderizar prévia de 1.105 candidatos | 1,623 ms |
| Encontro: analisar combate existente | 1,613 ms |
| NPC: gerar prévia determinística | 1,900 ms |
| Comunicador: abrir com sequência de autenticação | 1,694 ms |
| Contrato: abrir detalhe | 4,086 ms |
| PDF: carregar página 1/13 | 4,567 ms |
| Troca de aba no Command Device | 1,549-1,562 ms |
| Troca de aba na ficha | 1,565-1,621 ms |

Os tempos de interação são limites superiores ponta a ponta: incluem transporte da automação, espera de estabilização visual e renderização do Foundry. A telemetria interna separa o custo do módulo quando consultada no console.

## Pacote

- `dist`: 36.83 MiB, 77 arquivos;
- JavaScript principal: 1,030.68 kB minificado, 289.19 kB gzip;
- PDF.js: 409.52 kB minificado, 123.06 kB gzip;
- source maps de produção: 0;
- duplicatas exatas: 0;
- arte de origem: 0;
- documento empacotado: 1.

O chunk principal segue acima do alerta de 500 kB do Vite. A decomposição do controlador reduz acoplamento, mas divisão assíncrona do runtime foi adiada para não alterar a ordem de inicialização nesta release de consolidação.
