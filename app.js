const { ethers } = window.ethers;

// === ESTADO GLOBAL ===
let carteiraLocal = null;
let provedorExterno = null;
let signerExterno = null;
let priceChart = null;
let localPriceChart = null;
let historicoTransacoes = [];
let precoAtual = { valor: 0, variacao: 0 };

// === REDES SUPORTADAS ===
const REDES = {
  56: { 
    name: 'BNB Chain', 
    symbol: 'BNB', 
    decimals: 18,
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com/tx/',
    coingeckoId: 'binancecoin'
  },
  97: { 
    name: 'BSC Testnet', 
    symbol: 'tBNB', 
    decimals: 18,
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com/tx/',
    coingeckoId: 'binancecoin'
  },
  1: { 
    name: 'Ethereum', 
    symbol: 'ETH', 
    decimals: 18,
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io/tx/',
    coingeckoId: 'ethereum'
  },
  137: { 
    name: 'Polygon', 
    symbol: 'MATIC', 
    decimals: 18,
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com/tx/',
    coingeckoId: 'matic-network'
  },
  42161: { 
    name: 'Arbitrum', 
    symbol: 'ETH', 
    decimals: 18,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io/tx/',
    coingeckoId: 'ethereum'
  },
  8453: { 
    name: 'Base', 
    symbol: 'ETH', 
    decimals: 18,
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org/tx/',
    coingeckoId: 'ethereum'
  }
};

// === UTILITÁRIOS ===
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
  navigator.clipboard.writeText(texto).then(() => {
    mostrarToast('✅ Copiado!', 'sucesso');
  });
}

function getRedeAtual() {
  const select = document.getElementById('networkSelect');
  const chainId = parseInt(select.value);
  return { chainId, ...REDES[chainId] };
}

function atualizarNomeRede() {
  const rede = getRedeAtual();
  document.getElementById('currentNetworkName').textContent = rede.name;
  document.getElementById('sendSymbol').textContent = rede.symbol;
}

// === QR CODE ===
function gerarQRCode(texto) {
  const canvas = document.getElementById('receiveQr');
  if (!canvas || typeof QRCode === 'undefined') return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  setTimeout(() => {
    try {
      QRCode.toCanvas(canvas, texto, { 
        width: 144, 
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      }, function (erro) {
        if (erro) console.error('QR Code erro:', erro);
      });
    } catch (e) {
      console.error('QR Code:', e);
    }
  }, 50);
}

// === BUSCAR PREÇO DA MOEDA ===
async function buscarPreco(rede) {
  try {
    const resposta = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${rede.coingeckoId}&vs_currencies=usd&include_24hr_change=true`);
    const dados = await resposta.json();
    const chave = rede.coingeckoId;
    return {
      valor: dados[chave]?.usd || 0,
      variacao: dados[chave]?.usd_24h_change || 0
    };
  } catch (e) {
    console.error('Erro ao buscar preço:', e);
    return { valor: 0, variacao: 0 };
  }
}

// === GERAR DADOS DO GRÁFICO ===
function gerarDadosGrafico(baseValor, variacaoPct, pontos = 24) {
  const dados = [];
  let valor = baseValor * (1 - variacaoPct / 200);
  const passo = (baseValor * (1 + variacaoPct / 200) - valor) / pontos;
  
  for (let i = 0; i < pontos; i++) {
    valor += passo + (Math.random() - 0.5) * passo * 0.5;
    dados.push(parseFloat(valor.toFixed(4)));
  }
  dados[dados.length - 1] = baseValor;
  return dados;
}

// === INICIALIZAR GRÁFICO ===
async function inicializarGrafico(canvasId, rede) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  
  precoAtual = await buscarPreco(rede);
  const dadosPreco = gerarDadosGrafico(precoAtual.valor, precoAtual.variacao);
  
  const ctx = canvas.getContext('2d');
  const ehPositivo = precoAtual.variacao >= 0;
  const cor = ehPositivo ? 'rgba(14, 181, 130, 1)' : 'rgba(246, 70, 93, 1)';
  const corFundo = ehPositivo ? 'rgba(14, 181, 130, 0.1)' : 'rgba(246, 70, 93, 0.1)';
  
  const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
  
  if (canvasId === 'priceChart' && priceChart) priceChart.destroy();
  if (canvasId === 'localPriceChart' && localPriceChart) localPriceChart.destroy();
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Preço em USD`,
        data: dadosPreco,
        borderColor: cor,
        backgroundColor: corFundo,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#1a1a1a',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#333',
          borderWidth: 1
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#666', font: { size: 10 } }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
  
  if (canvasId === 'priceChart') priceChart = chart;
  else localPriceChart = chart;
  
  // Atualizar valores na tela
  const precoEl = document.getElementById('currentPrice');
  const variacaoEl = document.getElementById('priceChange');
  
  if (precoEl) precoEl.textContent = `$${precoAtual.valor.toFixed(4)}`;
  if (variacaoEl) {
    variacaoEl.textContent = `${ehPositivo ? '+' : ''}${precoAtual.variacao.toFixed(2)}%`;
    variacaoEl.className = `price-change ${ehPositivo ? 'positive' : 'negative'}`;
  }
  
  return precoAtual;
}

// === MOSTRAR/OCULTAR VALORES SENSÍVEIS ===
document.querySelectorAll('.icon-button.reveal').forEach(botao => {
  botao.addEventListener('click', () => {
    const alvoId = botao.getAttribute('data-alvo');
    const codigo = document.getElementById(alvoId);
    if (codigo.classList.contains('masked')) {
      codigo.classList.remove('masked');
      if (alvoId === 'frase' && carteiraLocal?.mnemonic?.phrase) {
        codigo.textContent = carteiraLocal.mnemonic.phrase;
      } else if (alvoId === 'chave' && carteiraLocal?.privateKey) {
        codigo.textContent = carteiraLocal.privateKey;
      }
      botao.textContent = '🙈';
    } else {
      codigo.classList.add('masked');
      codigo.textContent = '••••••••••••••••••••••••••••••••';
      botao.textContent = '👁';
    }
  });
});

// === BOTÕES DE COPIAR ===
document.querySelectorAll('.icon-button.copiar').forEach(botao => {
  botao.addEventListener('click', () => {
    const alvoId = botao.getAttribute('data-alvo');
    const texto = document.getElementById(alvoId).textContent;
    if (texto && !texto.includes('•')) {
      copiarParaAreaDeTransferencia(texto);
    } else {
      mostrarToast('⚠️ Primeiro revele o valor clicando no olho 👁', 'aviso');
    }
  });
});

// === MOSTRAR/OCULTAR CHAVE PRIVADA NO INPUT ===
const mostrarChave = document.getElementById('mostrarChave');
const inputChavePrivada = document.getElementById('inputChavePrivada');
mostrarChave?.addEventListener('change', () => {
  inputChavePrivada.type = mostrarChave.checked ? 'text' : 'password';
});

// === SELEÇÃO DE REDE ===
document.getElementById('networkSelect').addEventListener('change', async () => {
  atualizarNomeRede();
  const rede = getRedeAtual();
  if (carteiraLocal || signerExterno) {
    mostrarToast(`🔄 Rede alterada para ${rede.name}`, 'info');
    await inicializarGrafico('localPriceChart', rede);
  }
});

// === CRIAR CARTEIRA LOCAL ===
document.getElementById('btnCriar').addEventListener('click', () => {
  carteiraLocal = ethers.Wallet.createRandom();
  exibirCarteiraLocal();
  mostrarToast('✅ Carteira criada com sucesso! Anote sua frase em local SEGURO!', 'sucesso');
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

// === RECUPERAR CARTEIRA ===
document.getElementById('btnRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.remove('hidden');
  document.getElementById('inputFrase').value = '';
  document.getElementById('inputChavePrivada').value = '';
});

document.getElementById('btnCancelarRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.add('hidden');
  document.getElementById('inputFrase').value = '';
  document.getElementById('inputChavePrivada').value = '';
});

document.getElementById('btnConfirmarRecuperar').addEventListener('click', () => {
  const frase = document.getElementById('inputFrase').value.trim();
  const chavePrivada = document.getElementById('inputChavePrivada').value.trim();

  try {
    if (frase) {
      const palavras = frase.split(/\s+/).filter(p => p);
      if (palavras.length !== 12 && palavras.length !== 24) {
        throw new Error(`Esperado 12 ou 24 palavras, você digitou ${palavras.length}`);
      }
      carteiraLocal = ethers.Wallet.fromPhrase(frase);
      mostrarToast('✅ Carteira recuperada pela frase!', 'sucesso');
    } else if (chavePrivada) {
      let chave = chavePrivada.startsWith('0x') ? chavePrivada : '0x' + chavePrivada;
      carteiraLocal = new ethers.Wallet(chave);
      mostrarToast('✅ Carteira recuperada pela chave privada!', 'sucesso');
    } else {
      mostrarToast('⚠️ Digite a frase OU a chave privada!', 'aviso');
      return;
    }
    document.getElementById('areaRecuperar').classList.add('hidden');
    exibirCarteiraLocal();
  } catch (erro) {
    console.error(erro);
    mostrarToast(`❌ Erro: ${erro.message}`, 'erro');
  }
});

// === FECHAR CARTEIRA LOCAL ===
document.getElementById('btnNova').addEventListener('click', () => {
  carteiraLocal = null;
  historicoTransacoes = [];
  document.getElementById('resultado').classList.add('hidden');
  document.getElementById('sendPanel').classList.add('hidden');
  document.getElementById('saldoArea').classList.add('hidden');
  document.getElementById('status').classList.remove('show');
  mostrarToast('Carteira fechada ✅', 'sucesso');
});

// === CONSULTAR SALDO ===
document.getElementById('btnSaldo').addEventListener('click', async () => {
  if (!carteiraLocal) {
    mostrarToast('⚠️ Crie ou recupere uma carteira primeiro!', 'aviso');
    return;
  }

  const rede = getRedeAtual();
  const saldoEl = document.getElementById('saldoValor');
  const simboloEl = document.getElementById('saldoSymbol');
  const saldoUsdEl = document.getElementById('saldoUSD');
  
  try {
    mostrarToast('🔄 Consultando saldo...');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const saldo = await provedor.getBalance(carteiraLocal.address);
    const saldoFormatado = ethers.formatEther(saldo);
    
    saldoEl.textContent = parseFloat(saldoFormatado).toFixed(5);
    simboloEl.textContent = rede.symbol;
    
    // Calcular valor em USD
    const preco = await buscarPreco(rede);
    const valorUsd = parseFloat(saldoFormatado) * preco.valor;
    saldoUsdEl.textContent = valorUsd.toFixed(2);
    
    document.getElementById('saldoArea').classList.remove('hidden');
    mostrarToast(`✅ Saldo: ${parseFloat(saldoFormatado).toFixed(4)} ${rede.symbol}`, 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarToast('❌ Erro ao consultar saldo. Verifique a rede.', 'erro');
  }
});

// === ABRIR PAINEL DE ENVIAR ===
document.getElementById('btnEnviarAbrir')?.addEventListener('click', () => {
  if (!carteiraLocal) {
    mostrarToast('⚠️ Crie ou recupere uma carteira primeiro!', 'aviso');
    return;
  }
  document.getElementById('sendPanel').classList.remove('hidden');
  document.getElementById('txResult').classList.remove('show');
  document.getElementById('destino').value = '';
  document.getElementById('valorEnvio').value = '';
});

// === ENVIAR TRANSAÇÃO ===
document.getElementById('btnEnviar').addEventListener('click', async () => {
  if (!carteiraLocal) return;

  const destino = document.getElementById('destino').value.trim();
  const valor = document.getElementById('valorEnvio').value;
  const gasPrice = document.getElementById('gasPrice').value || '5';
  const rede = getRedeAtual();
  const resultadoEl = document.getElementById('txResult');

  // Validações
  if (!ethers.isAddress(destino)) {
    mostrarStatus('txResult', '❌ Endereço de destino inválido!', 'error');
    return;
  }
  if (!valor || parseFloat(valor) <= 0) {
    mostrarStatus('txResult', '❌ Digite um valor válido!', 'error');
    return;
  }

  try {
    mostrarStatus('txResult', '🔄 Conectando à rede ' + rede.name + '...', 'success');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const carteiraConectada = carteiraLocal.connect(provedor);
    
    const valorWei = ethers.parseEther(valor);
    const gasPriceWei = ethers.parseUnits(gasPrice, 'gwei');
    
    mostrarStatus('txResult', '🔄 Enviando transação...', 'success');
    
    const tx = await carteiraConectada.sendTransaction({
      to: destino,
      value: valorWei,
      gasPrice: gasPriceWei
    });
    
    const linkExplorer = `${rede.explorer}${tx.hash}`;
    
    mostrarStatus('txResult', `✅ Transação enviada! Hash: ${tx.hash.slice(0, 18)}...\n🔗 Ver no BscScan: ${linkExplorer}`, 'success');
    
    // Adicionar ao histórico
    adicionarTransacaoHistorico({
      hash: tx.hash,
      destino: destino,
      valor: valor,
      simbolo: rede.symbol,
      tempo: new Date().toLocaleTimeString('pt-BR')
    });
    
    // Aguardar confirmação
    const recebimento = await tx.wait();
    if (recebimento) {
      mostrarToast('✅ Transação CONFIRMADA!', 'sucesso');
    }
  } catch (erro) {
    console.error(erro);
    mostrarStatus('txResult', `❌ Erro: ${erro.message || 'Falha na transação'}`, 'error');
  }
});

// === ADICIONAR TRANSAÇÃO AO HISTÓRICO ===
function adicionarTransacaoHistorico(tx) {
  historicoTransacoes.unshift(tx);
  const historicoEl = document.getElementById('txHistoryLocal');
  const listaEl = document.getElementById('txListLocal');
  
  historicoEl.classList.remove('hidden');
  listaEl.innerHTML = historicoTransacoes.slice(0, 5).map(t => `
    <div class="tx-item">
      <div>📤 Enviado ${t.valor} ${t.simbolo}</div>
      <div class="tx-hash">${t.hash.slice(0, 18)}...</div>
      <div class="tx-time">${t.tempo}</div>
    </div>
  `).join('');
}

// === 🟡 CONECTAR BINANCE WEB3 WALLET ===
document.getElementById('btnBinanceWeb3').addEventListener('click', async () => {
  if (typeof window.binanceWallet === 'undefined' && typeof window.ethereum === 'undefined') {
    mostrarToast('⚠️ Binance Web3 Wallet não encontrada! Instale a extensão oficial da Binance
