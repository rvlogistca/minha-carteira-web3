# Nexus Wallet • Multi-Chain

Carteira Web3 real no navegador com suporte a **múltiplas redes** e **múltiplas carteiras**.

Tema visual dourado futurista inspirado em painéis de controle.

---

## Funcionalidades

- Conectar **MetaMask**, **Trust Wallet** e **Safe**
- Criar carteira local (frase de recuperação + chave privada)
- Recuperar carteira por frase mnemônica
- Consultar saldo em tempo real
- Enviar tokens nativos
- QR Code para receber
- Troca de rede automática
- Interface responsiva (desktop + mobile)

---

## Redes suportadas

| Rede       | Chain ID | Símbolo |
|------------|----------|---------|
| Ethereum   | 1        | ETH     |
| Polygon    | 137      | MATIC   |
| BSC        | 56       | BNB     |
| Arbitrum   | 42161    | ETH     |
| Optimism   | 10       | ETH     |
| Base       | 8453     | ETH     |
| Avalanche  | 43114    | AVAX    |
| Fantom     | 250      | FTM     |

---

## Carteiras suportadas

| Carteira       | Tipo              | Observação |
|----------------|-------------------|----------|
| MetaMask       | Extensão / Mobile | Detecta automaticamente |
| Trust Wallet   | Extensão / Mobile | Deep link no celular |
| Safe           | Smart Account     | Detecta extensão ou conta contrato |
| Carteira Local | Navegador         | Apenas para aprendizado |

---

## Como usar

### Opção 1 – Abrir direto no GitHub Pages (recomendado)

1. Ative o GitHub Pages no repositório (Settings → Pages → Deploy from main)
2. Acesse a URL gerada
3. Conecte sua carteira ou crie uma nova

### Opção 2 – Rodar localmente

```bash
# Clone o repositório
git clone https://github.com/rvlogistca/minha-carteira-web3.git
cd minha-carteira-web3

# Abra o index.html no navegador
# Ou use um servidor local:
npx serve .
