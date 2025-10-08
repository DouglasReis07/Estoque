import os
from flask import Flask, jsonify, request, render_template, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy import func
from pytz import timezone
import click

# ===============================
# CONFIGURAÇÃO
# ===============================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'uma-chave-secreta-muito-segura-e-dificil-de-adivinhar'

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'estoque.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
fuso_sp = timezone("America/Sao_Paulo")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = "Por favor, faça o login para acessar esta página."
login_manager.login_message_category = "info"

# ===============================
# MODELOS
# ===============================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Produto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    quantidade = db.Column(db.Integer, default=0)
    preco_custo = db.Column(db.Float, default=0)
    
    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'quantidade': self.quantidade, 'preco_custo': self.preco_custo}

class Movimentacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produto.id'), nullable=True)
    tipo = db.Column(db.String(10), nullable=False)
    quantidade = db.Column(db.Integer, nullable=True)
    valor = db.Column(db.Float, nullable=True)
    descricao = db.Column(db.String(200))
    data = db.Column(db.DateTime, default=lambda: datetime.now(fuso_sp))
    produto = db.relationship('Produto', backref=db.backref('movimentacoes', cascade="all, delete-orphan", lazy=True))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref=db.backref('movimentacoes', lazy=True))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def adicionar_dados_iniciais():
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            user1 = User(username='Teste', nome='Teste', email='teste@email.com')
            user1.set_password('123')
            db.session.add(user1)
            print("Usuários iniciais criados.")

        if Produto.query.count() == 0:
            produtos_para_adicionar = [
                Produto(nome='TESTE1', quantidade=0, preco_custo=894.73),
                Produto(nome='TESTE2', quantidade=0, preco_custo=894.73),
                Produto(nome='TESTE3', quantidade=0, preco_custo=894.73),
                Produto(nome='TESTE4', quantidade=0, preco_custo=8.40),
                Produto(nome='TESTE5', quantidade=0, preco_custo=21.79),
                Produto(nome='TESTE6', quantidade=0, preco_custo=75.99),
                Produto(nome='TESTE7', quantidade=0, preco_custo=19.00),
                Produto(nome='TESTE8', quantidade=0, preco_custo=19.00),
                Produto(nome='TESTE9', quantidade=4, preco_custo=295.00)
            ]
            db.session.bulk_save_objects(produtos_para_adicionar)
            print("Produtos iniciais adicionados.")
        
        db.session.commit()

# ===============================
# ROTAS DE AUTENTICAÇÃO
# ===============================
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Usuário ou senha inválidos.', 'danger')
            return redirect(url_for('login'))
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ===============================
# ROTAS DE PÁGINAS (PROTEGIDAS)
# ===============================
@app.route('/')
@login_required
def dashboard():
    return render_template('index.html')


@app.route('/estoque')
@login_required
def estoque_page():
    return render_template('estoque.html')


@app.route('/movimentacoes')
@login_required
def movimentacoes_page():
    agora_sp = datetime.now(fuso_sp)
    ano_atual = agora_sp.year
    mes_atual = agora_sp.month
    return render_template('movimentacoes.html', ano_atual=ano_atual, mes_atual=mes_atual)


# ===============================
# API (ROTAS PROTEGIDAS)
# ===============================
@app.route('/api/produtos', methods=['GET', 'POST'])
@login_required
def gerenciar_produtos():
    if request.method == 'POST':
        dados = request.get_json()
        produto_existente = Produto.query.filter_by(nome=dados['nome']).first()
        if produto_existente:
            return jsonify({'message': 'Produto com este nome já existe.'}), 409
        novo_produto = Produto(
            nome=dados['nome'],
            quantidade=dados.get('quantidade', 0),
            preco_custo=dados.get('preco_custo', 0)
        )
        db.session.add(novo_produto)
        db.session.commit()
        return jsonify(novo_produto.to_dict()), 201

    produtos = Produto.query.order_by(Produto.nome).all()
    return jsonify([p.to_dict() for p in produtos])

@app.route('/api/movimentacoes', methods=['GET', 'POST'])
@login_required
def movimentacoes():
    if request.method == 'GET':
        mes = request.args.get('mes', type=int)
        ano = request.args.get('ano', type=int)
        query = Movimentacao.query
        if mes and ano:
            query = query.filter(
                func.extract('month', Movimentacao.data) == mes,
                func.extract('year', Movimentacao.data) == ano
            )
        movs = query.order_by(Movimentacao.data.desc()).all()
        total_entradas = sum(m.quantidade for m in movs if m.tipo == 'entrada' and m.quantidade)
        total_saidas = sum(m.quantidade for m in movs if m.tipo == 'saida' and m.quantidade)
        total_gastos = sum(m.valor for m in movs if m.tipo == 'gasto' and m.valor)
        
        tabela_data = []
        for m in movs:
            produto_nome = m.produto.nome if m.produto else "-"
            tabela_data.append({
                'id': m.id, 
                'produto_nome': produto_nome, 
                'tipo': m.tipo, 
                'quantidade': m.quantidade, 
                'valor': m.valor, 
                'descricao': m.descricao, 
                'data': m.data.astimezone(fuso_sp).strftime("%d/%m/%Y %H:%M")
            })

        return jsonify({
            "cards": {"total_entradas": total_entradas, "total_saidas": total_saidas, "total_gastos": total_gastos},
            "tabela": tabela_data
        })

    dados = request.get_json()
    tipo = dados['tipo']
    mov = None
    descricao_final = f"{dados.get('descricao', '')} (por: {current_user.username})"

    if tipo in ['entrada', 'saida']:
        produto = Produto.query.get(dados['produto_id'])
        if not produto: return jsonify({'erro': 'Produto não encontrado'}), 404
        quantidade = int(dados['quantidade'])
        if tipo == 'entrada': produto.quantidade += quantidade
        else:
            if produto.quantidade < quantidade: return jsonify({'erro': 'Estoque insuficiente'}), 400
            produto.quantidade -= quantidade
        mov = Movimentacao(produto_id=produto.id, tipo=tipo, quantidade=quantidade, descricao=descricao_final, user_id=current_user.id)
    elif tipo == 'gasto':
        mov = Movimentacao(tipo='gasto', valor=float(dados['valor']), descricao=descricao_final, user_id=current_user.id)
    
    if mov:
        db.session.add(mov)
        db.session.commit()
        return jsonify({'mensagem': 'Movimentação registrada com sucesso!'}), 201
    else:
        return jsonify({'erro': 'Tipo de movimentação inválido'}), 400

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    today = datetime.now(fuso_sp).date()
    first_day_of_month = today.replace(day=1)

    total_entradas_mes = db.session.query(func.sum(Movimentacao.quantidade)).filter(Movimentacao.tipo == 'entrada', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_saidas_mes = db.session.query(func.sum(Movimentacao.quantidade)).filter(Movimentacao.tipo == 'saida', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_gastos = db.session.query(func.sum(Movimentacao.valor)).filter(Movimentacao.tipo == 'gasto', Movimentacao.data >= first_day_of_month).scalar() or 0.0

    produtos_mais_movimentados = db.session.query(Produto.nome, func.count(Movimentacao.id).label('total_mov')).join(Movimentacao).group_by(Produto.nome).order_by(db.desc('total_mov')).limit(5).all()
    produtos_estoque_baixo = Produto.query.filter(Produto.quantidade <= 10).order_by(Produto.quantidade).all()
    
    return jsonify({
        'cards': {'total_entradas_mes': total_entradas_mes, 'total_saidas_mes': total_saidas_mes, 'total_gastos': total_gastos},
        'grafico_movimentacoes': {'labels': [row[0] for row in produtos_mais_movimentados], 'data': [row[1] for row in produtos_mais_movimentados]},
        'alertas_estoque': [p.to_dict() for p in produtos_estoque_baixo]
    })

@app.route('/api/produtos/<int:produto_id>', methods=['PUT', 'DELETE'])
@login_required
def gerenciar_produto_especifico(produto_id):
    produto = Produto.query.get_or_404(produto_id)
    if request.method == 'PUT':
        dados = request.get_json()
        if not dados or 'nome' not in dados or 'quantidade' not in dados or 'preco_custo' not in dados:
            return jsonify({'erro': 'Dados incompletos fornecidos'}), 400
        
        nome_antigo, qtd_antiga, custo_antigo = produto.nome, produto.quantidade, produto.preco_custo
        novo_nome, nova_qtd, novo_custo = dados['nome'], int(dados['quantidade']), float(dados['preco_custo'])

        nome_existente = Produto.query.filter(Produto.nome == novo_nome, Produto.id != produto_id).first()
        if nome_existente: return jsonify({'erro': 'Já existe um produto com este nome.'}), 409
        
        log_parts = []
        diferenca_qtd = nova_qtd - qtd_antiga
        if diferenca_qtd != 0:
            produto.quantidade = nova_qtd 
            log_parts.append(f"Qtd ajustada: {qtd_antiga} -> {nova_qtd} ({diferenca_qtd:+}).")
        if nome_antigo != novo_nome:
            produto.nome = novo_nome
            log_parts.append(f"Nome: '{nome_antigo}' -> '{novo_nome}'.")
        if custo_antigo != novo_custo:
            produto.preco_custo = novo_custo
            log_parts.append(f"Custo: R${custo_antigo:.2f} -> R${novo_custo:.2f}.")
        
        if log_parts:
            descricao_log = f"Ajuste por {current_user.username}: " + " ".join(log_parts)
            log_ajuste = Movimentacao(produto_id=produto.id, tipo='ajuste', quantidade=diferenca_qtd if diferenca_qtd != 0 else None, descricao=descricao_log, user_id=current_user.id)
            db.session.add(log_ajuste)
        
        db.session.commit()
        return jsonify(produto.to_dict())

    elif request.method == 'DELETE':
        descricao_log = f"Produto '{produto.nome}' (ID: {produto.id}) foi excluído por {current_user.username}."
        log_exclusao = Movimentacao(produto_id=None, tipo='exclusao', descricao=descricao_log, user_id=current_user.id)
        db.session.add(log_exclusao)
        
        db.session.delete(produto)
        db.session.commit()
        return jsonify({'mensagem': 'Produto e seu histórico foram excluídos!'})

@app.cli.command("create-user")
@click.argument("username")
@click.argument("nome")
@click.argument("email")
@click.argument("password")
def create_user(username, nome, email, password):
    """Cria um novo usuário no banco de dados."""
    if User.query.filter_by(username=username).first():
        print(f"Erro: O nome de usuário '{username}' já existe.")
        return
    if User.query.filter_by(email=email).first():
        print(f"Erro: O e-mail '{email}' já está em uso.")
        return
        
    new_user = User(username=username, nome=nome, email=email)
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    print(f"Usuário '{username}' criado com sucesso!")

# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    adicionar_dados_iniciais()
    app.run(debug=True, host='0.0.0.0', port=5000)