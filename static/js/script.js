const API_URL = '/api';
let movimentacoesChart = null;

// ===============================
// DASHBOARD
// ===============================
async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        if (!response.ok) throw new Error("Erro ao buscar dashboard");
        
        const data = await response.json();

        document.getElementById('card-total-entradas-mes').textContent = data.cards.total_entradas_mes ?? 0;
        document.getElementById('card-total-saidas-mes').textContent = data.cards.total_saidas_mes ?? 0;

        const spanTotalGastos = document.getElementById('card-total-gastos');
        const gastosValue = parseFloat(data.cards.total_gastos) || 0;
        spanTotalGastos.textContent = gastosValue.toFixed(2).replace('.', ',');

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
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.4 // Barras mais finas
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Adiciona margem interna para evitar que os textos sejam cortados
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    bottom: 30 // ALTERADO: Margem inferior aumentada para garantir o espaço
                }
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 9 // ALTERADO: Fonte ligeiramente menor
                        },
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 10 // NOVO: Adiciona um espaçamento entre o texto e o eixo
                    }
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
                <div class="product-header">${produto.nome}</div>
                <div class="product-body">
                    <div class="card-item">
                        <span>Estoque:</span>
                        <span class="stock-indicator ${stockClass}">${stockLevelText}</span>
                    </div>
                    <div class="card-item">
                        <span>Custo (un.):</span>
                        <span>R$ ${produto.preco_custo.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="card-item">
                        <span>Valor Total:</span>
                        <span>R$ ${(produto.quantidade * produto.preco_custo).toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                <div class="product-card-actions">
                    <button class="btn-action btn-edit" data-product-id="${produto.id}">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn-action btn-delete" data-product-id="${produto.id}" data-product-name="${produto.nome}">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            `;
            cardContainer.appendChild(card);
        });

        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (event) => {
                const produto_id = event.currentTarget.dataset.productId;
                const produto = produtos.find(p => p.id == produto_id);
                openEditModal(produto);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (event) => {
                const produto_id = event.currentTarget.dataset.productId;
                const produto_nome = event.currentTarget.dataset.productName;
                excluirProduto(produto_id, produto_nome);
            });
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
            if (document.getElementById('product-cards-container')) {
                carregarProdutos();
            }
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
            if (document.getElementById('product-cards-container')) {
                carregarProdutos();
            }
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
// EDITAR E EXCLUIR PRODUTOS
// ===============================
function openEditModal(produto) {
    document.getElementById('edit-produto-id').value = produto.id;
    document.getElementById('edit-nome-produto').value = produto.nome;
    document.getElementById('edit-qtd-produto').value = produto.quantidade;
    document.getElementById('edit-custo-produto').value = produto.preco_custo;
    document.getElementById('edit-modal-overlay').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal-overlay').style.display = 'none';
}

async function salvarEdicaoProduto(event) {
    event.preventDefault();
    const produto_id = document.getElementById('edit-produto-id').value;
    const nome = document.getElementById('edit-nome-produto').value.trim();
    const quantidade = parseInt(document.getElementById('edit-qtd-produto').value);
    const preco_custo = parseFloat(document.getElementById('edit-custo-produto').value);

    try {
        const response = await fetch(`${API_URL}/produtos/${produto_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, quantidade, preco_custo })
        });

        if (response.ok) {
            closeEditModal();
            carregarProdutos();
            alert('Produto atualizado com sucesso!');
        } else {
            const error = await response.json();
            alert(`Erro: ${error.erro || 'Não foi possível atualizar o produto'}`);
        }
    } catch (error) {
        console.error('Erro ao salvar edição:', error);
        alert('Erro de conexão ao salvar.');
    }
}

async function excluirProduto(produto_id, produto_nome) {
    if (!confirm(`Tem certeza que deseja excluir o produto "${produto_nome}"?\nTODO o histórico de movimentações deste item será perdido!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/produtos/${produto_id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            carregarProdutos();
            alert('Produto excluído com sucesso!');
        } else {
            alert('Erro ao excluir o produto.');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro de conexão ao excluir.');
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DO DARK MODE ---
    const darkModeToggle = document.getElementById('dark-mode-checkbox');
    const body = document.body;

    // Função para aplicar o tema
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        } else {
            body.classList.remove('dark-mode');
            darkModeToggle.checked = false;
        }
    };

    // Verifica o tema salvo no localStorage ao carregar a página
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // Listener para o clique no botão
    darkModeToggle.addEventListener('change', () => {
        let newTheme = 'light';
        if (darkModeToggle.checked) {
            newTheme = 'dark';
        }
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
    // --- FIM DA LÓGICA DO DARK MODE ---


    // Se estiver na página de estoque
    if (document.getElementById('product-cards-container')) {
        carregarProdutos();
        document.getElementById('modal-close-btn').addEventListener('click', closeEditModal);
        document.getElementById('form-edit-produto').addEventListener('submit', salvarEdicaoProduto);
    }

    // Se estiver na página do dashboard
    if (document.getElementById('card-total-entradas-mes')) {
        carregarDadosDashboard();
        popularSelectProdutos();
        document.getElementById('form-add-produto')?.addEventListener('submit', adicionarProduto);
        document.getElementById('form-movimentacao')?.addEventListener('submit', registrarMovimentacao);
        document.getElementById('form-gasto')?.addEventListener('submit', registrarGasto);
    }
});