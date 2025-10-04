const API_URL = '/api';
let movimentacoesChart = null;

// ===============================
// FUNÇÃO AUXILIAR PARA NOTIFICAÇÕES
// ===============================
function showToast(message, type = 'success') {
    const style = {
        background: '',
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    };

    switch (type) {
        case 'success':
            style.background = "linear-gradient(to right, #00b09b, #96c93d)";
            break;
        case 'error':
            style.background = "linear-gradient(to right, #e74c3c, #c0392b)";
            break;
        case 'info':
        default:
            style.background = "linear-gradient(to right, #3498db, #2980b9)";
            break;
    }

    Toastify({
        text: message,
        duration: 3000,
        gravity: "bottom",
        position: "right",
        stopOnFocus: true,
        style: style
    }).showToast();
}

// ===============================
// DASHBOARD
// ===============================
async function carregarDadosDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        if (!response.ok) throw new Error("Erro ao buscar dashboard");
        
        const data = await response.json();

        // Atualiza cards de resumo
        document.getElementById('card-total-entradas-mes').textContent = data.cards.total_entradas_mes ?? 0;
        document.getElementById('card-total-saidas-mes').textContent = data.cards.total_saidas_mes ?? 0;
        const spanTotalGastos = document.getElementById('card-total-gastos');
        const gastosValue = parseFloat(data.cards.total_gastos) || 0;
        spanTotalGastos.textContent = gastosValue.toFixed(2).replace('.', ',');

        // Renderiza gráfico
        if (data.grafico_movimentacoes) {
            renderizarGrafico(data.grafico_movimentacoes.labels, data.grafico_movimentacoes.data);
        }

        // Renderiza a lista de alertas de estoque baixo
        const listaAlertas = document.getElementById('lista-alertas-estoque');
        listaAlertas.innerHTML = ''; 

        if (data.alertas_estoque && data.alertas_estoque.length > 0) {
            data.alertas_estoque.forEach(produto => {
                const li = document.createElement('li');
                li.style.padding = '0.5rem 0.25rem';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';

                let quantidadeStyle = 'font-weight: bold;';
                if (produto.quantidade <= 5) {
                    quantidadeStyle += 'color: var(--danger-color);';
                } else {
                    quantidadeStyle += 'color: #ffc107;';
                }

                li.innerHTML = `
                    <span>${produto.nome}</span>
                    <span style="${quantidadeStyle}">
                        ${produto.quantidade} un.
                    </span>
                `;
                listaAlertas.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.style.padding = '0.5rem 0.25rem';
            li.textContent = 'Nenhum alerta de estoque.';
            listaAlertas.appendChild(li);
        }

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showToast('Não foi possível carregar os dados do dashboard.', 'error');
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
                barPercentage: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 10, right: 10, bottom: 30 }},
            plugins: { legend: { display: false }},
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: document.body.classList.contains('dark-mode') ? '#e5e7eb' : '#6c757d' }},
                x: { ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45, padding: 10, color: document.body.classList.contains('dark-mode') ? '#e5e7eb' : '#6c757d' }}
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
                    <div class="card-item"><span>Estoque:</span><span class="stock-indicator ${stockClass}">${stockLevelText}</span></div>
                    <div class="card-item"><span>Custo (un.):</span><span>R$ ${produto.preco_custo.toFixed(2).replace('.', ',')}</span></div>
                    <div class="card-item"><span>Valor Total:</span><span>R$ ${(produto.quantidade * produto.preco_custo).toFixed(2).replace('.', ',')}</span></div>
                </div>
                <div class="product-card-actions">
                    <button class="btn-action btn-edit" data-product-id="${produto.id}"><i class="bi bi-pencil"></i> Editar</button>
                    <button class="btn-action btn-delete" data-product-id="${produto.id}" data-product-name="${produto.nome}"><i class="bi bi-trash"></i> Excluir</button>
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
        showToast('Não foi possível carregar os produtos.', 'error');
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
        showToast('Erro ao carregar lista de produtos.', 'error');
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
            showToast('Produto adicionado com sucesso!', 'success');
            document.getElementById('form-add-produto').reset();
            popularSelectProdutos();
            carregarDadosDashboard();
            if (document.getElementById('product-cards-container')) {
                carregarProdutos();
            }
        } else {
            const error = await response.json();
            showToast(`Erro: ${error.message || 'Não foi possível adicionar o produto'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        showToast('Erro de conexão ao adicionar produto.', 'error');
    }
}

async function registrarMovimentacao(event) {
    event.preventDefault();
    const produto_id = document.getElementById('select-produto').value;
    const tipo = document.getElementById('tipo-movimentacao').value;
    const quantidade = parseInt(document.getElementById('qtd-movimentacao').value);
    const descricao = document.getElementById('desc-movimentacao').value.trim();
    if (!produto_id) {
        showToast('Por favor, selecione um produto.', 'info');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/movimentacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: parseInt(produto_id), tipo, quantidade, descricao })
        });
        if (response.ok) {
            showToast('Movimentação registrada com sucesso!', 'success');
            document.getElementById('form-movimentacao').reset();
            carregarDadosDashboard();
            if (document.getElementById('product-cards-container')) {
                carregarProdutos();
            }
        } else {
            const error = await response.json();
            showToast(`Erro: ${error.erro || 'Não foi possível registrar a movimentação'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao registrar movimentação:', error);
        showToast('Erro de conexão ao registrar movimentação.', 'error');
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
            showToast('Gasto registrado com sucesso!', 'success');
            document.getElementById('form-gasto').reset();
            carregarDadosDashboard();
        } else {
            const error = await response.json();
            showToast(`Erro: ${error.erro || 'Não foi possível registrar o gasto'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao registrar gasto:', error);
        showToast('Erro de conexão ao registrar gasto.', 'error');
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
            carregarDadosDashboard();
            popularSelectProdutos();
            showToast('Produto atualizado com sucesso!', 'success');
        } else {
            const error = await response.json();
            showToast(`Erro: ${error.erro || 'Não foi possível atualizar o produto'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar edição:', error);
        showToast('Erro de conexão ao salvar.', 'error');
    }
}

async function excluirProduto(produto_id, produto_nome) {
    const result = await Swal.fire({
        title: 'Você tem certeza?',
        text: `Deseja realmente excluir o produto "${produto_nome}"? Todo o seu histórico será perdido!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/produtos/${produto_id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                carregarProdutos();
                carregarDadosDashboard();
                popularSelectProdutos();
                showToast('Produto excluído com sucesso!', 'success');
            } else {
                showToast('Erro ao excluir o produto.', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showToast('Erro de conexão ao excluir.', 'error');
        }
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DO DARK MODE ---
    const darkModeToggle = document.getElementById('dark-mode-checkbox');
    const body = document.body;
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
        if(darkModeToggle) darkModeToggle.checked = (theme === 'dark');
        
        const newColor = body.classList.contains('dark-mode') ? '#e5e7eb' : '#6c757d';
        if (movimentacoesChart) {
            movimentacoesChart.options.scales.x.ticks.color = newColor;
            movimentacoesChart.options.scales.y.ticks.color = newColor;
            movimentacoesChart.update();
        }
    };
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    darkModeToggle.addEventListener('change', () => {
        const newTheme = darkModeToggle.checked ? 'dark' : 'light';
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
    
    // Se estiver na página de movimentações
    if (document.getElementById('tabela-movimentacoes')) {
        carregarMovimentacoes();
    }
});