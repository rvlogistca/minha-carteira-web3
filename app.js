(() => {
  'use strict';

  const ethersLib = window.ethers;
  const $ = id => document.getElementById(id);

  const NETWORKS = {
    1:     { name: 'Ethereum',  symbol: 'ETH',  rpc: 'https://ethereum-rpc.publicnode.com' },
    137:   { name: 'Polygon',   symbol: 'MATIC',rpc: 'https://polygon-rpc.com' },
    56:    { name: 'BSC',       symbol: 'BNB',  rpc: 'https://bsc-dataseed.binance.org' },
    42161: { name: 'Arbitrum',  symbol: 'ETH',  rpc: 'https://arb1.arbitrum.io/rpc' },
    10:    { name: 'Optimism',  symbol: 'ETH',  rpc: 'https://mainnet.optimism.io' },
    8453:  { name: 'Base',      symbol: 'ETH',  rpc: 'https://mainnet.base.org' },
    43114: { name: 'Avalanche', symbol: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
    250:   { name: 'Fantom',    symbol: 'FTM',  rpc: 'https://rpc.ftm.tools' }
  };

  let carteiraAtual = null;
  let externalProvider = null;
  let externalSigner = null;
  let externalAddress = null;
  let connectedWalletName = '';
  let currentChainId = 1;
  let toastTimer = null;

  // ====== Helpers ======
  function setStatus(msg = '', kind = '') {
    const el = $('status');
    if (el) {
      el.textContent = msg;
      el.className = `status${kind ? ' ' + kind : ''}`;
    }
  }

  function notify(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function getSelectedNetwork() {
    return NETWORKS[currentChainId] || NETWORKS[1];
  }

  function updateNetworkUI() {
    const net = getSelectedNetwork();
    const nameEl = $('currentNetworkName');
    if (nameEl) nameEl.textContent = net.name;
    const sym1 = $('metaMaskSymbol');
    const sym2 = $('saldoSymbol');
    if (sym1) sym1.textContent = net.symbol;
    if (sym2) sym2.textContent = net.symbol;
  }

  // ====== Carteira Local ======
  function hideSecrets() {
    ['frase', 'chave'].forEach(id => {
      const el = $(id);
      if (el) {
        el.textContent = '••••••••••••••••••••••••••••••••';
        el.classList.add('masked');
      }
    });
    document.querySelectorAll('.reveal').forEach(b => {
      b.textContent = '◉';
      b.setAttribute('aria-pressed', 'false');
    });
  }

  function clearWalletView() {
    carteiraAtual = null;
    $('resultado')?.classList.add('hidden');
    $('saldoArea')?.classList.add('hidden');
    $('areaRecuperar')?.classList.add('hidden');
    if ($('inputFrase')) $('inputFrase').value = '';
    if ($('endereco')) $('endereco').textContent = '—';
    if ($('frase')) $('frase').textContent = '—';
    if ($('chave')) $('chave').textContent = '—';
    hideSecrets();
    setStatus('');
  }

  function showWallet(wallet) {
    carteiraAtual = wallet;
    $('endereco').textContent = wallet.address;
    $('frase').dataset.secret = wallet.mnemonic?.phrase || '';
    $('chave').dataset.secret = wallet.privateKey;
    hideSecrets();
    $('resultado').classList.remove('hidden');
    $('areaRecuperar').classList.add('hidden');
    $('saldoArea').classList.add('hidden');
    if ($('inputFrase')) $('inputFrase').value = '';
    setStatus('Carteira carregada localmente. Proteja seus dados.', 'success');
    updateNetworkUI();

    const canvas = $('receiveQr');
    if (window.QRCode && canvas) {
      QRCode.toCanvas(canvas, wallet.address, { width: 144, margin: 1 }, err => {
        if (err) setStatus('QR code não gerado.', 'error');
      });
    }
    $('resultado').scrollIntoView({ behavior: 'smooth' });
  }

  // ====== Eventos ======
  $('networkSelect')?.addEventListener('change', e => {
    currentChainId = Number(e.target.value);
    updateNetworkUI();
    if (externalProvider && connectedWalletName) {
      const pref = connectedWalletName.toLowerCase().includes('trust') ? 'trust'
        : connectedWalletName.toLowerCase().includes('safe') ? 'safe' : 'metamask';
      connectWallet(pref, connectedWalletName);
    }
    if (carteiraAtual) {
      $('saldoArea')?.classList.add('hidden');
    }
  });

  $('btnCriar')?.addEventListener('click', () => {
    try {
      if (!ethersLib?.Wallet) throw new Error('ethers.js não carregou');
      if (carteiraAtual && !confirm('Criar nova carteira e fechar a atual?')) return;
      const wallet = ethersLib.Wallet.createRandom();
      showWallet(wallet);
    } catch (err) {
      setStatus(err.message, 'error');
    }
  });

  $('btnRecuperar')?.addEventListener('click', () => {
    $('areaRecuperar').classList.remove('hidden');
    $('resultado').classList.add('hidden');
    $('inputFrase').value = '';
    $('inputFrase').focus();
  });

  $('btnCancelarRecuperar')?.addEventListener('click', () => {
    $('areaRecuperar').classList.add('hidden');
    if (carteiraAtual) $('resultado').classList.remove('hidden');
  });

  $('btnConfirmarRecuperar')?.addEventListener('click', () => {
    try {
      const phrase = $('inputFrase').value.trim().replace(/\s+/g, ' ');
      if (!phrase) {
        setStatus('Digite a frase de recuperação.', 'error');
        return;
      }
      if (carteiraAtual && !confirm('Recuperar outra carteira?')) return;
      const wallet = ethersLib.Wallet.fromPhrase(phrase);
      showWallet(wallet);
    } catch {
      setStatus('Frase inválida. Verifique as palavras e a ordem.', 'error');
    }
  });

  // Reveal / Copy
  document.querySelectorAll('.reveal').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = $(btn.dataset.alvo);
      const isHidden = el.classList.contains('masked');
      if (isHidden) {
        const secret = el.dataset.secret;
        if (!secret) return setStatus('Dado não disponível.', 'error');
        el.textContent = secret;
        el.classList.remove('masked');
        btn.textContent = '⊘';
        btn.setAttribute('aria-pressed', 'true');
      } else {
        el.textContent = '••••••••••••••••••••••••••••••••';
        el.classList.add('masked');
        btn.textContent = '◉';
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  });

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  document.querySelectorAll('.copiar').forEach(btn => {
    btn.addEventListener('click', async () => {
      const el = $(btn.dataset.alvo);
      const value = el.dataset.secret || (el.textContent === '—' ? '' : el.textContent);
      if (!value || value.includes('••')) {
        setStatus('Mostre o dado antes de copiar.', 'error');
        return;
      }
      try {
        await copyText(value);
        notify(btn.dataset.alvo === 'endereco' ? 'Endereço copiado' : 'Dado copiado — proteja a área de transferência');
      } catch {
        setStatus('Falha ao copiar.', 'error');
      }
    });
  });

  // Saldo local
  $('btnSaldo')?.addEventListener('click', async () => {
    if (!carteiraAtual) return setStatus('Crie ou recupere uma carteira primeiro.', 'error');
    const net = getSelectedNetwork();
    const btn = $('btnSaldo');
    btn.disabled = true;
    btn.textContent = 'Consultando…';
    $('saldoValor').textContent = '…';
    $('saldoArea').classList.remove('hidden');
    setStatus('');

    try {
      const provider = new ethersLib.JsonRpcProvider(net.rpc, currentChainId, { staticNetwork: true });
      const balance = await provider.getBalance(carteiraAtual.address);
      const formatted = Number(ethersLib.formatEther(balance)).toLocaleString('pt-BR', { maximumFractionDigits: 8 });
      $('saldoValor').textContent = formatted;
      $('saldoDetalhe').textContent = `${net.name} • consulta somente leitura`;
      setStatus('Saldo atualizado.', 'success');
      await provider.destroy?.();
    } catch {
      $('saldoValor').textContent = '—';
      $('saldoDetalhe').textContent = 'Falha na consulta RPC. Tente novamente.';
      setStatus('Erro ao consultar saldo.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Consultar Saldo';
    }
  });

  $('btnNova')?.addEventListener('click', () => {
    if (!confirm('Fechar esta carteira da tela?')) return;
    clearWalletView();
    notify('Carteira fechada');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ====== Multi-Wallet (MetaMask + Trust + Safe) ======
  function detectProvider(preferred) {
    // EIP-6963 multi-provider discovery
    if (window.ethereum?.providers?.length) {
      const list = window.ethereum.providers;
      if (preferred === 'metamask') {
        return list.find(p => p.isMetaMask && !p.isTrust) || list.find(p => p.isMetaMask);
      }
      if (preferred === 'trust') {
        return list.find(p => p.isTrust) || list.find(p => p.isTrustWallet);
      }
      if (preferred === 'safe') {
        return list.find(p => p.isSafe || p.isGnosisSafe) || null;
      }
    }
    // Single provider
    if (window.ethereum) {
      if (preferred === 'metamask' && window.ethereum.isMetaMask && !window.ethereum.isTrust) return window.ethereum;
      if (preferred === 'trust' && (window.ethereum.isTrust || window.ethereum.isTrustWallet)) return window.ethereum;
      if (preferred === 'safe' && (window.ethereum.isSafe || window.ethereum.isGnosisSafe)) return window.ethereum;
      // fallback generico
      if (preferred === 'any') return window.ethereum;
    }
    return null;
  }

  async function connectWallet(preferred = 'any', walletLabel = 'Carteira') {
    let ethProvider = detectProvider(preferred);

    // Trust Wallet mobile: abre deep link se não estiver no in-app browser
    if (preferred === 'trust' && !ethProvider) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const dappUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${dappUrl}`;
        setStatus('Abrindo Trust Wallet… Se não abrir, abra o app e cole o link do site.', 'success');
        return;
      }
      setStatus('Trust Wallet não detectada. Abra este site dentro do navegador do Trust Wallet ou instale a extensão.', 'error');
      return;
    }

    // Safe: tenta provider, senão orienta
    if (preferred === 'safe' && !ethProvider) {
      setStatus('Safe não detectada. Use a extensão Safe, Safe{Wallet} no mobile via WalletConnect, ou conecte a conta Safe através de outra carteira.', 'error');
      return;
    }

    if (!ethProvider) {
      if (preferred === 'metamask') {
        setStatus('MetaMask não encontrada. Instale a extensão oficial.', 'error');
      } else {
        setStatus('Nenhuma carteira detectada neste navegador.', 'error');
      }
      return;
    }

    try {
      const browserProvider = new ethersLib.BrowserProvider(ethProvider);
      await browserProvider.send('eth_requestAccounts', []);
      const network = await browserProvider.getNetwork();

      if (Number(network.chainId) !== currentChainId) {
        try {
          await ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + currentChainId.toString(16) }]
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            const net = NETWORKS[currentChainId];
            await ethProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + currentChainId.toString(16),
                chainName: net.name,
                nativeCurrency: { name: net.symbol, symbol: net.symbol, decimals: 18 },
                rpcUrls: [net.rpc]
              }]
            });
          } else {
            throw new Error('Mude a rede na carteira para ' + NETWORKS[currentChainId].name);
          }
        }
      }

      externalProvider = new ethersLib.BrowserProvider(ethProvider);
      externalSigner = await externalProvider.getSigner();
      externalAddress = await externalSigner.getAddress();
      connectedWalletName = walletLabel;

      // Detecta se o endereço parece Safe (contratos Safe começam com certos padrões, mas melhor mostrar label)
      const isContract = await externalProvider.getCode(externalAddress).then(c => c && c !== '0x').catch(() => false);

      $('metaMaskCard').classList.remove('hidden');
      $('sendPanel').classList.remove('hidden');
      $('metaMaskAddress').textContent = externalAddress;
      $('walletTypeLabel').textContent = isContract ? 'SAFE' : 'CONECTADA';
      $('walletNameLabel').textContent = walletLabel.toUpperCase() + (isContract ? ' • SMART ACCOUNT' : '');
      $('metaMaskStatus').textContent = 'Conectada • ' + NETWORKS[currentChainId].name;
      await refreshExternalBalance();
      notify(walletLabel + ' conectada • ' + NETWORKS[currentChainId].name);
    } catch (err) {
      setStatus(err.message || 'Falha ao conectar ' + walletLabel, 'error');
    }
  }

  async function refreshExternalBalance() {
    if (!externalProvider || !externalAddress) return;
    try {
      const bal = await externalProvider.getBalance(externalAddress);
      $('metaMaskBalance').textContent = Number(ethersLib.formatEther(bal)).toLocaleString('pt-BR', { maximumFractionDigits: 6 });
    } catch {
      $('metaMaskBalance').textContent = '—';
    }
  }

  $('btnMetaMask')?.addEventListener('click', () => connectWallet('metamask', 'MetaMask'));
  $('btnTrust')?.addEventListener('click', () => connectWallet('trust', 'Trust Wallet'));
  $('btnSafe')?.addEventListener('click', () => connectWallet('safe', 'Safe'));

  $('btnDesconectar')?.addEventListener('click', () => {
    externalProvider = null;
    externalSigner = null;
    externalAddress = null;
    connectedWalletName = '';
    $('metaMaskCard').classList.add('hidden');
    $('sendPanel').classList.add('hidden');
    $('destino').value = '';
    $('valorEnvio').value = '';
    notify('Desconectado desta página');
  });

  // Enviar (funciona com qualquer carteira conectada, incluindo Safe se o provider assinar)
  $('btnEnviar')?.addEventListener('click', async () => {
    const txResult = $('txResult');
    const dest = $('destino').value.trim();
    const amount = $('valorEnvio').value.trim();
    txResult.className = 'status';
    txResult.textContent = '';

    if (!externalSigner) {
      txResult.textContent = 'Conecte uma carteira primeiro (MetaMask, Trust ou Safe).';
      txResult.classList.add('error');
      return;
    }
    if (!ethersLib.isAddress(dest)) {
      txResult.textContent = 'Endereço inválido.';
      txResult.classList.add('error');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      txResult.textContent = 'Valor inválido.';
      txResult.classList.add('error');
      return;
    }
    if (dest.toLowerCase() === externalAddress.toLowerCase()) {
      txResult.textContent = 'Destino igual à conta conectada.';
      txResult.classList.add('error');
      return;
    }

    const net = getSelectedNetwork();
    if (!confirm(`Enviar ${amount} ${net.symbol} para:\n${dest}\n\nConfirme na ${connectedWalletName}.`)) return;

    const btn = $('btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Aguardando carteira…';

    try {
      const network = await externalProvider.getNetwork();
      if (Number(network.chainId) !== currentChainId) throw new Error('Rede incorreta na carteira');

      const tx = await externalSigner.sendTransaction({
        to: dest,
        value: ethersLib.parseEther(amount)
      });
      txResult.className = 'status success';
      txResult.textContent = `Tx enviada: ${tx.hash}`;
      const receipt = await tx.wait();
      txResult.textContent = receipt?.status === 1
        ? `Confirmada • ${tx.hash}`
        : `Falhou • ${tx.hash}`;
      await refreshExternalBalance();
    } catch (err) {
      txResult.className = 'status error';
      // Safe pode rejeitar se precisar de multi-sig
      const msg = err.code === 4001
        ? 'Rejeitado na carteira'
        : (err.message?.includes('Safe') || err.message?.includes('GS') 
            ? 'Transação Safe precisa de mais assinaturas ou confirmação no app Safe.'
            : (err.message || 'Erro ao enviar'));
      txResult.textContent = msg;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Revisar e Enviar';
    }
  });

  // Listeners de mudança de conta/rede
  function setupProviderListeners(provider) {
    if (!provider?.on) return;
    provider.on('accountsChanged', accounts => {
      if (!accounts?.length) {
        externalProvider = null;
        externalSigner = null;
        externalAddress = null;
        $('metaMaskCard')?.classList.add('hidden');
        $('sendPanel')?.classList.add('hidden');
      } else if (externalProvider) {
        // reconecta com a mesma preferência
        const pref = connectedWalletName.toLowerCase().includes('trust') ? 'trust'
          : connectedWalletName.toLowerCase().includes('safe') ? 'safe' : 'metamask';
        connectWallet(pref, connectedWalletName);
      }
    });
    provider.on('chainChanged', () => {
      if (externalProvider) {
        const pref = connectedWalletName.toLowerCase().includes('trust') ? 'trust'
          : connectedWalletName.toLowerCase().includes('safe') ? 'safe' : 'metamask';
        connectWallet(pref, connectedWalletName);
      }
    });
  }

  // Registra listeners no provider principal
  if (window.ethereum) {
    setupProviderListeners(window.ethereum);
    if (window.ethereum.providers) {
      window.ethereum.providers.forEach(p => setupProviderListeners(p));
    }
  }

  // Init
  updateNetworkUI();
  if (!ethersLib?.Wallet) {
    setStatus('Biblioteca ethers não carregou. Recarregue a página.', 'error');
  }
})();
