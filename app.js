(() => {
  'use strict';

  const { ethers } = window;

  let carteiraLocal = null;
  let externalProvider = null;
  let externalSigner = null;
  let externalAddress = null;
  let connectedWalletName = '';
  let priceChart = null;
  let localPriceChart = null;
  let historicoTransacoes = [];
  let precoAtual = { valor: 0, variacao: 0 };

  const REDES = {
    56: {
      name: 'BNB Chain', symbol: 'BNB', decimals: 18,
      rpc: 'https://bsc-dataseed.binance.org',
      explorer: 'https://bscscan.com/tx/',
      coingeckoId: 'binancecoin'
    },
    97: {
      name: 'BSC Testnet', symbol: 'tBNB', decimals: 18,
      rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      explorer: 'https://testnet.bscscan.com/tx/',
      coingeckoId: 'binancecoin'
    },
    1: {
      name: 'Ethereum', symbol: 'ETH', decimals: 18,
      rpc: 'https://eth.llamarpc.com',
      explorer: 'https://etherscan.io/tx/',
      coingeckoId: 'ethereum'
    },
    137: {
      name: 'Polygon', symbol: 'MATIC', decimals: 18,
      rpc: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com/tx/',
      coingeckoId: 'matic-network'
    },
    42161: {
      name: 'Arbitrum', symbol: 'ETH', decimals: 18,
      rpc: 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io/tx/',
      coingeckoId: 'ethereum'
    },
    8453: {
      name: 'Base', symbol: 'ETH', decimals: 18,
      rpc: 'https://mainnet.base.org',
      explorer: 'https://basescan.org/tx/',
      coingeckoId: 'ethereum'
    }
  };

  // ========== Helpers ==========
  function $(id) { return document.getElementById(id); }

  function mostrarToast(mensagem, tipo = 'info') {
    const toast = $('toast');
    toast.textContent = mensagem;
    toast.classList.remove('hidden');
    toast.style.borderColor =
      tipo === 'sucesso' ? '#10b981' :
      tipo === 'erro' ? '#ef4444' :
      tipo === 'aviso' ? '#f59e0b' : '#f3ba2f';
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  function mostrarStatus(elementoId, mensagem, tipo) {
    const el = $(elementoId);
    if (!el) return;
    el.textContent = mensagem;
    el.className = `status show ${tipo}`;
    if (tipo !== 'success') setTimeout(() => el.classList.remove('show'), 8000);
  }

  function copiarParaAreaDeTransferencia(texto) {
    navigator.clipboard.writeText(texto)
      .then(() => mostrarToast('✅ Copiado!', 'sucesso'))
      .catch(() => mostrarToast('❌ Falha ao copiar', 'erro'));
  }

  function getRedeAtual() {
    const select = $('networkSelect');
    const chainId = parseInt(select.value, 10);
    return { chainId, ...REDES[chainId] };
  }

  function atualizarNomeRede() {
    const rede = getRedeAtual();
    const el = $('currentNetworkName');
    if (el) el.textContent = rede.name;
    const sym = $('sendSymbol');
    if (sym) sym.textContent = rede.symbol;
    const extSym = $('externalSymbol');
    if (extSym) extSym.textContent = rede.symbol;
    const saldoSym = $('saldoSymbol');
    if (saldoSym) saldoSym.textContent = rede.symbol;
  }

  function gerarQRCode(texto) {
    const canvas = $('receiveQr');
    if (!canvas || typeof QRCode === 'undefined') return;
    QRCode.toCanvas(canvas, texto, {
      width: 144,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    }, err => {
      if (err) console.error('QR Code:', err);
    });
  }

  // ========== Preço e Gráfico ==========
  async function buscarPreco(rede) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${rede.coingeckoId}&vs_currencies=usd&include_24hr_change=true`
      );
      const d = await res.json();
      const k = rede.coingeckoId;
      return { valor: d[k]?.usd || 0, variacao: d[k]?.usd_24h_change || 0 };
    } catch {
      return { valor: 0, variacao: 0 };
    }
  }

  function gerarDadosGrafico(baseValor, variacaoPct, pontos = 24) {
    const dados = [];
    let v = baseValor * (1 - Math.abs(variacaoPct) / 200);
    const passo = (baseValor - v) / (pontos - 1);
    for (let i = 0; i < pontos; i
... 
