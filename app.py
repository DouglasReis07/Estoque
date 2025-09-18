import os
from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, date
from sqlalchemy import func

# --- Configuração Inicial ---
app = Flask(__name__)
CORS(app)

# Configuração do Banco de Dados SQLite
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'estoque.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Modelos do Banco de Dados ---
class Produto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    quantidade = db.Column(db.Integer, default=0)
    preco_custo = db.Column(db.Float, default=0)
    
    def to_dict(self):
        return {'id': self.id, 'nome': self.nome, 'quantidade': self.quantidade, 'preco_custo': self.preco_custo}

class Movimentacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produto.id'), nullable=False)
    tipo = db.Column(db.String(10), nullable=False)
    quantidade = db.Column(db.Integer, nullable=True)
    valor = db.Column(db.Float, nullable=True)
    descricao = db.Column(db.String(200))
    data = db.Column(db.DateTime, default=datetime.utcnow)
    produto = db.relationship('Produto', backref=db.backref('movimentacoes', lazy=True))

# --- Função para Adicionar Produtos Iniciais ---
def adicionar_produtos_iniciais():
    """Adiciona uma lista de produtos ao banco de dados se a tabela estiver vazia."""
    if Produto.query.count() == 0:
        # Todas as quantidades são 0 por padrão.
        produtos_para_adicionar = [
            Produto(nome='WIQUE777X', quantidade=0, preco_custo=50.0),
            Produto(nome='WIQUE777J', quantidade=0, preco_custo=55.0),
            Produto(nome='GV500', quantidade=0, preco_custo=120.0),
            Produto(nome='RIBBON', quantidade=0, preco_custo=15.5),
            Produto(nome='LACRE LOOVI', quantidade=0, preco_custo=0.5),
            Produto(nome='PLASTICO INSUFILM', quantidade=0, preco_custo=25.0),
            Produto(nome='ETIQUETAS NF', quantidade=0, preco_custo=0.2),
            Produto(nome='ETIQUETAS QR CODE', quantidade=0, preco_custo=0.1)
        ]
        db.session.bulk_save_objects(produtos_para_adicionar)
        db.session.commit()
        print("Produtos iniciais adicionados ao banco de dados com estoque zerado.")

# --- Rotas para as Páginas ---
@app.route('/')
def dashboard():
    return render_template('index.html')

@app.route('/estoque')
def estoque_page():
    return render_template('estoque.html')

# --- API Endpoints ---
@app.route('/api/produtos', methods=['GET', 'POST'])
def gerenciar_produtos():
    if request.method == 'POST':
        dados = request.get_json()
        produto_existente = Produto.query.filter_by(nome=dados['nome']).first()
        if produto_existente:
            return jsonify({'message': 'Produto com este nome já existe.'}), 409
        novo_produto = Produto(nome=dados['nome'], quantidade=dados.get('quantidade', 0), preco_custo=dados.get('preco_custo', 0))
        db.session.add(novo_produto)
        db.session.commit()
        return jsonify(novo_produto.to_dict()), 201
    produtos = Produto.query.order_by(Produto.nome).all()
    return jsonify([p.to_dict() for p in produtos])

@app.route('/api/movimentacoes', methods=['POST'])
def criar_movimentacao():
    dados = request.get_json()
    tipo = dados['tipo']
    if tipo in ['entrada', 'saida']:
        produto = Produto.query.get(dados['produto_id'])
        if not produto: return jsonify({'erro': 'Produto não encontrado'}), 404
        quantidade = int(dados['quantidade'])
        if tipo == 'entrada': produto.quantidade += quantidade
        else:
            if produto.quantidade < quantidade: return jsonify({'erro': 'Estoque insuficiente'}), 400
            produto.quantidade -= quantidade
        mov = Movimentacao(produto_id=produto.id, tipo=tipo, quantidade=quantidade, descricao=dados.get('descricao'))
        db.session.add(mov)
    elif tipo == 'gasto':
        mov = Movimentacao(tipo='gasto', valor=float(dados['valor']), descricao=dados.get('descricao'))
        db.session.add(mov)
    else: return jsonify({'erro': 'Tipo de movimentação inválido'}), 400
    db.session.commit()
    return jsonify({'mensagem': 'Movimentação registrada com sucesso!'}), 201

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    today = date.today()
    first_day_of_month = today.replace(day=1)
    total_entradas_mes = db.session.query(func.sum(Movimentacao.quantidade)).filter(Movimentacao.tipo == 'entrada', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_saidas_mes = db.session.query(func.sum(Movimentacao.quantidade)).filter(Movimentacao.tipo == 'saida', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_gastos = db.session.query(func.sum(Movimentacao.valor)).filter(Movimentacao.tipo == 'gasto').scalar() or 0
    produtos_mais_movimentados = db.session.query(Produto.nome, func.count(Movimentacao.id).label('total_mov')).join(Movimentacao).group_by(Produto.nome).order_by(db.desc('total_mov')).limit(5).all()
    return jsonify({
        'cards': {'total_entradas_mes': total_entradas_mes, 'total_saidas_mes': total_saidas_mes, 'total_gastos': f'{total_gastos:.2f}'},
        'grafico_movimentacoes': {'labels': [row[0] for row in produtos_mais_movimentados], 'data': [row[1] for row in produtos_mais_movimentados]}
    })

# --- Bloco de Execução Principal ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        adicionar_produtos_iniciais()
    app.run(debug=True)