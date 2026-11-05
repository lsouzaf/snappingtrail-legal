---
sidebar_position: 4
---

# Primeiro acesso — configurando o app

## 3.1 A tela de login

O app abre na tela de login, com **Entrar** e **Configurações**. Sem conexão, **Entrar** fica desativado e o app avisa: "Sem conexão com a internet. Conecte-se para entrar."

<img src={require('./img/collect-login-pt.png').default} alt="A tela de login" width="300" />

## 3.2 Digitando o código da empresa

Toque em **Configurações**. Em **Empresa**, digite no campo **Código da empresa** o código que a sua empresa passou, por exemplo <kbd>acme</kbd>.

:::note[Ambientes de teste]

Se a sua empresa estiver testando o sistema num ambiente separado, o código pode vir com um sufixo, como <kbd>acme@dev</kbd> ou <kbd>acme@hml</kbd>. Digite exatamente como recebeu: o app configura os servidores a partir dele.

:::

## 3.3 Validando o código

O app confere o código sozinho, um instante depois que você para de digitar; você também pode tocar em **Validar**. Quando a empresa é encontrada, a tela mostra o **Realm** e o **Idioma** dela, e o app pode passar para o idioma da empresa. Se não for encontrada, o app avisa: confira o código e a conexão.

<img src={require('./img/collect-settings-pt.png').default} alt="As configurações, com o código da empresa" width="300" />

## 3.4 Salvando e entrando

Toque em **Salvar** ("Configurações salvas") e volte à tela de login pela seta. Toque em **Entrar**: a página de login abre no navegador do aparelho. Entre por lá.

O app só aceita uma conta da empresa configurada. Com uma conta de outra empresa, ele avisa: "Sua conta não pertence à empresa configurada (<code>acme</code>)." e não entra.

Depois do login, o app baixa os seus projetos e pesquisas e mostra a lista de **Projetos**.

## 3.5 Quando a sessão expira

Se a sua sessão terminar com o app em uso, o app volta para a tela de login e avisa: "Sua sessão expirou. Entre de novo." As entrevistas que aguardam envio continuam no aparelho.

<img src={require('./img/collect-login-session-expired-pt.png').default} alt="A tela de login depois que a sessão expirou" width="300" />
