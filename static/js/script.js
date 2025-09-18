const API_URL = 'http://127.0.0.1:5000/api';
let movimentacoesChart = null;

// --- Funções Específicas para o DASHBOARD ---
async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        const data = await response.json();

        document.getElementById('card-total-entradas-mes').textContent = data.cards.total_entradas_mes;
        document.getElementById('card-total-saidas-mes').textContent = data.cards.total_saidas_mes;
        document.getElementById('card-total-gastos').textContent = data.cards.total_gastos;

        renderizarGrafico(data.grafico_movimentacoes.labels, data.grafico_movimentacoes.data);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

function renderizarGrafico(labels, data) {
    const ctx = document.getElementById('movimentacoesChart').getContext('2d');
    
    if (movimentacoesChart) {
        movimentacoesChart.destroy();
    }

    movimentacoesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nº de Movimentações',
                data: data,
                backgroundColor: 'rgba(74, 144, 226, 0.6)',
                borderColor: 'rgba(74, 144, 226, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// --- Funções Específicas para a PÁGINA DE ESTOQUE ---
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        const produtos = await response.json();

        const cardContainer = document.getElementById('product-cards-container');
        cardContainer.innerHTML = ''; 

        if (produtos.length === 0) {
            cardContainer.innerHTML = '<p>Nenhum produto cadastrado.</p>';
            return;
        }

        produtos.forEach(produto => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            let stockClass = 'stock-high';
            let stockLevelText = `${produto.quantidade} em estoque`;
            if (produto.quantidade <= 0) {
                stockClass = 'stock-low';
                stockLevelText = 'Fora de estoque';
            } else if (produto.quantidade <= 10) {
                stockClass = 'stock-medium';
            }

            // Versão completa e correta do conteúdo do card
            card.innerHTML = `
                <div class="card-header">${produto.nome}</div>
                <div class="card-body">
                    <div class="card-item">
                        <span>Estoque:</span>
                        <span class="stock-indicator ${stockClass}">${stockLevelText}</span>
                    </div>
                    <div class="card-item">
                        <span>Custo (un.):</span>
                        <span>R$ ${produto.preco_custo.toFixed(2)}</span>
                    </div>
                    <div class="card-item">
                        <span>Valor Total:</span>
                        <span>R$ ${(produto.quantidade * produto.preco_custo).toFixed(2)}</span>
                    </div>
                </div>
            `;
            cardContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// --- Funções de Formulários (usadas no Dashboard) ---
async function popularSelectProdutos() {
    const selectProduto = document.getElementById('select-produto');
    if (!selectProduto) return;

    try {
        const response = await fetch(`${API_URL}/produtos`);
        const produtos = await response.json();
        selectProduto.innerHTML = '<option value="">Selecione um produto...</option>';
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = produto.nome;
            selectProduto.appendChild(option);
        });
    } catch (error) { 
        console.error('Erro ao popular select de produtos:', error); 
    }
}

async function adicionarProduto(event) {
    event.preventDefault();
    const nome = document.getElementById('nome-produto').value;
    const quantidade = document.getElementById('qtd-produto').value;
    const preco_custo = document.getElementById('custo-produto').value;
    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, quantidade: parseInt(quantidade), preco_custo: parseFloat(preco_custo) })
        });
        if (response.status === 201) {
            document.getElementById('form-add-produto').reset();
            popularSelectProdutos(); // Atualiza a lista de produtos no outro form
        } else {
            const error = await response.json();
            alert(`Erro: ${error.message || 'Não foi possível adicionar o produto'}`);
        }
    } catch (error) { console.error('Erro ao adicionar produto:', error); }
}

async function registrarMovimentacao(event) {
    event.preventDefault();
    const produto_id = document.getElementById('select-produto').value;
    if (!produto_id) { alert('Por favor, selecione um produto.'); return; }
    const tipo = document.getElementById('tipo-movimentacao').value;
    const quantidade = document.getElementById('qtd-movimentacao').value;
    const descricao = document.getElementById('desc-movimentacao').value;
    try {
        const response = await fetch(`${API_URL}/movimentacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: parseInt(produto_id), tipo, quantidade: parseInt(quantidade), descricao })
        });
        if (response.ok) {
            document.getElementById('form-movimentacao').reset();
            carregarDadosDashboard(); // Atualiza os cards de resumo
        } else {
            const error = await response.json();
            alert(`Erro: ${error.erro || 'Não foi possível registrar a movimentação'}`);
        }
    } catch (error) { console.error('Erro ao registrar movimentação:', error); }
}

async function registrarGasto(event) {
    event.preventDefault();
    const valor = document.getElementById('valor-gasto').value;
    const descricao = document.getElementById('desc-gasto').value;
    try {
        const response = await fetch(`${API_URL}/movimentacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'gasto', valor: parseFloat(valor), descricao })
        });
        if (response.ok) {
            document.getElementById('form-gasto').reset();
            carregarDadosDashboard(); // Atualiza os cards de resumo
        } else {
            const error = await response.json();
            alert(`Erro: ${error.erro || 'Não foi possível registrar o gasto'}`);
        }
    } catch (error) { console.error('Erro ao registrar gasto:', error); }
}


// --- LÓGICA DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica em qual página estamos e executa o código correspondente
    
    // Se encontrar o container dos cards de produto, inicializa a página de Estoque
    if (document.getElementById('product-cards-container')) {
        carregarProdutos();
    }
    
    // Se encontrar os cards de resumo, inicializa a página de Dashboard
    if (document.getElementById('card-total-entradas-mes')) {
        carregarDadosDashboard();
        popularSelectProdutos();

        document.getElementById('form-add-produto').addEventListener('submit', adicionarProduto);
        document.getElementById('form-movimentacao').addEventListener('submit', registrarMovimentacao);
        document.getElementById('form-gasto').addEventListener('submit', registrarGasto);
    }
});