---
sidebar_position: 7
---

# Enviando as entrevistas

## 6.1 O envio é automático

Você não precisa enviar nada à mão. O app envia sozinho as entrevistas que aguardam no aparelho, assim que houver conexão: logo depois que você finaliza uma, quando a conexão volta, quando você abre o app e depois que você entra. Se o servidor não responder, o app tenta de novo mais tarde sozinho, esperando um pouco mais a cada vez. Uma nova tentativa nunca duplica a entrevista.

## 6.2 A tela Entrevistas Pendentes

O **ícone de nuvem** no alto da tela de **Projetos** abre as **Entrevistas Pendentes**, com um número quando há entrevistas aguardando. A lista mostra as entrevistas deste aparelho **de quem está conectado**:

| Status | O que significa |
|---|---|
| **Aguardando envio** | Sai sozinha quando houver conexão. |
| **Enviando** | Está sendo enviada. |
| **Não enviada** | A última tentativa falhou: "Ainda não enviada. Será tentada de novo automaticamente." |
| **Enviada** | O servidor já recebeu. |

O **ícone de sincronizar**, no alto, envia tudo na hora; **Tentar novamente** tenta de novo uma entrevista não enviada, e **Excluir** remove uma entrevista do aparelho de vez.

As entrevistas enviadas continuam na lista até você tocar em **Limpar**, que as remove só deste aparelho (o servidor continua com elas), ou até completarem 30 dias.

<img src={require('./img/collect-pending-pt.png').default} alt="A tela Entrevistas Pendentes" width="300" />

:::note[Aparelhos compartilhados]

Se vários entrevistadores usam o mesmo aparelho, cada um vê e envia só as próprias entrevistas. As dos outros continuam guardadas no aparelho e são enviadas quando o dono delas entrar de novo.

:::
