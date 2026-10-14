const { ethers } = window.ethers;

// ===================== ESTADO =====================
let carteiraLocal = null;
let providerExterno = null;
let signerExterno = null;
let enderecoAtivo = null;
let localPriceChart = null;
let historicoTransacoes = [];
let tokensAdicionados = []; // { address, symbol, decimals, balance, usd }

const REDES = {
  56: {
    name: 'BNB Chain',
    symbol: 'BNB',
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com/tx/',
    coingeckoId: 'binancecoin',
    chainIdHex: '0x38'
  },
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com/tx/',
    coingeckoId: 'binancecoin',
    chainIdHex: '0x61'
  },
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io/tx/',
    coingeckoId: 'ethereum',
    chainIdHex: '0x1'
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com/tx/',
    coingeckoId: 'matic-network',
    chainIdHex: '0x89'
  },
  42161: {
    name: 'Arbitrum',
    symbol: 'ETH',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    coingeckoId: 'ethereum',
    chainIdHex: '0xa4b1'
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org/tx/',
    coingeckoId: 'ethereum',
    chainIdHex: '0x2105'
  }
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// ===================== UTILITÁRIOS =====================
function mostrarToast(msg, tipo = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.style.borderColor = tipo === 'sucesso' ? '#10b981' : tipo === 'erro' ? '#ef4444' : tipo === 'aviso' ? '#f59e0b' : '#f3ba2f';
  setTimeout(() => t.classList.add('hidden'), 3200);
}

function mostrarStatus(id, msg, tipo) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `status show ${tipo}`;
}

function copiar(texto) {
  navigator.clipboard.writeText(texto).then(() => mostrarToast('✅ Copiado!', 'sucesso'));
}

function getRede() {
  const chainId = parseInt(document.getElementById('networkSelect').value);
  return { chainId, ...REDES[chainId] };
}

function atualizarUIRede() {
  const rede = getRede();
  document.getElementById('currentNetworkName').textContent = rede.name;
  document.getElementById('saldoSymbol').textContent = rede.symbol;
  document.getElementById('externalSymbol').textContent = rede.symbol;
}

// ===================== QR CODE =====================
function gerarQR(texto) {
  const canvas = document.getElementById('receiveQr');
  if (!canvas) return;
  QRCode.toCanvas(canvas, texto, {
    width: 140,
    margin: 1,
    color: { dark: '#000', light: '#fff' }
  });
}

// ===================== PREÇOS =====================
async function buscarPreco(id) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`);
    const d = await res.json();
    return { valor: d[id]?.usd || 0, variacao: d[id]?.usd_24h_change || 0 };
  } catch {
    return { valor: 0, variacao: 0 };
  }
}

function gerarDadosFake(base, variacao, n = 24) {
  const dados = [];
  let v = base * (1 - Math.abs(variacao) / 200);
  const passo = (base - v) / n;
  for (let i = 0; i < n; i++) {
    v += passo + (Math.random() - 0.5) * passo * 0.6;
    dados.push(+v.toFixed(4));
  }
  dados[dados.length - 1] = base;
  return dados;
}

async function atualizarGrafico() {
  const rede = getRede();
  const preco = await buscarPreco(rede.coingeckoId);
  const dados = gerarDadosFake(preco.valor, preco.variacao);
  const canvas = document.getElementById('localPriceChart');
  if (!canvas) return;

  if (localPriceChart) localPriceChart.destroy();

  const positivo = preco.variacao >= 0;
  localPriceChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: Array(24).fill(''),
      datasets: [{
        data: dados,
        borderColor: positivo ? '#0eb582' : '#f6465d',
        backgroundColor: positivo ? 'rgba(14,181,130,0.12)' : 'rgba(246,70,93,0.12)',
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
      scales: {
        x: { display: false },
        y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#555', font: { size: 10 } } }
      }
    }
  });

  document.getElementById('currentPrice').textContent = `$${preco.valor.toFixed(4)}`;
  const el = document.getElementById('priceChange');
  el.textContent = `\( {positivo ? '+' : ''} \){preco.variacao.toFixed(2)}%`;
  el.className = `price-change ${positivo ? 'positive' : 'negative'}`;
}

// ===================== CARTEIRA LOCAL =====================
function exibirCarteira(endereco, isLocal = true) {
  enderecoAtivo = endereco;
  document.getElementById('endereco').textContent = endereco;
  document.getElementById('resultado').classList.remove('hidden');
  document.getElementById('connectPanel').classList.add('hidden');
  document.getElementById('areaRecuperar').classList.add('hidden');
  document.getElementById('sendPanel').classList.add('hidden');
  document.getElementById('addTokenPanel').classList.add('hidden');

  if (isLocal) {
    document.getElementById('sensitiveFields').classList.remove('hidden');
    document.getElementById('frase').textContent = '••••••••••••••••••••••••••••••••';
    document.getElementById('chave').textContent = '••••••••••••••••••••••••••••••••';
    document.getElementById('walletTitle').textContent = 'Carteira Local';
  } else {
    document.getElementById('sensitiveFields').classList.add('hidden');
    document.getElementById('walletTitle').textContent = 'Carteira Conectada';
  }

  gerarQR(endereco);
  atualizarUIRede();
  atualizarGrafico();
  atualizarSaldos();
}

document.getElementById('btnCriar').addEventListener('click', () => {
  carteiraLocal = ethers.Wallet.createRandom();
  exibirCarteira(carteiraLocal.address, true);
  mostrarToast('✅ Carteira criada! Anote a frase de recuperação!', 'sucesso');
});

document.getElementById('btnRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.remove('hidden');
});

document.getElementById('btnCancelarRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.add('hidden');
});

document.getElementById('btnConfirmarRecuperar').addEventListener('click', () => {
  const frase = document.getElementById('inputFrase').value.trim();
  const chave = document.getElementById('inputChavePrivada').value.trim();

  try {
    if (frase) {
      const palavras = frase.split(/\s+/).filter(Boolean);
      if (palavras.length !== 12 && palavras.length !== 24) throw new Error('Precisa de 12 ou 24 palavras');
      carteiraLocal = ethers.Wallet.fromPhrase(frase);
    } else if (chave) {
      const pk = chave.startsWith('0x') ? chave : '0x' + chave;
      carteiraLocal = new ethers.Wallet(pk);
    } else {
      mostrarToast('⚠️ Informe a frase ou a chave', 'aviso');
      return;
    }
    exibirCarteira(carteiraLocal.address, true);
    mostrarToast('✅ Carteira recuperada!', 'sucesso');
  } catch (e) {
    mostrarToast(`❌ ${e.message}`, 'erro');
  }
});

document.getElementById('btnNova').addEventListener('click', () => {
  carteiraLocal = null;
  signerExterno = null;
  providerExterno = null;
  enderecoAtivo = null;
  tokensAdicionados = [];
  historicoTransacoes = [];
  document.getElementById('resultado').classList.add('hidden');
  document.getElementById('connectPanel').classList.remove('hidden');
  document.getElementById('tokenList').innerHTML = '<p class="hint empty-tokens">Nenhum token adicionado ainda</p>';
  mostrarToast('🔒 Carteira fechada', 'sucesso');
});

// ===================== REVEAL / COPIAR =====================
document.querySelectorAll('.icon-button.reveal').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.alvo;
    const el = document.getElementById(id);
    if (el.classList.contains('masked')) {
      el.classList.remove('masked');
      if (id === 'frase') el.textContent = carteiraLocal?.mnemonic?.phrase || '—';
      if (id === 'chave') el.textContent = carteiraLocal?.privateKey || '—';
      btn.textContent = '🙈';
    } else {
      el.classList.add('masked');
      el.textContent = '••••••••••••••••••••••••••••••••';
      btn.textContent = '👁';
    }
  });
});

document.querySelectorAll('.icon-button.copiar').forEach(btn => {
  btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.alvo);
    if (el.textContent.includes('•')) {
      mostrarToast('⚠️ Revele o valor primeiro', 'aviso');
      return;
    }
    copiar(el.textContent);
  });
});

document.getElementById('mostrarChave')?.addEventListener('change', function () {
  document.getElementById('inputChavePrivada').type = this.checked ? 'text' : 'password';
});

// ===================== SALDOS =====================
async function atualizarSaldos() {
  if (!enderecoAtivo) return;
  const rede = getRede();
  const provider = new ethers.JsonRpcProvider(rede.rpc);

  try {
    // Nativo
    const bal = await provider.getBalance(enderecoAtivo);
    const balStr = ethers.formatEther(bal);
    document.getElementById('saldoValor').textContent = parseFloat(balStr).toFixed(5);
    const preco = await buscarPreco(rede.coingeckoId);
    document.getElementById('saldoUSD').textContent = (parseFloat(balStr) * preco.valor).toFixed(2);

    // Tokens
    await Promise.all(tokensAdicionados.map(async (t) => {
      try {
        const contract = new ethers.Contract(t.address, ERC20_ABI, provider);
        const balToken = await contract.balanceOf(enderecoAtivo);
        t.balance = ethers.formatUnits(balToken, t.decimals);
      } catch {
        t.balance = '0';
      }
    }));
    renderTokens();
    mostrarToast('✅ Saldos atualizados', 'sucesso');
  } catch (e) {
    mostrarToast('❌ Erro ao consultar saldos', 'erro');
  }
}

document.getElementById('btnSaldo').addEventListener('click', atualizarSaldos);

// ===================== TOKENS =====================
function renderTokens() {
  const list = document.getElementById('tokenList');
  if (tokensAdicionados.length === 0) {
    list.innerHTML = '<p class="hint empty-tokens">Nenhum token adicionado ainda</p>';
    return;
  }
  list.innerHTML = tokensAdicionados.map((t, i) => `
    <div class="token-item">
      <div class="token-info">
        <span class="token-symbol">${t.symbol}</span>
        <span class="token-balance">${parseFloat(t.balance || 0).toFixed(4)}</span>
      </div>
      <div>
        <button class="btn ghost small" onclick="removerToken(${i})">Remover</button>
      </div>
    </div>
  `).join('');
}

window.removerToken = (idx) => {
  tokensAdicionados.splice(idx, 1);
  renderTokens();
  atualizarSelectAssets();
};

document.getElementById('btnAddToken').addEventListener('click', () => {
  document.getElementById('addTokenPanel').classList.remove('hidden');
});

document.getElementById('btnCancelAddToken').addEventListener('click', () => {
  document.getElementById('addTokenPanel').classList.add('hidden');
});

document.getElementById('btnConfirmAddToken').addEventListener('click', async () => {
  const addr = document.getElementById('tokenAddress').value.trim();
  if (!ethers.isAddress(addr)) {
    mostrarToast('❌ Endereço inválido', 'erro');
    return;
  }

  const rede = getRede();
  const provider = new ethers.JsonRpcProvider(rede.rpc);
  const contract = new ethers.Contract(addr, ERC20_ABI, provider);

  try {
    let symbol = document.getElementById('tokenSymbol').value.trim();
    let decimals = parseInt(document.getElementById('tokenDecimals').value) || 18;

    if (!symbol) symbol = await contract.symbol();
    try { decimals = await contract.decimals(); } catch {}

    tokensAdicionados.push({ address: addr, symbol, decimals, balance: '0' });
    document.getElementById('addTokenPanel').classList.add('hidden');
    document.getElementById('tokenAddress').value = '';
    document.getElementById('tokenSymbol').value = '';
    document.getElementById('tokenDecimals').value = '';
    atualizarSelectAssets();
    await atualizarSaldos();
    mostrarToast(`✅ Token ${symbol} adicionado`, 'sucesso');
  } catch (e) {
    mostrarToast('❌ Não foi possível ler o token', 'erro');
  }
});

function atualizarSelectAssets() {
  const sel = document.getElementById('sendAsset');
  sel.innerHTML = `<option value="native">Nativo (${getRede().symbol})</option>`;
  tokensAdicionados.forEach((t, i) => {
    sel.innerHTML += `<option value="\( {i}"> \){t.symbol}</option>`;
  });
}

// ===================== ENVIAR =====================
document.getElementById('btnEnviarAbrir').addEventListener('click', () => {
  document.getElementById('sendPanel').classList.remove('hidden');
  document.getElementById('txResult').classList.remove('show');
  atualizarSelectAssets();
});

document.getElementById('btnEnviar').addEventListener('click', async () => {
  const destino = document.getElementById('destino').value.trim();
  const valor = document.getElementById('valorEnvio').value;
  const gasGwei = document.getElementById('gasPrice').value;
  const asset = document.getElementById('sendAsset').value;
  const rede = getRede();

  if (!ethers.isAddress(destino)) {
    mostrarStatus('txResult', '❌ Endereço inválido', 'error');
    return;
  }
  if (!valor || parseFloat(valor) <= 0) {
    mostrarStatus('txResult', '❌ Valor inválido', 'error');
    return;
  }

  try {
    mostrarStatus('txResult', '🔄 Preparando transação...', 'success');

    let txResponse;

    if (carteiraLocal) {
      const provider = new ethers.JsonRpcProvider(rede.rpc);
      const wallet = carteiraLocal.connect(provider);

      if (asset === 'native') {
        const tx = {
          to: destino,
          value: ethers.parseEther(valor)
        };
        if (gasGwei) tx.gasPrice = ethers.parseUnits(gasGwei, 'gwei');
        txResponse = await wallet.sendTransaction(tx);
      } else {
        const token = tokensAdicionados[parseInt(asset)];
        const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        const amount = ethers.parseUnits(valor, token.decimals);
        txResponse = await contract.transfer(destino, amount);
      }
    } else if (signerExterno) {
      if (asset === 'native') {
        const tx = {
          to: destino,
          value: ethers.parseEther(valor)
        };
        if (gasGwei) tx.gasPrice = ethers.parseUnits(gasGwei, 'gwei');
        txResponse = await signerExterno.sendTransaction(tx);
      } else {
        const token = tokensAdicionados[parseInt(asset)];
        const contract = new ethers.Contract(token.address, ERC20_ABI, signerExterno);
        const amount = ethers.parseUnits(valor, token.decimals);
        txResponse = await contract.transfer(destino, amount);
      }
    } else {
      throw new Error('Nenhuma carteira ativa');
    }

    mostrarStatus('txResult', `✅ Enviada!\nHash: ${txResponse.hash}\n🔗 \( {rede.explorer} \){txResponse.hash}`, 'success');
    
    historicoTransacoes.unshift({
      hash: txResponse.hash,
      valor,
      simbolo: asset === 'native' ? rede.symbol : tokensAdicionados[parseInt(asset)].symbol,
      tempo: new Date().toLocaleTimeString('pt-BR')
    });
    renderHistorico();

    await txResponse.wait();
    mostrarToast('✅ Transação confirmada!', 'sucesso');
    atualizarSaldos();
  } catch (e) {
    mostrarStatus('txResult', `❌ ${e.reason || e.message}`, 'error');
  }
});

function renderHistorico() {
  const el = document.getElementById('txHistoryLocal');
  const lista = document.getElementById('txListLocal');
  if (historicoTransacoes.length === 0) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  lista.innerHTML = historicoTransacoes.slice(0, 8).map(t => `
    <div class="tx-item">
      <div>📤 ${t.valor} ${t.simbolo}</div>
      <div class="tx-hash">${t.hash.slice(0, 20)}...</div>
      <div class="tx-time">${t.tempo}</div>
    </div>
  `).join('');
}

// ===================== CARTEIRAS EXTERNAS =====================
async function conectarExterna(nome) {
  if (!window.ethereum) {
    mostrarToast(`⚠️ Instale a extensão ${nome}`, 'aviso');
    return;
  }

  const rede = getRede();
  try {
    // Tenta trocar de rede
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: rede.chainIdHex }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: rede.chainIdHex,
            chainName: rede.name,
            nativeCurrency: { name: rede.symbol, symbol: rede.symbol, decimals: 18 },
            rpcUrls: [rede.rpc],
            blockExplorerUrls: [rede.explorer.replace('/tx/', '')]
          }]
        });
      }
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    providerExterno = new ethers.BrowserProvider(window.ethereum);
    signerExterno = await providerExterno.getSigner();
    const addr = accounts[0];

    document.getElementById('externalCard').classList.remove('hidden');
    document.getElementById('externalAddress').textContent = addr;
    document.getElementById('walletTypeLabel').textContent = nome.toUpperCase();
    document.getElementById('walletNameLabel').textContent = nome;

    exibirCarteira(addr, false);
    mostrarToast(`✅ ${nome} conectada!`, 'sucesso');
  } catch (e) {
    mostrarToast(`❌ Falha ao conectar: ${e.message}`, 'erro');
  }
}

document.getElementById('btnBinanceWeb3').addEventListener('click', () => conectarExterna('Binance Web3 Wallet'));
document.getElementById('btnMetaMask').addEventListener('click', () => conectarExterna('MetaMask'));
document.getElementById('btnTrust').addEventListener('click', () => conectarExterna('Trust Wallet'));

document.getElementById('btnDesconectar').addEventListener('click', () => {
  signerExterno = null;
  providerExterno = null;
  document.getElementById('externalCard').classList.add('hidden');
  document.getElementById('resultado').classList.add('hidden');
  document.getElementById('connectPanel').classList.remove('hidden');
  mostrarToast('🔌 Desconectado', 'sucesso');
});

// ===================== REDE =====================
document.getElementById('networkSelect').addEventListener('change', async () => {
  atualizarUIRede();
  if (enderecoAtivo) {
    await atualizarSaldos();
    await atualizarGrafico();
    mostrarToast(`🔄 Rede: ${getRede().name}`, 'info');
  }
});

// ===================== INICIALIZAÇÃO =====================
atualizarUIRede();
