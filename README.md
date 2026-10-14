# Nexus Wallet • Multi-Chain & Binance Web3

Carteira Web3 completa no navegador com suporte a **BNB Chain**, **Ethereum**, **Polygon** e outras redes.

Tema visual inspirado na Binance (dourado + preto).

---

## Funcionalidades

- Conectar **Binance Web3 Wallet**, **MetaMask** e **Trust Wallet**
- Criar carteira local (frase de recuperação + chave privada)
- Recuperar por **frase** ou **chave privada**
- Consultar saldo em tempo real + valor em USD
- Gráfico de preço (CoinGecko)
- Enviar tokens nativos (local ou carteira externa)
- Histórico de transações
- QR Code para receber
- Troca de rede automática
- Interface 100% responsiva

---

## Redes suportadas

| Rede         | Chain ID | Símbolo |
|--------------|----------|---------|
| BNB Chain    | 56       | BNB     |
| BSC Testnet  | 97       | tBNB    |
| Ethereum     | 1        | ETH     |
| Polygon      | 137      | MATIC   |
| Arbitrum     | 42161    | ETH     |
| Base         | 8453     | ETH     |

---

## Carteiras suportadas

| Carteira              | Tipo              | Observação |
|-----------------------|-------------------|----------|
| Binance Web3 Wallet   | Extensão          | Prioridade (tema Binance) |
| MetaMask              | Extensão / Mobile | Detecta automaticamente |
| Trust Wallet          | Extensão / Mobile | Deep link no celular |
| Carteira Local        | Navegador         | Apenas para aprendizado |

---

## Como usar

### Opção 1 – GitHub Pages (recomendado)

1. Vá em **Settings → Pages**
2. Source: **Deploy from a branch** → `main` → `/ (root)`
3. Salve e aguarde alguns minutos
4. Acesse a URL gerada (ex: `https://rvlogistca.github.io/minha-carteira-web3`)

### Opção 2 – Local

```bash
git clone https://github.com/rvlogistca/minha-carteira-web3.git
cd minha-carteira-web3
npx serve .
```

Abra o endereço que aparecer no terminal.

---

## Segurança

> **Atenção importante**

- A frase de recuperação e a chave privada **nunca saem do seu navegador**.
- **Não use a carteira local** para guardar valores reais.
- Para valores reais use sempre **Binance Web3 Wallet**, **MetaMask** ou **Trust Wallet** + hardware wallet.
- Nunca compartilhe sua frase ou chave privada.
- Este projeto é experimental e educacional.

---

## Tecnologias

- [ethers.js v6](https://docs.ethers.org/)
- [Chart.js](https://www.chartjs.org/)
- [QRCode.js](https://github.com/soldair/node-qrcode)
- CoinGecko API (preços)
- HTML5 + CSS3 + JavaScript puro

---

## Estrutura

```
minha-carteira-web3/
├── index.html      # Interface
├── style.css       # Tema Binance (dourado)
├── app.js          # Lógica completa
├── LICENSE         # MIT
└── README.md       # Este arquivo
```

---

## Licença

MIT – use, modifique e distribua livremente.

---

## Aviso

Este software é fornecido “como está”, sem garantias.  
Use por sua conta e risco. Sempre confira endereço e valor antes de confirmar qualquer transação.
