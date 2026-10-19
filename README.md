# Nexus Wallet • Multi-Chain & Binance Web3

Carteira Web3 completa no navegador com suporte a **BNB Chain**, **Ethereum**, **Polygon** e outras redes.

Tema visual inspirado na Binance (dourado + preto).

---

## ✨ Funcionalidades

- Conectar **Binance Web3 Wallet**, **MetaMask** e **Trust Wallet**
- Criar carteira local (frase de recuperação + chave privada)
- Recuperar carteira por **frase mnemônica** ou **chave privada**
- Consultar saldo em tempo real + valor convertido em USD
- Gráfico de variação de preço (dados da CoinGecko)
- Enviar tokens nativos (carteira local ou conectada)
- Histórico de transações
- QR Code para receber
- Troca de rede automática
- Interface 100% responsiva (celular + desktop)

---

## 🌐 Redes suportadas

| Rede         | Chain ID | Símbolo |
|--------------|----------|---------|
| BNB Chain    | 56       | BNB     |
| BSC Testnet  | 97       | tBNB    |
| Ethereum     | 1        | ETH     |
| Polygon      | 137      | MATIC   |
| Arbitrum     | 42161    | ETH     |
| Base         | 8453     | ETH     |

---

## 🔌 Carteiras suportadas

| Carteira              | Tipo              | Observação |
|-----------------------|-------------------|----------|
| 🟡 Binance Web3 Wallet| Extensão Navegador| Recomendada |
| 🦊 MetaMask           | Extensão / Mobile | Detecta automaticamente |
| ◆ Trust Wallet        | App Mobile        | Abre pelo deep link |
| 💼 Carteira Local     | Apenas no navegador | Para aprendizado — NÃO use em produção |

---

## 🚀 Como usar

### Opção 1 — GitHub Pages (recomendado)

1. No seu repositório, vá em **Settings → Pages**
2. Em **Source**, escolha: **Deploy from a branch**
3. Selecione: `main` → `/ (root)`
4. Clique em **Save** e aguarde 2–3 minutos
5. Acesse a URL gerada: `https://rvlogistca.github.io/minha-carteira-web3/`

### Opção 2 — Rodar localmente

```bash
# Clone o repositório
git clone https://github.com/rvlogistca/minha-carteira-web3.git

# Entre na pasta
cd minha-carteira-web3

# Abra no navegador
# Opção A: Clique duas vezes em index.html
# Opção B: Use um servidor local (recomendado)
npx serve .
