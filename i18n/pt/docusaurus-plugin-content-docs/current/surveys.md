---
id: surveys
title: Pesquisas
sidebar_position: 3
---

Uma pesquisa é o questionário que os seus respondentes preenchem. As pesquisas ficam dentro de um **projeto**, e um projeto pode reunir várias pesquisas sobre o mesmo assunto.

Só **administradores** criam e editam pesquisas. Gerentes, coordenadores e analistas podem vê-las.

## Crie uma pesquisa

1. Abra **Projetos** e escolha um projeto.
2. Escolha **Nova Pesquisa**. Dê um **Título da Pesquisa** e, se quiser, uma **Descrição**, e escolha **Criar Pesquisa**.
3. Acrescente perguntas com **Texto**, **Escolha** ou **Avaliação**, ou traga perguntas prontas com **Do catálogo**.

Uma pesquisa nova começa como rascunho.

![As pesquisas de um projeto](./img/surveys-list-pt.png)

![O construtor de pesquisas](./img/surveys-builder-pt.png)

## Tipos de pergunta

O construtor cria três tipos de pergunta:

- **Texto**: uma resposta livre.
- **Escolha**: uma lista de opções, com **Resposta única** ou **Múltiplas respostas**. Os atalhos **Sim/Não** e **Likert** preenchem as opções para você; o Likert vai de "Discordo totalmente" a "Concordo totalmente".
- **Avaliação**: uma nota numa escala. Escolha um predefinido, **NPS** (0 a 10), **CSAT** (1 a 5) ou **CES** (1 a 7), ou **Personalizada** para a sua própria escala.

![Uma pergunta de escolha](./img/surveys-choice-pt.png)

Uma pergunta trazida do catálogo mantém o tipo dela, que pode ser qualquer um destes:

| | |
|---|---|
| Texto curto | Texto longo |
| Número | Avaliação |
| Controle deslizante | NPS |
| Escolha única | Múltipla escolha |
| Lista suspensa | Ordenação |
| Likert | Data |
| Hora | Data e hora |
| Sim/Não | Texto informativo |

Marque **Obrigatória** quando toda entrevista concluída precisar responder a pergunta. A resposta é conferida quando a entrevista é concluída, e só para as perguntas que o respondente viu.

## Perguntas condicionais

Numa pergunta de escolha, cada opção pode abrir uma **pergunta condicional**, mostrada só para quem escolheu aquela opção. Por exemplo, "Principal motivo de insatisfação" pode aparecer só para quem respondeu "Insatisfeito"; os demais nunca a veem.

Debaixo da opção, escolha **Adicionar pergunta condicional** e escreva a pergunta. A condicional é respondida com texto livre. Marque **Obrigatória quando exibida** se quem a vê precisa respondê-la.

## O catálogo de perguntas

O catálogo reúne perguntas prontas, as mesmas para todas as contas. No construtor, **Do catálogo** abre o **Catálogo de perguntas**; a pergunta escolhida é copiada para a sua pesquisa, onde você pode alterá-la como qualquer outra.

## Status

| Status | O que significa |
|---|---|
| Rascunho | Em construção. Ninguém consegue responder ainda. |
| Ativa | Aberta para respostas. Uma pesquisa precisa de pelo menos uma pergunta para ficar ativa. |
| Inativa | Fechada para novas entrevistas. As entrevistas já iniciadas ainda podem ser concluídas, e as respostas são preservadas. |

**Pausar coleta** deixa uma pesquisa ativa inativa, e **Retomar coleta** a abre de novo.

## Altere uma pesquisa que não é mais rascunho

Quando a pesquisa deixa de ser rascunho, as perguntas não podem mais mudar: o construtor as mostra só para leitura. O título e a descrição continuam editáveis.

Para mudar as perguntas, escolha **Nova versão**. Ela cria um novo rascunho com uma cópia das perguntas, que você edita e depois ativa. A pesquisa anterior mantém as respostas dela.

## Exclua uma pesquisa

Só um rascunho sem respostas pode ser excluído, e a exclusão é definitiva. Uma pesquisa que já esteve ativa não é excluída: pause a coleta dela.

## Próximos passos

- [Colete respostas por link ou QR Code](../collection)
- [Colete em campo com o app Collect](../collect-app)
