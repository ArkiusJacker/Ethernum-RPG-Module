# Catálogo canônico de runas — schema 2

A v3.8.11 separa a identidade persistida da palavra e seu texto localizado. Novas
runas gravam IDs estáveis em `kebab-case`; a ficha apresenta o label em PT-BR ou
EN conforme o idioma do Foundry.

## Classes

| ID | PT-BR | EN |
| --- | --- | --- |
| 1 | Latente | Latent |
| 2 | Tangível | Tangible |
| 3 | Manifestação | Manifestation |
| 4 | Disrupção | Disruption |
| 5 | Horizonte de Eventos | Event Horizon |

Os IDs numéricos, CDs, custos, disponibilidade e efeitos não mudam com essa
correção editorial.

## Palavras oficiais

Verbos, em ordem editorial:

1. CRIAR
2. TRANCAR
3. LIBERAR
4. IDENTIFICAR
5. REPARAR
6. DETONAR
7. SUSTENTAR
8. TRANSPORTAR
9. MULTIPLICAR
10. REFLETIR
11. DESTRUIR
12. ATRAVESSAR
13. CONTROLAR
14. MODIFICAR
15. IMITAR
16. DOMINAR
17. INFLINGIR

Substantivos, em ordem editorial:

1. Fogo
2. Sombra
3. Peso
4. Aço
5. Eletricidade
6. Destino
7. Outros
8. Velocidade
9. Animais
10. Plantas
11. Mente
12. Ligação
13. Som
14. Duração
15. Destreza
16. Ar
17. Corpo
18. Ferocidade
19. Água
20. Vida
21. Luz
22. Madeira
23. Percepção
24. Tempo

Fontes, em ordem editorial:

1. Sangue
2. Calor
3. Dor
4. Memória
5. Força
6. Vigor
7. Destreza
8. Velocidade
9. Personalidade
10. Inteligência
11. Sabedoria
12. Conhecimento
13. Coragem
14. Sanidade
15. Amor
16. Raiva
17. Desejo
18. Empatia
19. Sonho

`INFLINGIR` preserva deliberadamente a grafia da referência oficial. `Éter` não
é uma Fonte canônica nesta revisão.

## Compatibilidade e migração

A migração converte somente labels PT-BR/EN com correspondência exata e
inequívoca. Valores legados não são oferecidos para novas runas, mas continuam
visíveis nas runas existentes:

- Verbos: `IMBUIR`, `TRAVAR`, `AGENDAR`, `MOLDAR`, `EXECUTAR`, `RASTREAR`,
  `REESCREVER`, `OTIMIZAR`.
- Substantivos: `Gelo`, `Gravidade`, `Natureza`, `Sangue`.
- Fontes: `Éter`.

Palavras personalizadas do mestre e valores desconhecidos são preservados sem
normalização por similaridade. A migração acrescenta `catalogSchemaVersion: 2`,
é idempotente e não altera classes, CDs, custos, efeitos ou flags desconhecidas.
