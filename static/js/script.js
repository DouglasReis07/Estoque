const API_URL = 'http://127.0.0.1:5000/api';
let movimentacoesChart = null;

// ===============================
// DASHBOARD
// ===============================
async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        if (!response.ok) throw new Error("Erro ao buscar dashboard");
        
        const data = await response.json();

        // Atualiza cards de entradas e saídas
        document.getElementById('card-total-entradas-mes').textContent = data.cards.total_entradas_mes ?? 0;
        document.getElementById('card-total-saidas-mes').textContent = data.cards.total_saidas_mes ?? 0;
        
        // Pega o elemento span onde o valor dos gastos é exibido
        const spanTotalGastos = document.getElementById('card-total-gastos');
        // Converte o valor recebido para um número, garantindo que seja 0 se for nulo
        const gastosValue = parseFloat(data.cards.total_gastos) || 0;
        // Formata o número com 2 casas decimais e atualiza na tela
        spanTotalGastos.textContent = gastosValue.toFixed(2);

        // Atualiza gráfico
        if (data.grafico_movimentacoes) {
            renderizarGrafico(data.grafico_movimentacoes.labels, data.grafico_movimentacoes.data);
        }
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
            labels,
            datasets: [{
                label: 'Movimentações',
                data,
                backgroundColor: 'rgba(74, 144, 226, 0.6)',
                borderColor: 'rgba(74, 144, 226, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ===============================
// ESTOQUE
// ===============================
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error("Erro ao buscar produtos");

        const produtos = await response.json();
        const cardContainer = document.getElementById('product-cards-container');
        cardContainer.innerHTML = '';

        if (!produtos.length) {
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

// ===============================
// FORMULÁRIOS
// ===============================
async function popularSelectProdutos() {
    const selectProduto = document.getElementById('select-produto');
    if (!selectProduto) return;

    try {
        const response = await fetch(`${API_URL}/produtos`);
        if (!response.ok) throw new Error("Erro ao buscar produtos para select");

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
    const nome = document.getElementById('nome-produto').value.trim();
    const quantidade = parseInt(document.getElementById('qtd-produto').value);
    const preco_custo = parseFloat(document.getElementById('custo-produto').value);

    try {
        const response = await fetch(`${API_URL}/produtos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, quantidade, preco_custo })
        });

        if (response.status === 201) {
            document.getElementById('form-add-produto').reset();
            popularSelectProdutos();
        } else {
            const error = await response.json();
            alert(`Erro: ${error.message || 'Não foi possível adicionar o produto'}`);
        }
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
    }
}

async function registrarMovimentacao(event) {
    event.preventDefault();
    const produto_id = document.getElementById('select-produto').value;
    const tipo = document.getElementById('tipo-movimentacao').value;
    const quantidade = parseInt(document.getElementById('qtd-movimentacao').value);
    const descricao = document.getElementById('desc-movimentacao').value.trim();

    if (!produto_id) {
        alert('Por favor, selecione um produto.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/movimentacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: parseInt(produto_id), tipo, quantidade, descricao })
        });

        if (response.ok) {
            document.getElementById('form-movimentacao').reset();
            carregarDadosDashboard();
        } else {
            const error = await response.json();
            alert(`Erro: ${error.erro || 'Não foi possível registrar a movimentação'}`);
        }
    } catch (error) {
        console.error('Erro ao registrar movimentação:', error);
    }
}

async function registrarGasto(event) {
    event.preventDefault();
    const valor = parseFloat(document.getElementById('valor-gasto').value);
    const descricao = document.getElementById('desc-gasto').value.trim();

    try {
        const response = await fetch(`${API_URL}/movimentacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo: 'gasto', valor, descricao })
        });

        if (response.ok) {
            document.getElementById('form-gasto').reset();
            carregarDadosDashboard();
        } else {
            const error = await response.json();
            alert(`Erro: ${error.erro || 'Não foi possível registrar o gasto'}`);
        }
    } catch (error) {
        console.error('Erro ao registrar gasto:', error);
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-cards-container')) {
        carregarProdutos();
    }

    if (document.getElementById('card-total-entradas-mes')) {
        carregarDadosDashboard();
        popularSelectProdutos();

        document.getElementById('form-add-produto')?.addEventListener('submit', adicionarProduto);
        document.getElementById('form-movimentacao')?.addEventListener('submit', registrarMovimentacao);
        document.getElementById('form-gasto')?.addEventListener('submit', registrarGasto);
    }
});
