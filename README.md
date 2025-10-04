# GARRY PRO - Sistema de Controle de Estoque 📈

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-black?style=for-the-badge&logo=flask)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript)

Um sistema web completo e moderno para controle de estoque, desenvolvido para ser simples, rápido e visualmente agradável.


## ✨ Funcionalidades Principais

O GARRY PRO foi construído com um conjunto robusto de funcionalidades para uma gestão de estoque eficiente:

#### **Gestão e Controle:**
* **🔐 Sistema de Autenticação:** Acesso seguro com página de login e senhas criptografadas.
* **📦 Cadastro de Produtos:** Adicione, edite e exclua produtos (CRUD completo).
* **🔄 Movimentação de Estoque:** Registre entradas e saídas de forma simples e rápida.
* **💸 Registro de Gastos:** Controle despesas gerais que não estão diretamente ligadas a produtos.
* **⚠️ Alertas de Estoque Baixo:** Um card no dashboard avisa proativamente quais produtos precisam de reposição (estoque <= 10 unidades).

#### **Visualização e Análise:**
* **📊 Dashboard Inteligente:**
    * Resumo mensal de entradas, saídas e gastos.
    * Gráfico de barras com os produtos mais movimentados.
    * Gráfico de pizza comparando o volume de entradas vs. saídas.
* **📜 Histórico Completo:** Uma página dedicada para visualizar e filtrar todas as movimentações por mês e ano.
* **🕵️ Rastreabilidade:** Todas as movimentações e ajustes registram o nome do usuário que realizou a ação na descrição.

#### **Experiência do Usuário (UX):**
* **🎨 Interface Moderna e Responsiva:** Design limpo e que se adapta a diferentes tamanhos de tela.
* **🌙 Modo Escuro (Dark Mode):** Alternância de tema para conforto visual, com a preferência salva no navegador.
* **👤 Menu de Usuário Personalizado:** A barra lateral exibe o nome do usuário logado e um menu para configurações e logout.
* **🔔 Notificações Modernas:** Mensagens de sucesso e erro aparecem como "toasts" no canto da tela, sem interromper o fluxo de trabalho.

## 🛠️ Tecnologias Utilizadas

* **Backend:**
    * Python 3
    * Flask (Microframework web)
    * Flask-SQLAlchemy (ORM para interação com o banco de dados)
    * Flask-Login (Gerenciamento de sessões de usuário)
    * Werkzeug (Para criptografia de senhas)
* **Frontend:**
    * HTML5
    * CSS3 (Flexbox para layout)
    * JavaScript (Vanilla JS, para interatividade e chamadas de API)
* **Banco de Dados:**
    * SQLite (Simples e embarcado no projeto)
* **Bibliotecas:**
    * Chart.js (Para os gráficos)
    * Toastify.js (Para as notificações)
    * SweetAlert2 (Para as confirmações de exclusão)
    * Bootstrap Icons (Para os ícones)

## 🚀 Como Executar o Projeto

Para rodar o GARRY PRO em sua máquina local, siga os passos abaixo.

### Pré-requisitos

* Python 3.9 ou superior instalado.
* `pip` (gerenciador de pacotes do Python).

### Instalação

1.  **Clone o repositório (ou simplesmente descompacte os arquivos em uma pasta).**

2.  **Crie um ambiente virtual (recomendado):**
    ```bash
    python -m venv venv
    ```
    Ative o ambiente:
    * No Windows: `venv\Scripts\activate`
    * No macOS/Linux: `source venv/bin/activate`

3.  **Crie o arquivo `requirements.txt`:**
    Na pasta principal do projeto, crie um arquivo chamado `requirements.txt` e cole o seguinte conteúdo nele:
    ```txt
    Flask
    Flask-SQLAlchemy
    Flask-Login
    Werkzeug
    pytz
    ```

4.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

### Executando

1.  **Apague o banco de dados antigo (se existir):**
    Se houver um arquivo `estoque.db` na pasta, apague-o. Ele será recriado com a nova estrutura de usuários.

2.  **Execute a aplicação:**
    ```bash
    python app.py
    ```
    O servidor será iniciado. A primeira execução criará o banco de dados e os usuários padrão.

3.  **Acesse no navegador:**
    Abra seu navegador e acesse `http://127.0.0.1:5000`.

4.  **Faça o login:**
    Use uma das credenciais padrão:
    * **Usuário:** `Teste` / **Senha:** `teste`

---
