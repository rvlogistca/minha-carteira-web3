// Verificar se MetaMask está disponível
function verificarMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        return true;
    }
    return false;
}

// Conectar MetaMask
document.getElementById('btnMetaMask')?.addEventListener('click', async () => {
    if (!verificarMetaMask()) {
        mostrarAviso('⚠️ MetaMask não encontrada! Instale a extensão oficial em metamask.io');
        return;
    }
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const endereco = await signer.getAddress();
        mostrarAviso(`✅ Conectado: ${endereco.slice(0,6)}...${endereco.slice(-4)}`);
    } catch (erro) {
        mostrarAviso('❌ Conexão cancelada ou indisponível');
    }
});

// Função auxiliar para mostrar avisos
function mostrarAviso(mensagem) {
    const aviso = document.createElement('div');
    aviso.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: #1f1f1f; color: #f5c518; padding: 14px 24px; border-radius: 10px;
        border: 1px solid #f5c518; z-index: 9999; text-align: center; max-width: 90%;
    `;
    aviso.textContent = mensagem;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 4000);
}
