const { ethers } = window.ethers;

// === ESTADO GLOBAL ===
let carteiraLocal = null;
let provedorExterno = null;
let signerExterno = null;

// === REDES ===
const REDES = {
  1: { name: 'Ethereum', symbol: 'ETH', rpc: 'https://eth.llamarpc.com' },
  137: { name: 'Polygon', symbol: 'MATIC', rpc: 'https://polygon-rpc.com' },
  56: { name: 'BSC', symbol: 'BNB', rpc: 'https://bsc-dataseed.binance.org' },
  42161: { name: 'Arbitrum', symbol: 'ETH', rpc: 'https://arb1.arbitrum.io/rpc' },
  10: { name: 'Optimism', symbol: 'ETH', rpc: 'https://mainnet.optimism.io' },
  8453: { name: 'Base', symbol: 'ETH', rpc: 'https://mainnet.base.org' },
  43114: { name: 'Avalanche', symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  250: { name: 'Fantom', symbol: 'FTM', rpc: 'https://rpc.ftm.tools' }
};

// === UTILITÁRIOS ===
function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.remove('hidden');
  toast.style.borderColor = tipo === 'sucesso' ? '#10b981' : tipo === 'erro' ? '#ef4444' : '#d4b106';
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function mostrarStatus(elementoId, mensagem, tipo) {
  const el = document.getElementById(elementoId);
  el.textContent = mensagem;
  el.className = `status show ${tipo}`;
  if (tipo !== 'success') setTimeout(() => el.classList.remove('show'), 5000);
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
}

function gerarQRCode(texto) {
  const canvas = document.getElementById('receiveQr');
  if (typeof QRCode !== 'undefined') {
    QRCode.toCanvas(canvas, texto, { width: 144, margin: 2, color: { dark: '#000', light: '#fff' } }, function (erro) {
      if (erro) console.error(erro);
    });
  }
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
      botao.textContent = '⊗';
    } else {
      codigo.classList.add('masked');
      codigo.textContent = '••••••••••••••••••••••••••••••••';
      botao.textContent = '◉';
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
      mostrarToast('⚠️ Primeiro revele o valor clicando no olho ◉', 'aviso');
    }
  });
});

// === MOSTRAR/OCULTAR CHAVE PRIVADA NO INPUT DE RECUPERAÇÃO ===
const mostrarChave = document.getElementById('mostrarChave');
const inputChavePrivada = document.getElementById('inputChavePrivada');
mostrarChave?.addEventListener('change', () => {
  inputChavePrivada.type = mostrarChave.checked ? 'text' : 'password';
});

// === SELEÇÃO DE REDE ===
document.getElementById('networkSelect').addEventListener('change', atualizarNomeRede);

// === CRIAR CARTEIRA LOCAL ===
document.getElementById('btnCriar').addEventListener('click', () => {
  carteiraLocal = ethers.Wallet.createRandom();
  exibirCarteiraLocal();
  mostrarToast('✅ Carteira criada com sucesso! Anote sua frase em local seguro!', 'sucesso');
});

function exibirCarteiraLocal() {
  const rede = getRedeAtual();
  document.getElementById('endereco').textContent = carteiraLocal.address;
  document.getElementById('frase').textContent = '••••••••••••••••••••••••••••••••';
  document.getElementById('chave').textContent = '••••••••••••••••••••••••••••••••';
  document.getElementById('resultado').classList.remove('hidden');
  document.getElementById('sendPanel').classList.add('hidden');
  document.getElementById('saldoArea').classList.add('hidden');
  gerarQRCode(carteiraLocal.address);
  atualizarNomeRede();
}

// === RECUPERAR CARTEIRA ===
document.getElementById('btnRecuperar').addEventListener('click', () => {
  document.getElementById('areaRecuperar').classList.remove('hidden');
  document.getElementById('inputFrase').value = '';
  document.getElementById('inputChavePrivada').value = '';
  document.getElementById('resultado').classList.add('hidden');
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
  
  try {
    mostrarToast('🔄 Consultando saldo...');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const saldo = await provedor.getBalance(carteiraLocal.address);
    const saldoFormatado = ethers.formatEther(saldo);
    
    saldoEl.textContent = parseFloat(saldoFormatado).toFixed(5);
    simboloEl.textContent = rede.symbol;
    document.getElementById('saldoArea').classList.remove('hidden');
    mostrarToast(`✅ Saldo atualizado: ${parseFloat(saldoFormatado).toFixed(4)} ${rede.symbol}`, 'sucesso');
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
    mostrarStatus('txResult', '🔄 Conectando à rede...', 'success');
    const provedor = new ethers.JsonRpcProvider(rede.rpc);
    const carteiraConectada = carteiraLocal.connect(provedor);
    
    const valorWei = ethers.parseEther(valor);
    
    mostrarStatus('txResult', '🔄 Enviando transação...', 'success');
    
    const tx = await carteiraConectada.sendTransaction({
      to: destino,
      value: valorWei
    });
    
    mostrarStatus('txResult', `✅ Transação enviada! Hash: ${tx.hash.slice(0, 18)}...`, 'success');
    console.log('Transação:', tx);
    
    // Aguardar confirmação
    const recebimento = await tx.wait();
    if (recebimento) {
      mostrarToast('✅ Transação confirmada!', 'sucesso');
    }
  } catch (erro) {
    console.error(erro);
    mostrarStatus('txResult', `❌ Erro: ${erro.message || 'Falha na transação'}`, 'error');
  }
});

// === CONEXÃO COM METAMASK ===
document.getElementById('btnMetaMask').addEventListener('click', async () => {
  if (typeof window.ethereum === 'undefined') {
    mostrarToast('⚠️ MetaMask não encontrada! Instale a extensão em metamask.io', 'aviso');
    return;
  }

  try {
    mostrarToast('🔄 Conectando MetaMask...');
    const provedor = new ethers.BrowserProvider(window.ethereum);
    await provedor.send("eth_requestAccounts", []);
    signerExterno = await provedor.getSigner();
    provedorExterno = provedor;
    
    const endereco = await signerExterno.getAddress();
    const saldo = await provedor.getBalance(endereco);
    const rede = await provedor.getNetwork();
    const redeInfo = REDES[Number(rede.chainId)] || { name: 'Rede Desconhecida', symbol: 'ETH' };
    
    document.getElementById('metaMaskAddress').textContent = endereco;
    document.getElementById('metaMaskBalance').textContent = ethers.formatEther(saldo).slice(0, 8);
    document.getElementById('metaMaskSymbol').textContent = redeInfo.symbol;
    document.getElementById('walletTypeLabel').textContent = 'METAMASK';
    document.getElementById('metaMaskCard').classList.remove('hidden');
    
    mostrarToast(`✅ Conectado: ${endereco.slice(0, 8)}...`, 'sucesso');
  } catch (erro) {
    console.error(erro);
    mostrarToast('❌ Conexão cancelada ou indisponível', 'erro');
  }
});

// === DESCONECTAR CARTEIRA EXTERNA ===
document.getElementById('btnDesconectar').addEventListener('click', () => {
  provedorExterno = null;
  signerExterno = null;
  document.getElementById('metaMaskCard').classList.add('hidden');
  mostrarToast('Desconectado ✅', 'sucesso');
});

// === BOTÕES DE TRUST WALLET E SAFE ===
document.getElementById('btnTrust').addEventListener('click', () => {
  mostrarToast('💡 Abra este site no navegador da Trust Wallet para se conectar', 'info');
});

document.getElementById('btnSafe').addEventListener('click', () => {
  mostrarToast('💡 Use a extensão Safe ou WalletConnect para conectar sua Safe', 'info');
});

// === INICIALIZAÇÃO ===
atualizarNomeRede();
