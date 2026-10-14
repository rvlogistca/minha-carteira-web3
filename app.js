const { ethers } = window.ethers;

let carteiraLocal = null;
let signerExterno = null;
let priceChart = null;
let localPriceChart = null;
let historicoTransacoes = [];
let precoAtual = { valor: 0, variacao: 0 };

const REDES = {
  56: { 
    name: 'BNB Chain', symbol: 'BNB', decimals: 18,
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com/tx/', coingeckoId: 'binancecoin'
  },
  97: { 
    name: 'BSC Testnet', symbol: 'tBNB', decimals: 18,
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com/tx/', coingeckoId: 'binancecoin'
  },
  1: { 
    name: 'Ethereum', symbol: 'ETH', decimals: 18,
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io/tx/', coingeckoId: 'ethereum'
  },
  137: { 
    name: 'Polygon', symbol: 'MATIC', decimals: 18,
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com/tx/', coingeckoId: 'matic-network'
  },
  42161: { 
    name: 'Arbitrum', symbol: 'ETH', decimals: 18,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/', coingeckoId: 'ethereum'
  },
  8453: { 
    name: 'Base', symbol: 'ETH', decimals: 18,
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org/tx/', coingeckoId: 'ethereum'
  }
};

function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.remove('hidden');
  toast.style.borderColor = 
    tipo === 'sucesso' ? '#10b981' : 
    tipo === 'erro' ? '#ef4444' : 
    tipo === 'aviso' ? '#f59e0b' : '#f3ba2f';
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function mostrarStatus(elementoId, mensagem, tipo) {
  const el = document.getElementById(elementoId);
  el.textContent = mensagem;
  el.className = `status show ${tipo}`;
  if (tipo !== 'success') setTimeout(() => el.classList.remove('show'), 6000);
}

function copiarParaAreaDeTransferencia(texto) {
  navigator.clipboard.writeText(texto).then(() => mostrarToast('✅ Copiado!', 'sucesso'));
}

function getRedeAtual() {
  const select = document.getElementById('networkSelect');
  const chainId = parseInt(select.value);
  return { chainId, ...REDES[chainId] };
}

function atualizarNomeRede() {
  const rede = getRedeAtual();
  const el = document.getElementById('currentNetworkName');
  if (el) el.textContent = rede.name;
  const sym = document.getElementById('sendSymbol');
  if (sym) sym.textContent = rede.symbol;
}

function gerarQRCode(texto) {
  const canvas = document.getElementById('receiveQr');
  if (!canvas || typeof QRCode === 'undefined') return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => {
    try {
      QRCode.toCanvas(canvas, texto, { 
        width: 144, margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      }, e => e && console.error('QR Code:', e));
    } catch (e) { console.error('QR Code:', e); }
  }, 50);
}

async function buscarPreco(rede) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${rede.coingeckoId}&vs_currencies=usd&include_24hr_change=true`);
    const d = await res.json();
    const k = rede.coingeckoId;
    return { valor: d[k]?.usd || 0, variacao: d[k]?.usd_24h_change || 0 };
  } catch { return { valor: 0, variacao: 0 }; }
}

function gerarDadosGrafico(baseValor, variacaoPct, pontos = 24) {
  const dados = [];
  let v = baseValor * (1 - variacaoPct / 200);
  const passo = (baseValor * (1 + variacaoPct / 200) - v) / pontos;
  for (let i = 0; i < pontos; i++) {
    v += passo + (Math.random() - 0.5) * passo * 0.5;
    dados.push(parseFloat(v.toFixed(4)));
  }
  dados[dados.length - 1] = baseValor;
  return dados;
}

async function inicializarGrafico(canvasId, rede) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  
  precoAtual = await buscarPreco(rede);
  const dados = gerarDadosGrafico(precoAtual.valor, precoAtual.variacao);
  const ctx = canvas.getContext('2d');
  const ehPositivo = precoAtual.variacao >= 0;
  const cor = ehPositivo ? 'rgba(14,181,130,1)' : 'rgba(246,70,93,1)';
  const corFundo = ehPositivo ? 'rgba(14,181,130,0.1)' : 'rgba(246,70,93,0.1)';
  const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
  
  if (canvasId === 'priceChart' && priceChart) priceChart.destroy();
  if (canvasId === 'localPriceChart' && localPriceChart) localPriceChart.destroy();
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'USD',
        data: dados,
        borderColor: cor,
        backgroundColor: corFundo,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#666', font: { size: 10 } } } }
    }
  });
  
  if (canvasId === 'priceChart') priceChart = chart;
  else localPriceChart = chart;
  
  const precoEl = document.getElementById('currentPrice');
  const variacaoEl = document.getElementById('priceChange');
  if (precoEl) precoEl.textContent = `$${precoAtual.valor.toFixed(4)}`;
  if (variacaoEl) {
    variacaoEl.textContent = `${ehPositivo ? '+' : ''}${precoAtual.variacao.toFixed(2)}%`;
    variacaoEl.className = `price-change ${ehPositivo ? 'positive' : 'negative'}`;
  }
}

document.querySelectorAll('.icon-button.reveal').forEach(botao => {
  botao.addEventListener('click', () => {
    const alvoId = botao.getAttribute('data-alvo');
    const codigo = document.getElementById(alvoId);
    if (codigo.classList.contains('masked')) {
      codigo.classList.remove('masked');
      if (alvoId === 'frase' && carteiraLocal?.mnemonic?.phrase) codigo.textContent = carteiraLocal.mnemonic.phrase;
      else if (alvoId === 'chave' && carteiraLocal?.privateKey) codigo.textContent = carteiraLocal.privateKey;
      botao.textContent = '🙈';
    } else {
      codigo.classList.add('masked');
      codigo.textContent = '••••••••••••••••••••••••••••••••';
      botao.textContent = '👁';
    }
  });
});

document.querySelectorAll('.icon-button.copiar').forEach(botao => {
  botao.addEventListener('click', () => {
    const alvoId = botao.getAttribute('data-alvo');
    const texto = document.getElementById(alvoId).textContent;
    if (texto && !texto.includes('•')) copiarParaAreaDeTransferencia(texto);
    else mostrarToast('⚠️ Revele o valor primeiro', 'aviso');
  });
});

document.getElementById('mostrarChave')?.addEventListener('change', function() {
  const input = document.getElementById('inputChavePrivada');
  if (input) input.type = this.checked ? 'text' : 'password';
});

document.getElementById('networkSelect').addEventListener('change', async () => {
  atualizarNomeRede();
  const rede = getRedeAtual();
  if (carteiraLocal || signerExterno) {
    mostrarToast(`🔄 Rede: ${rede.name}`, 'info');
    await inicializarGrafico('localPriceChart', rede);
  }
});

document.getElementById('btnCriar').addEventListener('click', () => {
  carteiraLocal = ethers.Wallet.createRandom();
  exibirCarteiraLocal();
  mostrarToast('✅ Carteira criada! Anote sua frase!', 'sucesso');
});

function exibirCarteiraLocal() {
  const rede = getRedeAtual();
  document.getElementById('endereco').textContent = carteiraLocal.address;
  document.getElementById('frase').textContent = '••••••••••••••••••••••••••••••••';
  document.getElementById('chave').textContent = '••••••••••••••••••••••••••••••••';
  document.getElementById('resultado').classList.remove('hidden');
  document.getElementById('sendPanel').classList.add('hidden');
  document.getElementById('saldoArea').classList.add('hidden');
  document.getElementById('txHistoryLocal').classList.add('hidden');
  gerarQRCode(carteiraLocal.address);
  atualizarNomeRede();
  inicializarGrafico('localPriceChart', rede);
}

document.getElementById('btnRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.remove('hidden');
  document.getElementById('inputFrase').value = '';
  document.getElementById('inputChavePrivada').value = '';
});

document.getElementById('btnCancelarRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.add('hidden');
});

document.getElementById('btnConfirmarRecuperar').addEventListener('click', () => {
  const frase = document.getElementById('inputFrase').value.trim();
  const chavePrivada = document.getElementById('inputChavePrivada').value.trim();
  try {
    if (frase) {
      const palavras = frase.split(/\s+/).filter(p => p);
      if (palavras.length !== 12 && palavras.length !== 24) throw new Error(`Precisa de 12 ou 24 palavras`);
      carteiraLocal = ethers.Wallet.fromPhrase(frase);
      mostrarToast('✅ Carteira recuperada pela frase!', 'sucesso');
    } else if (chavePrivada) {
      let chave = chavePrivada.startsWith('0x') ? chavePrivada : '0x' + chavePrivada;
      carteiraLocal = new ethers.Wallet(chave);
      mostrarToast('✅ Carteira recuperada pela chave!', 'sucesso');
    } else {
      mostrarToast('⚠️ Digite a frase OU a chave!', 'aviso');
      return;
    }
    document.getElementById('areaRecuperar').classList.add('hidden');
    exibirCarteiraLocal();
  } catch (erro) {
    mostrarToast(`❌ Erro: ${erro.message}`, 'erro');
  }
});

document.getElementById('btnNova').addEventListener('click', () => {
  carteiraLocal = null;
  historicoTransacoes = [];
  document.getElementById('resultado').classList.add('hidden');
  document.getElementById('sendPanel').classList.add('hidden');
  document.getElementById('saldoArea').classList.add('hidden');
  mostrarToast('🔒 Carteira fechada', 'sucesso');
});

document.getElementById('btnSaldo').addEventListener('click', async () => {
  if (!carteiraLocal) { mostrarToast('⚠️ Crie uma carteira primeiro!', 'aviso'); return; }
  const rede = getRedeAtual();
  try {
    mostrarToast('🔄 Consultando...');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const saldo = await provedor.getBalance(carteiraLocal.address);
    const saldoStr = ethers.formatEther(saldo);
    document.getElementById('saldoValor').textContent = parseFloat(saldoStr).toFixed(5);
    document.getElementById('saldoSymbol').textContent = rede.symbol;
    const preco = await buscarPreco(rede);
    document.getElementById('saldoUSD').textContent = (parseFloat(saldoStr) * preco.valor).toFixed(2);
    document.getElementById('saldoArea').classList.remove('hidden');
    mostrarToast(`✅ Saldo: ${parseFloat(saldoStr).toFixed(4)} ${rede.symbol}`, 'sucesso');
  } catch (erro) { mostrarToast('❌ Erro ao consultar saldo', 'erro'); }
});

document.getElementById('btnEnviarAbrir')?.addEventListener('click', () => {
  if (!carteiraLocal) { mostrarToast('⚠️ Crie uma carteira primeiro!', 'aviso'); return; }
  document.getElementById('sendPanel').classList.remove('hidden');
  document.getElementById('txResult').classList.remove('show');
  document.getElementById('destino').value = '';
  document.getElementById('valorEnvio').value = '';
});

document.getElementById('btnEnviar').addEventListener('click', async () => {
  if (!carteiraLocal) return;
  const destino = document.getElementById('destino').value.trim();
  const valor = document.getElementById('valorEnvio').value;
  const gasPrice = document.getElementById('gasPrice').value || '5';
  const rede = getRedeAtual();
  if (!ethers.isAddress(destino)) { mostrarStatus('txResult', '❌ Endereço inválido', 'error'); return; }
  if (!valor || parseFloat(valor) <= 0) { mostrarStatus('txResult', '❌ Valor inválido', 'error'); return; }
  try {
    mostrarStatus('txResult', '🔄 Enviando...', 'success');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const carteiraConectada = carteiraLocal.connect(provedor);
    const tx = await carteiraConectada.sendTransaction({
      to: destino,
      value: ethers.parseEther(valor),
      gasPrice: ethers.parseUnits(gasPrice, 'gwei')
    });
    mostrarStatus('txResult', `✅ Enviada! Hash: ${tx.hash}\n🔗 ${rede.explorer}${tx.hash}`, 'success');
    adicionarTransacaoHistorico({
      hash: tx.hash, destino, valor, simbolo: rede.symbol,
      tempo: new Date().toLocaleTimeString('pt-BR')
    });
    await tx.wait();
    mostrarToast('✅ Confirmada!', 'sucesso');
  } catch (erro) { mostrarStatus('txResult', `❌ ${erro.message}`, 'error'); }
});

function adicionarTransacaoHistorico(tx) {
  historicoTransacoes.unshift(tx);
  const el = document.getElementById('txHistoryLocal');
  const lista = document.getElementById('txListLocal');
  el.classList.remove('hidden');
  lista.innerHTML = historicoTransacoes.slice(0, 5).map(t => `
    <div class="tx-item">
      <div>📤 ${t.valor} ${t.simbolo}</div>
      <div class="tx-hash">${t.hash.slice(0, 18)}...</div>
      <div class="tx-time">${t.tempo}</div>
    </div>
  `).join('');
}

// === CONEXÃO DE CARTEIRAS EXTERNAS ===
async function conectarCarteiraExterna(tipo) {
  const rede = getRedeAtual();
  const provider = window.ethereum;
  if (!provider) {
    mostrarToast(`⚠️ Instale a extensão ${tipo} primeiro!`, 'aviso');
    return;
  }
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + rede.chainId.toString(16) }] });
  } catch {
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + rede.chainId.toString(16),
          chainName: rede.name,
          nativeCurrency: { name: rede.symbol, symbol: rede.symbol, decimals: 18 },
          rpcUrls: [rede.rpc],
          blockExplorerUrls: [rede.explorer]
        }]
      });
    } catch (e) { console.log('Rede já existe'); }
  }
  try {
    const contas = await provider.request({ method: 'eth_requestAccounts' });
    signerExterno = new ethers.BrowserProvider(provider).getSigner();
    const endereco = contas[0];
    document.getElementById('externalCard').classList.remove('hidden');
    document.getElementById('chartSection').classList.remove('hidden');
    document.getElementById('externalAddress').textContent = endereco;
    document.getElementById('walletTypeLabel').textContent = tipo.toUpperCase();
    document.getElementById('walletNameLabel').textContent = tipo;
    document.getElementById('externalSymbol').textContent = rede.symbol;
    const prov = new ethers.JsonRpcProvider(rede.rpc);
    const saldo = await prov.getBalance(endereco);
    document.getElementById('externalBalance').textContent = parseFloat(ethers.formatEther(saldo)).toFixed(4);
    await inicializarGrafico('priceChart', rede);
    mostrarToast(`✅ ${tipo} conectada!`, 'sucesso');
  } catch (e) { mostrarToast(`❌ Falha na conexão`, 'erro'); }
}

document.getElementById('btnBinanceWeb3').addEventListener('click', () => conectarCarteiraExterna('Binance Web3 Wallet'));
document.getElementById('btnMetaMask').addEventListener('click', () => conectarCarteiraExterna('MetaMask'));
document.getElementById('btnTrust').addEventListener('click', () => conectarCarteiraExterna('Trust Wallet'));

document.getElementById('btnDesconectar')?.addEventListener('click', () => {
  signerExterno = null;
  document.getElementById('externalCard').classList.add('hidden');
  document.getElementById('chartSection').classList.add('hidden');
  mostrarToast('🔌 Desconectado', 'sucesso');
});
