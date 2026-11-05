---
sidebar_position: 5
---

# Coletando respostas

## 4.1 Escolhendo um projeto e uma pesquisa

A lista de **Projetos** mostra os projetos ativos de que você participa. Toque num deles e depois na pesquisa que vai aplicar.

<img src={require('./img/collect-projects-pt.png').default} alt="A lista de projetos" width="300" />

<img src={require('./img/collect-surveys-pt.png').default} alt="As pesquisas de um projeto" width="300" />

## 4.2 Respondendo as perguntas

A tela mostra **Pergunta X de Y** e salva cada resposta na hora (**Resposta salva**): você nunca precisa salvar à mão.

- Uma escolha única, um Sim/Não, uma lista suspensa e uma avaliação (inclusive o NPS, de 0 a 10) **passam sozinhas para a próxima pergunta** depois que você escolhe. Se uma pergunta dessas não for obrigatória, **Pular** segue sem resposta.
- Uma múltipla escolha, um texto ou um número têm **Anterior** e **Próximo**.
- Uma pergunta marcada **\* Obrigatório** precisa ser respondida: enquanto não for, **Próximo** avisa "Este campo é obrigatório".

<img src={require('./img/collect-question-choice-pt.png').default} alt="Uma pergunta de escolha" width="300" />

<img src={require('./img/collect-question-rating-pt.png').default} alt="Uma pergunta de avaliação" width="300" />

## 4.3 Perguntas condicionais

Algumas opções abrem uma **pergunta condicional** logo abaixo delas: por exemplo, "Principal motivo de insatisfação" aparece quando o respondente escolhe "Insatisfeito". Se o respondente trocar a opção, a condicional e a resposta dela somem.

<img src={require('./img/collect-question-follow-up-pt.png').default} alt="Uma pergunta condicional aberta por uma opção" width="300" />

## 4.4 Finalizando a entrevista

Na última pergunta, toque em **Finalizar**. O app diz o que aconteceu:

- **Entrevista enviada!** O servidor recebeu a entrevista.
- **Entrevista salva.** "Será enviada quando houver conexão." Ela fica no aparelho e sai sozinha assim que houver conexão (veja [Enviando as entrevistas](./sending.md)).

Depois, escolha **Nova entrevista nesta pesquisa** ou **Escolher outra pesquisa**.

<img src={require('./img/collect-final-sent-pt.png').default} alt="A tela final, entrevista enviada" width="300" />

<img src={require('./img/collect-final-saved-pt.png').default} alt="A tela final, entrevista salva para envio posterior" width="300" />

## 4.5 Retomando uma entrevista interrompida

Se uma entrevista for interrompida (uma ligação, o app fechou, o respondente precisou sair), as respostas já estão salvas. A tela de **Projetos** mostra **Continuar última entrevista**: toque para seguir de onde parou. Abrir a mesma pesquisa de novo também retoma a entrevista.
