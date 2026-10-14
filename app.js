(() => {
  'use strict';

  const ethersLib = window.ethers;
  const $ = (id) => document.getElementById(id);
  const MAINNET_RPC = 'https://ethereum-rpc.publicnode.com';

  let carteiraAtual = null;
  let metaMaskProvider = null;
  let metaMaskSigner = null;
  let metaMaskAddress = null;
  let toastTimer = null;

  const btnCriar = $('btnCriar');
  const btnRecuperar = $('btnRecuperar');
  const areaRecuperar = $('areaRecuperar');
  const btnConfirmarRecuperar = $('btnConfirmarRecuperar');
  const btnCancelarRecuperar = $('btnCancelarRecuperar');
  const resultado = $('resultado');
  const btnNova = $('btnNova');
  const btnSaldo = $('btnSaldo');
  const saldoArea = $('saldoArea');
  const status = $('status');

  function setStatus(message = '', kind = '') {
    status.textContent = message;
    status.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function notify(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
  }

  function hideSecrets() {
    ['frase', 'chave'].forEach((id) => {
      const el = $(id);
      el.textContent = '••••••••••••••••••••••••••••••••';
      el.classList.add('masked');
    });
    document.querySelectorAll('.reveal').forEach((button) => {
      button.textContent = '◉';
      button.setAttribute('aria-pressed', 'false');
    });
  }

  function clearWalletView() {
    carteiraAtual = null;
    resultado.classList.add('hidden');
    saldoArea.classList.add('hidden');
    areaRecuperar.classList.add('hidden');
    $('inputFrase').value = '';
    $('endereco').textContent = '—';
    $('frase').textContent = '—';
    $('chave').textContent = '—';
    hideSecrets();
    setStatus('');
    btnSaldo.disabled = false;
    btnSaldo.textContent = 'Consultar saldo ETH';
  }

  function showWallet(wallet) {
    carteiraAtual = wallet;
    $('endereco').textContent = wallet.address;
    $('frase').dataset.secret = wallet.mnemonic?.phrase || '';
    $('chave').dataset.secret = wallet.privateKey;
    hideSecrets();
    resultado.classList.remove('hidden');
    areaRecuperar.classList.add('hidden');
    saldoArea.classList.add('hidden');
    $('inputFrase').value = '';
    setStatus('Carteira carregada neste navegador. Mantenha os dados secretos protegidos.', 'success');
    resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureEthers() {
    if (!ethersLib?.Wallet) {
      throw new Error('Não foi possível carregar a biblioteca da carteira. Verifique a conexão e recarregue a página.');
    }
  }

  btnCriar.addEventListener('click', () => {
    try {
      ensureEthers();
      if (carteiraAtual && !window.confirm('Criar outra carteira e fechar a visualização atual? Certifique-se de ter guardado a frase da carteira anterior.')) return;
      const wallet = ethersLib.Wallet.createRandom();
      showWallet(wallet);
    } catch (error) {
      setStatus(error.message || 'Não foi possível criar a carteira.', 'error');
    }
  });

  btnRecuperar.addEventListener('click', () => {
    areaRecuperar.classList.remove('hidden');
    resultado.classList.add('hidden');
    $('inputFrase').value = '';
    setStatus('');
    $('inputFrase').focus();
  });

  btnCancelarRecuperar.addEventListener('click', () => {
    areaRecuperar.classList.add('hidden');
    $('inputFrase').value = '';
    if (carteiraAtual) resultado.classList.remove('hidden');
  });

  btnConfirmarRecuperar.addEventListener('click', () => {
    try {
      ensureEthers();
      const phrase = $('inputFrase').value.trim().replace(/\s+/g, ' ');
      if (!phrase) {
        setStatus('Digite sua frase de recuperação.', 'error');
        $('inputFrase').focus();
        return;
      }
      if (carteiraAtual && !window.confirm('Recuperar outra carteira e fechar a visualização atual?')) return;
      const wallet = ethersLib.Wallet.fromPhrase(phrase);
      showWallet(wallet);
    } catch (error) {
      setStatus('Não foi possível recuperar. Confira as palavras e a ordem da frase.', 'error');
    }
  });

  document.querySelectorAll('.reveal').forEach((button) => {
    button.addEventListener('click', () => {
      const el = $(button.dataset.alvo);
      const isHidden = el.classList.contains('masked');
      if (isHidden) {
        const secret = el.dataset.secret;
        if (!secret) {
          setStatus('Este dado secreto não está disponível nesta sessão.', 'error');
          return;
        }
        el.textContent = secret;
        el.classList.remove('masked');
        button.setAttribute('aria-pressed', 'true');
        button.textContent = '⊘';
      } else {
        el.textContent = '••••••••••••••••••••••••••••••••';
        el.classList.add('masked');
        button.setAttribute('aria-pressed', 'false');
        button.textContent = '◉';
      }
    });
  });

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand('copy');
    helper.remove();
    if (!ok) throw new Error('A cópia foi bloqueada pelo navegador.');
  }

  document.querySelectorAll('.copiar').forEach((button) => {
    button.addEventListener('click', async () => {
      const el = $(button.dataset.alvo);
      const value = el.dataset.secret || (el.textContent === '—' ? '' : el.textContent);
      if (!value || value.includes('••')) {
        setStatus('Mostre o dado secreto antes de copiá-lo.', 'error');
        return;
      }
      try {
        await copyText(value);
        notify(button.dataset.alvo === 'endereco' ? 'Endereço copiado.' : 'Dado copiado. Proteja a área de transferência.');
      } catch (error) {
        setStatus(error.message || 'Não foi possível copiar. Verifique as permissões do navegador.', 'error');
      }
    });
  });

  btnSaldo.addEventListener('click', async () => {
    if (!carteiraAtual) {
      setStatus('Crie ou recupere uma carteira primeiro.', 'error');
      return;
    }
    ensureEthers();
    btnSaldo.disabled = true;
    btnSaldo.textContent = 'Consultando…';
    $('saldoValor').textContent = '…';
    $('saldoDetalhe').textContent = 'Conectando à rede principal Ethereum.';
    saldoArea.classList.remove('hidden');
    setStatus('');
    try {
      const provider = new ethersLib.JsonRpcProvider(MAINNET_RPC, 1, { staticNetwork: true });
      const balance = await provider.getBalance(carteiraAtual.address);
      const formatted = ethersLib.formatEther(balance);
      $('saldoValor').innerHTML = `${Number(formatted).toLocaleString('pt-BR', { maximumFractionDigits: 8 })} <span>ETH</span>`;
      $('saldoDetalhe').textContent = 'Rede principal Ethereum (Mainnet). Consulta somente leitura; nenhuma transação foi enviada.';
      setStatus('Saldo atualizado.', 'success');
      await provider.destroy();
    } catch (error) {
      $('saldoValor').textContent = 'Indisponível';
      $('saldoDetalhe').textContent = 'Não foi possível consultar o RPC agora. Tente novamente em instantes.';
      setStatus('Falha ao consultar o saldo. Verifique a internet ou tente novamente mais tarde.', 'error');
    } finally {
      btnSaldo.disabled = false;
      btnSaldo.textContent = 'Consultar saldo ETH';
    }
  });

  btnNova.addEventListener('click', () => {
    if (!window.confirm('Fechar esta carteira e ocultar os dados da tela? Isso não apaga a carteira da blockchain.')) return;
    clearWalletView();
    notify('Visualização da carteira fechada.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  async function connectMetaMask() {
    const card = $('metaMaskCard');
    const sendPanel = $('sendPanel');
    if (!window.ethereum) {
      setStatus('MetaMask não encontrada. Instale a extensão oficial ou abra este site no navegador da MetaMask.', 'error');
      return;
    }
    try {
      const browserProvider = new ethersLib.BrowserProvider(window.ethereum);
      await browserProvider.send('eth_requestAccounts', []);
      const network = await browserProvider.getNetwork();
      if (network.chainId !== 1n) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }]
          });
        } catch (switchError) {
          throw new Error('Mude a rede da MetaMask para Ethereum Mainnet (Chain ID 1) e tente novamente.');
        }
      }
      metaMaskProvider = new ethersLib.BrowserProvider(window.ethereum);
      metaMaskSigner = await metaMaskProvider.getSigner();
      metaMaskAddress = await metaMaskSigner.getAddress();
      card.classList.remove('hidden');
      sendPanel.classList.remove('hidden');
      $('metaMaskAddress').textContent = metaMaskAddress;
      $('metaMaskStatus').textContent = 'Conectada. Transações exigem confirmação na MetaMask.';
      await refreshMetaMaskBalance();
      notify('MetaMask conectada à Ethereum Mainnet.');
    } catch (error) {
      setStatus(error.message || 'Não foi possível conectar à MetaMask.', 'error');
    }
  }

  async function refreshMetaMaskBalance() {
    if (!metaMaskProvider || !metaMaskAddress) return;
    try {
      const balance = await metaMaskProvider.getBalance(metaMaskAddress);
      $('metaMaskBalance').innerHTML = `${Number(ethersLib.formatEther(balance)).toLocaleString('pt-BR', { maximumFractionDigits: 8 })} <span>ETH</span>`;
    } catch (_) {
      $('metaMaskBalance').textContent = 'Saldo indisponível';
    }
  }

  $('btnMetaMask').addEventListener('click', connectMetaMask);

  $('btnDesconectar').addEventListener('click', () => {
    // O site não pode revogar a permissão da extensão; apenas limpa a sessão visual local.
    metaMaskProvider = null;
    metaMaskSigner = null;
    metaMaskAddress = null;
    $('metaMaskCard').classList.add('hidden');
    $('sendPanel').classList.add('hidden');
    $('destino').value = '';
    $('valorEnvio').value = '';
    notify('Conexão removida desta página. Para revogar permissões, use as configurações da MetaMask.');
  });

  $('btnEnviar').addEventListener('click', async () => {
    const txResult = $('txResult');
    const destination = $('destino').value.trim();
    const amount = $('valorEnvio').value.trim();
    txResult.className = 'status';
    txResult.textContent = '';

    if (!metaMaskSigner || !metaMaskAddress) {
      txResult.textContent = 'Conecte a MetaMask primeiro.';
      txResult.classList.add('error');
      return;
    }
    if (!ethersLib.isAddress(destination)) {
      txResult.textContent = 'Digite um endereço Ethereum válido.';
      txResult.classList.add('error');
      return;
    }
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      txResult.textContent = 'Digite um valor de ETH maior que zero.';
      txResult.classList.add('error');
      return;
    }
    if (destination.toLowerCase() === metaMaskAddress.toLowerCase()) {
      txResult.textContent = 'O endereço de destino é igual ao endereço conectado.';
      txResult.classList.add('error');
      return;
    }
    if (!window.confirm(`Você vai solicitar o envio de ${amount} ETH para:\n${destination}\n\nConfira endereço, valor e taxa na MetaMask. Deseja continuar?`)) return;

    const button = $('btnEnviar');
    button.disabled = true;
    button.textContent = 'Aguardando MetaMask…';
    try {
      const network = await metaMaskProvider.getNetwork();
      if (network.chainId !== 1n) throw new Error('A MetaMask não está na Ethereum Mainnet.');
      const tx = await metaMaskSigner.sendTransaction({
        to: destination,
        value: ethersLib.parseEther(amount)
      });
      txResult.className = 'status success';
      txResult.textContent = `Transação enviada. Aguardando confirmação: ${tx.hash}`;
      const receipt = await tx.wait();
      txResult.textContent = receipt?.status === 1
        ? `Transação confirmada. Hash: ${tx.hash}`
        : `A transação não foi confirmada com sucesso. Hash: ${tx.hash}`;
      await refreshMetaMaskBalance();
    } catch (error) {
      const message = error?.code === 4001
        ? 'Transação rejeitada na MetaMask.'
        : (error.message || 'Não foi possível enviar a transação.');
      txResult.className = 'status error';
      txResult.textContent = message;
    } finally {
      button.disabled = false;
      button.textContent = 'Revisar e enviar na MetaMask';
    }
  });

  if (window.ethereum?.on) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (!accounts || !accounts.length) {
        metaMaskProvider = null;
        metaMaskSigner = null;
        metaMaskAddress = null;
        $('metaMaskCard').classList.add('hidden');
        $('sendPanel').classList.add('hidden');
      } else if (metaMaskProvider) {
        connectMetaMask();
      }
    });
    window.ethereum.on('chainChanged', () => {
      // Re-read chain and balance after the wallet network changes.
      if (metaMaskProvider) connectMetaMask();
    });
  }

  // QR code is generated for the currently displayed public address only.
  const originalShowWallet = showWallet;
  showWallet = function(wallet) {
    originalShowWallet(wallet);
    const canvas = $('receiveQr');
    if (window.QRCode && canvas) {
      window.QRCode.toCanvas(canvas, wallet.address, { width: 144, margin: 1 }, (error) => {
        if (error) setStatus('A carteira foi carregada, mas não foi possível gerar o QR code.', 'error');
      });
    }
  };

  if (!ethersLib?.Wallet) {
    setStatus('A biblioteca ethers não carregou. Verifique a conexão e recarregue a página.', 'error');
  }
})();
