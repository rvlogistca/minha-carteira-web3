const { ethers } = window.ethers;

const btnCriar = document.getElementById('btnCriar');
const resultado = document.getElementById('resultado');

btnCriar.addEventListener('click', () => {
    // Gerar carteira aleatória
    const carteira = ethers.Wallet.createRandom();
    
    // Mostrar na tela
    document.getElementById('endereco').textContent = carteira.address;
    document.getElementById('frase').textContent = carteira.mnemonic.phrase;
    document.getElementById('chave').textContent = carteira.privateKey;
    
    // Mostrar caixa com resultado
    resultado.classList.remove('oculto');
    btnCriar.textContent = "✅ Carteira Criada!";
    btnCriar.disabled = true;
});
