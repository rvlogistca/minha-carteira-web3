'use strict';

export async function buscarPreco(rede) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${rede.coingeckoId}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const dados = await res.json();
    
    const chave = rede.coingeckoId;
    if (!dados || !dados[chave]) throw new Error('Dados não encontrados');
    
    return {
      valor: dados[chave].usd || 0,
      variacao: dados[chave].usd_24h_change || 0
    };
  } catch (erro) {
    console.warn(`⚠️ Preço indisponível para ${rede.name}:`, erro.message);
    return { valor: 0, variacao: 0 };
  }
}

export function gerarDadosGrafico(baseValor, variacaoPct, pontos = 24) {
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

export default { buscarPreco, gerarDadosGrafico };
