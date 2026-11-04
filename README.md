# D&D 4e Combat Automation

Módulo para **Foundry VTT V14** com o sistema **dnd4e 0.9.3+** que automatiza a burocracia de combate do D&D 4e.
*(English below.)*

## O que faz (v0.6)

| Recurso | Como funciona |
|---|---|
| **Presa do Caçador** | Ao usar o poder, o inimigo visível mais próximo (ou o token que você mirou) recebe um ícone com a arte do seu token. Na janela de dano aparece **"Presa do Caçador +1d6"** ligado (d8 com *Lethal Hunter*; 2d/3d nos níveis 11/21). Desligue com um clique. Depois de usar, o toggle vem desligado até o início do seu próximo turno. Só uma presa por vez. Termina no fim do encontro ou quando a presa cai a 0 PV. |
| **Maldição do Bruxo** | Igual à Presa: inimigo mais próximo, ícone no token, **"Maldição do Bruxo +1d6"** uma vez por turno, não amaldiçoa quem já está amaldiçoado. **Pacto Estelar:** quando um amaldiçoado cai, o bruxo recebe *Destino do Vácuo (+N)* e uma mensagem privada. |
| **Fúria do Bárbaro** | Usar um poder com a palavra-chave Fúria coloca o efeito "Fúria: …" no bárbaro até o fim do encontro (e encerra a fúria anterior). **Fúria da Caçada de Sangue:** toggle +mod. de CON em ataques corpo a corpo, ligado quando você ou o alvo está sangrando. **Golpe Insistente:** +1d6 em fúria. |
| **Marcas** | **Marca Indireta** (Bardo): ao acertar, você escolhe o aliado a até 5 quadrados e o alvo fica marcado por ele até o fim do seu próximo turno. A marca usa a condição de marca do próprio sistema, então o −2 por ignorar a marca já é aplicado na rolagem de ataque do monstro. |
| **Cobertura** | Na janela de ataque, Cobertura (−2) / Cobertura Superior (−5) são marcadas sozinhas. Usa a regra de canto a canto: paredes bloqueiam sempre; inimigos do atacante bloqueiam só ataques à distância. |
| **Prévia de cobertura** | Ao mirar num token, aparecem as linhas: verde = livre, vermelho = parede, laranja = criatura. Só você vê. Desligue em *Configurações do módulo* ou por um atalho de teclado (sem tecla padrão). |
| **Selos nos tokens** | Presa (verde), Maldição (roxo) e Marca (vermelho) aparecem como um selo grande no canto superior direito do token, com o retrato de quem marcou. Marcas aplicadas pelo próprio sistema também ganham selo. |
| **Rastreador de Ações** | Controla as ações Padrão, Movimento, Mínima, Imediata e de Oportunidade. Usar um poder gasta a ação dele, com as trocas da regra (padrão → movimento/mínima, movimento → mínima). Ponto de Ação dá uma ação padrão extra. Zera no início do turno de cada um. Se a ação já foi gasta, só avisa. Aparece como marcadores no Combat Tracker, nos retratos do **Combat Tracker Dock** (se estiver ativo) e num painel flutuante, com as ações básicas: Andar, Ajustar, Correr, Levantar, Investida, Defesa Total, Retomar o Fôlego, Prestar Ajuda, Preparar e Ponto de Ação. Clicar num marcador liga/desliga manualmente. |
| **Ataques de oportunidade** | Quando um inimigo sai de um quadrado adjacente sem **ajustar** ou **teletransportar** (ação de movimento do token), ou faz um ataque à distância/de área ao lado de alguém, quem controla a criatura ameaçada recebe um cartão privado no chat com o botão **"atacar"**. O botão mira o alvo e rola o Ataque Básico Corpo a Corpo no modo oportunidade, gastando a ação de oportunidade. Não avisa criaturas atordoadas, pasmas, inconscientes etc., nem quem já usou a ação de oportunidade no turno. |
| **Movimento automático** | No turno do combatente, arrastar o token gasta a ação de movimento: andar até o deslocamento conta como uma ação, passar disso usa outra (trocando a padrão se precisar); ajustar (ação de movimento *Ajustar* do token) é uma ação própria. Outra ação no meio encerra o movimento. Poderes com ajuste embutido (Golpe Lépido, Golpe Insistente…) dão o ajuste de graça: se você ajustou antes do ataque, a ação de movimento é devolvida; se ajustar depois, não é cobrada. Teletransporte, desfazer, investida e tokens de jogador arrastados pelo mestre (movimento forçado) não contam. |
| **Poderes com gatilho** | Quando o gatilho de um poder acontece, quem o controla recebe um cartão privado (roxo) com o botão **"Usar …"**: Precisão Élfica (errou um ataque), Astúcia da Raposa (inimigo faz ataque corpo a corpo contra você), Assalto Furioso (acertou um inimigo; ao usar, a próxima rolagem de dano já vem com +1[A], ou +1d8 se não for ataque com arma), Investida Célere (derrubou um inimigo), Cólera Infernal (inimigo a até 10 quadrados te acertou). O módulo lê o texto do **Gatilho** (PT/EN), então poderes novos e de monstros com gatilhos parecidos também funcionam. Não oferece poderes já gastos nem reações imediatas no próprio turno ou com a ação imediata já usada. |
| **Aplicar dano** | Os cartões de dano mostram os alvos do ataque original com os botões **Dano** e **Metade** (dano de acerto vai para quem foi acertado, dano de erro para quem foi errado). Se um jogador clicar em monstros, o mestre aplica automaticamente. Também há **Dano/Metade nos selecionados** (para missclick) e **Trocar para os alvos atuais**. |
| **Efeitos ao acertar** | Zombaria Malévola (−2 nos ataques do alvo), Palavra Pavorosa (−1 em Vontade, ou 1 + INT com Pacto Estelar), Maldição do Sonho Obscuro (efeito até salvar) e Grito Inspirador (aliados que acertarem o alvo recuperam PV = CAR do bardo) são aplicados sozinhos nos alvos atingidos. Grande Trespassar ganha o toggle "+N (inimigos adjacentes)" no dano. |
| **Tiro Primoroso** | +1 nos ataques à distância quando nenhum aliado está mais perto do alvo. |
| **PV temporários** | Vigor da Fúria Sangrenta (Grontar, automático ao derrubar um inimigo) e Virtude da Bravura (cartão para o bardo quando um aliado a até 5 quadrados deixa um inimigo sangrando ou o derruba; uma vez por rodada). |
| **Atributos modificados** | Nas fichas (padrão e do Fox, personagens e monstros), defesas alteradas por efeitos temporários ficam vermelhas (penalidade) ou verdes (bônus), e o tooltip mostra o que está mudando, ex.: "Palavra Pavorosa: −3". A janela de ataque lista os modificadores automáticos de cada alvo (Tiro Primoroso +1, Zombaria Malévola −2…), cada um com liga/desliga. |
| **Rolagens legíveis** | No chat, cada rolagem mostra quem rolou, o poder e a fórmula resumida ("Aegustarion — Ataque Básico à Distância: 1d20 + 7") e as listas **Bônus** (Arma (Treinamento) +2, Atributo (Destreza) +4, ½ Nível +0), **Situacional** (Vantagem de Combate, Tiro Primoroso, dano extra da Presa…) e **Penalidades**. Fica dentro da expressão da rolagem: aparece ao clicar para expandir. |
| **Dano condicional e rolagens** | **Cólera Infernal** (PHB): +1 racial no próximo ataque e, se acertar, +CAR no dano (já marcado na janela de dano). **Radiância Atroz**: se o alvo se aproximar do bruxo no próximo turno, o dano extra é rolado na hora (só na primeira vez). **Precisão Élfica** rola de novo o último ataque contra os mesmos alvos. **Astúcia da Raposa** soma +SAB no próximo ataque básico, e o **Destino do Vácuo** soma +N no próximo ataque (com liga/desliga na janela). |
| **Idioma do jogo 4e** | Em *Configurações do módulo → Idioma do jogo 4e*, cada usuário escolhe o idioma do sistema dnd4e (atributos, perícias, condições, rótulos da ficha) e deste módulo, independente da interface do Foundry. Ex.: Foundry em inglês, conteúdo 4e em português. |

Cartões que dependem do resultado de um ataque esperam a animação do **Dice So Nice** terminar.

Tudo funciona em **português e inglês**. Os poderes são reconhecidos pelo identificador do compêndio (`ranger-hunters-quarry`, `warlock-warlocks-curse`, …) ou pelo nome em PT/EN.

Os jogadores podem aplicar efeitos em tokens de monstros: o módulo pede ao mestre conectado para criar o efeito. **É preciso um mestre logado.**

### Limitações conhecidas
- Os toggles aparecem na janela de dano. Se a rolagem for "rápida" (fast-forward, sem janela), o dano extra não é somado.
- A cobertura de **ataques de área** não é automatizada, porque a origem é o quadrado da área e o módulo não sabe onde ela foi colocada. Ataques contíguos são calculados a partir do atacante.
- Num crítico, o dano extra é maximizado (regra do Rules Compendium).
- Só funciona em grade quadrada.
- Movimento forçado (empurrar, puxar, conduzir) feito arrastando o token também gera o aviso de oportunidade; basta ignorar o cartão.

### Macro: marcar alvos manualmente
Selecione quem marca, mire nos alvos e execute:
```js
const marker = canvas.tokens.controlled[0]?.actor;
game.modules.get("dnd4e-combat-automation").api.applyMark({ marker, targets: [...game.user.targets] });
```

### Instalação (Molten / Foundry)
Depois que houver um release no GitHub, em *Instalar Módulo* cole a URL do manifest:
`https://github.com/LucD20/dnd4e-combat-automation/releases/latest/download/module.json`

Ative o módulo no mundo. A opção do sistema **"Automação dinâmica"** (dnd4e) deve estar ligada para o −2 de marca funcionar.

---

## English

Automates D&D 4e combat bookkeeping for the dnd4e system on Foundry V14:
- **Hunter's Quarry** and **Warlock's Curse**: tag the nearest visible enemy (or your target) with your token art. The damage dialog gets a toggle for the extra damage, once per turn. The tag ends at the end of the encounter or when the creature drops to 0 HP. Star Pact warlocks get Fate of the Void.
- **Barbarian rages**: a rage effect until the end of the encounter. Bloodhunt Rage and Pressing Strike bonuses appear as damage toggles.
- **Marks**: Misdirected Mark marks hit targets on behalf of a chosen ally. Marks use the system's mark status, so the system applies the −2 itself. `api.applyMark()` is available for macros.
- **Cover**: automatic cover/superior cover in the attack dialog (corner-to-corner lines; walls always block, enemy creatures block ranged attacks only), plus a client-side line preview while targeting.

Limitations: damage toggles need the damage dialog (no fast-forward); area attacks don't get automatic cover; square grids only.
