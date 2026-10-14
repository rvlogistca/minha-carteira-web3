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

  function $(id) { return document.getElementById(id); }

  function mostrarToast(mensagem, tipo = 'info') {
    const toast = $('toast');
    if (!toast) return;
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto)
        .then(() => mostrarToast('✅ Copiado!', 'sucesso'))
        .catch(() => mostrarToast('❌ Falha ao copiar', 'erro'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      mostrarToast('✅ Copiado!', 'sucesso');
    }
  }

  function getRedeAtual() {
    const select = $('networkSelect');
    const chainId = parseInt(select?.value || '56', 10);
    return { chainId, ...(REDES[chainId] || REDES[56]) };
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
    for (let i = 0; i < pontos; i++) {
      v += passo + (Math.random() - 0.5) * passo * 0.4;
      dados.push(parseFloat(Math.max(0, v).toFixed(4)));
    }
    dados[dados.length - 1] = baseValor;
    return dados;
  }

  async function inicializarGrafico(canvasId, rede) {
    const canvas = $(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    precoAtual = await buscarPreco(rede);
    const dados = gerarDadosGrafico(precoAtual.valor || 1, precoAtual.variacao);
    const ctx = canvas.getContext('2d');
    const ehPositivo = precoAtual.variacao >= 0;
    const cor = ehPositivo ? 'rgba(14,181,130,1)' : 'rgba(246,70,93,1)';
    const corFundo = ehPositivo ? 'rgba(14,181,130,0.12)' : 'rgba(246,70,93,0.12)';
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
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#666', font: { size: 10 } }
          }
        }
      }
    });

    if (canvasId === 'priceChart') priceChart = chart;
    else localPriceChart = chart;

    const precoEl = $('currentPrice');
    const variacaoEl = $('priceChange');
    if (precoEl) precoEl.textContent = `$${(precoAtual.valor || 0).toFixed(4)}`;
    if (variacaoEl) {
      variacaoEl.textContent = `${ehPositivo ? '+' : ''}${(precoAtual.variacao || 0).toFixed(2)}%`;
      variacaoEl.className = `price-change ${ehPositivo ? 'positive' : 'negative'}`;
    }
  }

  // Reveal / Copy
  document.querySelectorAll('.icon-button.reveal').forEach(botao => {
    botao.addEventListener('click', () => {
      const alvoId = botao.getAttribute('data-alvo');
      const codigo = $(alvoId);
      if (!codigo) return;
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

  document.querySelectorAll('.icon-button.copiar').forEach(botao => {
    botao.addEventListener('click', () => {
      const alvoId = botao.getAttribute('data-alvo');
      const el = $(alvoId);
      if (!el) return;
      const texto = el.textContent;
      if (texto && !texto.includes('•') && texto !== '—') {
        copiarParaAreaDeTransferencia(texto);
      } else {
        mostrarToast('⚠️ Revele o valor primeiro', 'aviso');
      }
    });
  });

  $('mostrarChave')?.addEventListener('change', function () {
    const input = $('inputChavePrivada');
    if (input) input.type = this.checked ? 'text' : 'password';
  });

  // Rede
  $('networkSelect')?.addEventListener('change', async () => {
    atualizarNomeRede();
    const rede = getRedeAtual();
    mostrarToast(`🔄 Rede: ${rede.name}`, 'info');
    if (carteiraLocal) {
      await inicializarGrafico('localPriceChart', rede);
      $('saldoArea')?.classList.add('hidden');
    }
    if (externalSigner) {
      await inicializarGrafico('priceChart', rede);
      await atualizarSaldoExterno();
    }
  });

  // Carteira Local
  function exibirCarteiraLocal() {
    const rede = getRedeAtual();
    $('endereco').textContent = carteiraLocal.address;
    $('frase').textContent = '••••••••••••••••••••••••••••••••';
    $('frase').classList.add('masked');
    $('chave').textContent = '••••••••••••••••••••••••••••••••';
    $('chave').classList.add('masked');
    document.querySelectorAll('.reveal').forEach(b => { b.textContent = '👁'; });
    $('resultado').classList.remove('hidden');
    $('sendPanel').classList.add('hidden');
    $('saldoArea').classList.add('hidden');
    $('txHistoryLocal')?.classList.add('hidden');
    gerarQRCode(carteiraLocal.address);
    atualizarNomeRede();
    inicializarGrafico('localPriceChart', rede);
  }

  $('btnCriar')?.addEventListener('click', () => {
    try {
      if (!ethers?.Wallet) {
        mostrarToast('❌ ethers.js não carregou. Recarregue a página.', 'erro');
        return;
      }
      if (carteiraLocal && !confirm('Criar nova carteira e fechar a atual?')) return;
      carteiraLocal = ethers.Wallet.createRandom();
      exibirCarteiraLocal();
      mostrarToast('✅ Carteira criada! Anote sua frase!', 'sucesso');
    } catch (e) {
      mostrarToast('❌ Erro ao criar carteira: ' + e.message, 'erro');
    }
  });

  $('btnRecuperar')?.addEventListener('click', () => {
    $('areaRecuperar')?.classList.remove('hidden');
    if ($('inputFrase')) $('inputFrase').value = '';
    if ($('inputChavePrivada')) $('inputChavePrivada').value = '';
    $('inputFrase')?.focus();
  });

  $('btnCancelarRecuperar')?.addEventListener('click', () => {
    $('areaRecuperar')?.classList.add('hidden');
  });

  $('btnConfirmarRecuperar')?.addEventListener('click', () => {
    const frase = ($('inputFrase')?.value || '').trim().replace(/\s+/g, ' ');
    const chavePrivada = ($('inputChavePrivada')?.value || '').trim();
    try {
      if (frase) {
        const palavras = frase.split(' ').filter(Boolean);
        if (palavras.length !== 12 && palavras.length !== 24) {
          throw new Error('A frase precisa ter 12 ou 24 palavras');
        }
        carteiraLocal = ethers.Wallet.fromPhrase(frase);
        mostrarToast('✅ Carteira recuperada pela frase!', 'sucesso');
      } else if (chavePrivada) {
        let chave = chavePrivada.startsWith('0x') ? chavePrivada : '0x' + chavePrivada;
        carteiraLocal = new ethers.Wallet(chave);
        mostrarToast('✅ Carteira recuperada pela chave!', 'sucesso');
      } else {
        mostrarToast('⚠️ Digite a frase OU a chave privada', 'aviso');
        return;
      }
      $('areaRecuperar')?.classList.add('hidden');
      exibirCarteiraLocal();
    } catch (erro) {
      mostrarToast(`❌ Erro: ${erro.message}`, 'erro');
    }
  });

  $('btnNova')?.addEventListener('click', () => {
    if (!confirm('Fechar esta carteira da tela?')) return;
    carteiraLocal = null;
    historicoTransacoes = [];
    $('resultado')?.classList.add('hidden');
    $('sendPanel')?.classList.add('hidden');
    $('saldoArea')?.classList.add('hidden');
    $('txHistoryLocal')?.classList.add('hidden');
    mostrarToast('🔒 Carteira fechada', 'sucesso');
  });

  $('btnSaldo')?.addEventListener('click', async () => {
    if (!carteiraLocal) {
      mostrarToast('⚠️ Crie ou recupere uma carteira primeiro', 'aviso');
      return;
    }
    const rede = getRedeAtual();
    try {
      mostrarToast('🔄 Consultando saldo...');
      const provedor = new ethers.JsonRpcProvider(rede.rpc);
      const saldo = await provedor.getBalance(carteiraLocal.address);
      const saldoStr = ethers.formatEther(saldo);
      $('saldoValor').textContent = parseFloat(saldoStr).toFixed(5);
      $('saldoSymbol').textContent = rede.symbol;
      const preco = await buscarPreco(rede);
      $('saldoUSD').textContent = (parseFloat(saldoStr) * preco.valor).toFixed(2);
      $('saldoArea')?.classList.remove('hidden');
      mostrarToast(`✅ Saldo: ${parseFloat(saldoStr).toFixed(4)} ${rede.symbol}`, 'sucesso');
    } catch (e) {
      console.error(e);
      mostrarToast('❌ Erro ao consultar saldo. Tente novamente.', 'erro');
    }
  });

  $('btnEnviarAbrir')?.addEventListener('click', () => {
    if (!carteiraLocal && !externalSigner) {
      mostrarToast('⚠️ Conecte ou crie uma carteira primeiro', 'aviso');
      return;
    }
    $('sendPanel')?.classList.remove('hidden');
    $('txResult')?.classList.remove('show');
    if ($('destino')) $('destino').value = '';
    if ($('valorEnvio')) $('valorEnvio').value = '';
    atualizarNomeRede();
  });

  // Enviar
  $('btnEnviar')?.addEventListener('click', async () => {
    const destino = ($('destino')?.value || '').trim();
    const valor = $('valorEnvio')?.value;
    const gasPrice = $('gasPrice')?.value || '5';
    const rede = getRedeAtual();

    if (!ethers.isAddress(destino)) {
      mostrarStatus('txResult', '❌ Endereço inválido', 'error');
      return;
    }
    if (!valor || parseFloat(valor) <= 0) {
      mostrarStatus('txResult', '❌ Valor inválido', 'error');
      return;
    }

    // Carteira externa
    if (externalSigner) {
      try {
        mostrarStatus('txResult', '🔄 Aguardando confirmação na carteira...', 'success');
        const tx = await externalSigner.sendTransaction({
          to: destino,
          value: ethers.parseEther(valor)
        });
        mostrarStatus('txResult', `✅ Enviada!\nHash: ${tx.hash}\n🔗 ${rede.explorer}${tx.hash}`, 'success');
        adicionarTransacaoHistorico({
          hash: tx.hash, destino, valor, simbolo: rede.symbol,
          tempo: new Date().toLocaleTimeString('pt-BR')
        });
        await tx.wait();
        mostrarToast('✅ Transação confirmada!', 'sucesso');
        await atualizarSaldoExterno();
      } catch (erro) {
        const msg = erro.code === 4001 ? 'Rejeitado na carteira' : (erro.message || 'Erro ao enviar');
        mostrarStatus('txResult', `❌ ${msg}`, 'error');
      }
      return;
    }

    // Carteira local
    if (!carteiraLocal) {
      mostrarStatus('txResult', '❌ Nenhuma carteira disponível', 'error');
      return;
    }

    if (!confirm(`Enviar ${valor} ${rede.symbol} para:\n${destino}\n\nConfirma?`)) return;

    try {
      mostrarStatus('txResult', '🔄 Enviando...', 'success');
      const provedor = new ethers.JsonRpcProvider(rede.rpc);
      const carteiraConectada = carteiraLocal.connect(provedor);
      const tx = await carteiraConectada.sendTransaction({
        to: destino,
        value: ethers.parseEther(valor),
        gasPrice: ethers.parseUnits(gasPrice, 'gwei')
      });
      mostrarStatus('txResult', `✅ Enviada!\nHash: ${tx.hash}\n🔗 ${rede.explorer}${tx.hash}`, 'success');
      adicionarTransacaoHistorico({
        hash: tx.hash, destino, valor, simbolo: rede.symbol,
        tempo: new Date().toLocaleTimeString('pt-BR')
      });
      await tx.wait();
      mostrarToast('✅ Confirmada!', 'sucesso');
    } catch (erro) {
      mostrarStatus('txResult', `❌ ${erro.message || 'Erro ao enviar'}`, 'error');
    }
  });

  function adicionarTransacaoHistorico(tx) {
    historicoTransacoes.unshift(tx);
    const el = $('txHistoryLocal');
    const lista = $('txListLocal');
    if (!el || !lista) return;
    el.classList.remove('hidden');
    lista.innerHTML = historicoTransacoes.slice(0, 8).map(t => `
      <div class="tx-item">
        <div>📤 ${t.valor} ${t.simbolo}</div>
        <div class="tx-hash"><a href="${getRedeAtual().explorer}${t.hash}" target="_blank" rel="noopener" style="color:inherit">${t.hash.slice(0, 22)}...</a></div>
        <div class="tx-time">${t.tempo}</div>
      </div>
    `).join('');
  }

  async function atualizarSaldoExterno() {
    if (!externalAddress) return;
    const rede = getRedeAtual();
    try {
      const prov = new ethers.JsonRpcProvider(rede.rpc);
      const saldo = await prov.getBalance(externalAddress);
      $('externalBalance').textContent = parseFloat(ethers.formatEther(saldo)).toFixed(4);
      $('externalSymbol').textContent = rede.symbol;
    } catch {
      $('externalBalance').textContent = '—';
    }
  }

  async function conectarCarteiraExterna(tipo) {
    if (!window.ethereum) {
      mostrarToast(`⚠️ Instale a extensão ${tipo} primeiro!`, 'aviso');
      return;
    }

    const rede = getRedeAtual();
    const provider = window.ethereum;

    try {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + rede.chainId.toString(16) }]
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + rede.chainId.toString(16),
              chainName: rede.name,
              nativeCurrency: { name: rede.symbol, symbol: rede.symbol, decimals: 18 },
              rpcUrls: [rede.rpc],
              blockExplorerUrls: [rede.explorer.replace('/tx/', '')]
            }]
          });
        } else {
          throw switchErr;
        }
      }

      const contas = await provider.request({ method: 'eth_requestAccounts' });
      if (!contas || !contas.length) throw new Error('Nenhuma conta selecionada');

      externalProvider = new ethers.BrowserProvider(provider);
      externalSigner = await externalProvider.getSigner();
      externalAddress = contas[0];
      connectedWalletName = tipo;

      $('externalCard')?.classList.remove('hidden');
      $('chartSection')?.classList.remove('hidden');
      $('sendPanel')?.classList.remove('hidden');
      if ($('externalAddress')) $('externalAddress').textContent = externalAddress;
      if ($('walletTypeLabel')) $('walletTypeLabel').textContent = tipo.toUpperCase();
      if ($('walletNameLabel')) $('walletNameLabel').textContent = tipo;
      if ($('externalStatus')) $('externalStatus').textContent = `Conectada • ${rede.name}`;
      if ($('externalSymbol')) $('externalSymbol').textContent = rede.symbol;

      await atualizarSaldoExterno();
      await inicializarGrafico('priceChart', rede);
      mostrarToast(`✅ ${tipo} conectada!`, 'sucesso');
    } catch (e) {
      const msg = e.code === 4001 ? 'Conexão rejeitada' : (e.message || 'Falha na conexão');
      mostrarToast(`❌ ${msg}`, 'erro');
    }
  }

  $('btnBinanceWeb3')?.addEventListener('click', () => conectarCarteiraExterna('Binance Web3 Wallet'));
  $('btnMetaMask')?.addEventListener('click', () => conectarCarteiraExterna('MetaMask'));
  $('btnTrust')?.addEventListener('click', () => conectarCarteiraExterna('Trust Wallet'));

  $('btnDesconectar')?.addEventListener('click', () => {
    externalProvider = null;
    externalSigner = null;
    externalAddress = null;
    connectedWalletName = '';
    $('externalCard')?.classList.add('hidden');
    $('chartSection')?.classList.add('hidden');
    if (!carteiraLocal) $('sendPanel')?.classList.add('hidden');
    mostrarToast('🔌 Desconectado', 'sucesso');
  });

  if (window.ethereum?.on) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (!accounts || !accounts.length) {
        externalProvider = null;
        externalSigner = null;
        externalAddress = null;
        $('externalCard')?.classList.add('hidden');
        $('chartSection')?.classList.add('hidden');
      } else if (connectedWalletName) {
        conectarCarteiraExterna(connectedWalletName);
      }
    });
    window.ethereum.on('chainChanged', () => {
      if (connectedWalletName) {
        setTimeout(() => conectarCarteiraExterna(connectedWalletName), 400);
      }
    });
  }

  // Init
  atualizarNomeRede();
  console.log('Nexus Wallet carregado');
})();
