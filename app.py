import os
from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, date
from sqlalchemy import func
from pytz import timezone

# ===============================
# CONFIGURAÇÃO
# ===============================
app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'estoque.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Definir fuso horário padrão (São Paulo)
fuso_sp = timezone("America/Sao_Paulo")


# ===============================
# MODELOS
# ===============================
class Produto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    quantidade = db.Column(db.Integer, default=0)
    preco_custo = db.Column(db.Float, default=0)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'quantidade': self.quantidade,
            'preco_custo': self.preco_custo
        }


class Movimentacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produto.id'), nullable=True)
    tipo = db.Column(db.String(10), nullable=False)  # entrada | saida | gasto
    quantidade = db.Column(db.Integer, nullable=True)
    valor = db.Column(db.Float, nullable=True)
    descricao = db.Column(db.String(200))
    data = db.Column(db.DateTime, default=lambda: datetime.now(fuso_sp))  # usa fuso de SP
    produto = db.relationship('Produto', backref=db.backref('movimentacoes', lazy=True))


# ===============================
# PRODUTOS INICIAIS
# ===============================
def adicionar_produtos_iniciais():
    if Produto.query.count() == 0:
        produtos_para_adicionar = [
            Produto(nome='WIQUE777X', quantidade=0, preco_custo=894.73),
            Produto(nome='WIQUE777J', quantidade=0, preco_custo=894.73),
            Produto(nome='GV500', quantidade=0, preco_custo=894.73),
            Produto(nome='RIBBON', quantidade=0, preco_custo=8.40),
            Produto(nome='LACRE LOOVI', quantidade=0, preco_custo=21.79),
            Produto(nome='PLASTICO STRETCH', quantidade=0, preco_custo=75.99),
            Produto(nome='ETIQUETAS NF', quantidade=0, preco_custo=19.00),
            Produto(nome='ETIQUETAS QR CODE', quantidade=0, preco_custo=19.00),
            Produto(nome='BIPADOR', quantidade=4, preco_custo=295.00)
        ]
        db.session.bulk_save_objects(produtos_para_adicionar)
        db.session.commit()
        print("Produtos iniciais adicionados ao banco de dados com estoque zerado.")


# ===============================
# ROTAS DE PÁGINAS
# ===============================
@app.route('/')
def dashboard():
    return render_template('index.html')


@app.route('/estoque')
def estoque_page():
    return render_template('estoque.html')


@app.route('/movimentacoes')
def movimentacoes_page():
    agora_sp = datetime.now(fuso_sp)
    ano_atual = agora_sp.year
    mes_atual = agora_sp.month
    return render_template('movimentacoes.html', ano_atual=ano_atual, mes_atual=mes_atual)


# ===============================
# API PRODUTOS
# ===============================
@app.route('/api/produtos', methods=['GET', 'POST'])
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


# ===============================
# API MOVIMENTAÇÕES
# ===============================
@app.route('/api/movimentacoes', methods=['GET', 'POST'])
def movimentacoes():
    if request.method == 'GET':
        # Filtros opcionais
        mes = request.args.get('mes', type=int)
        ano = request.args.get('ano', type=int)

        query = Movimentacao.query
        if mes and ano:
            query = query.filter(
                func.extract('month', Movimentacao.data) == mes,
                func.extract('year', Movimentacao.data) == ano
            )

        movs = query.order_by(Movimentacao.data.desc()).all()

        # Resumo para os cards
        total_entradas = sum(m.quantidade for m in movs if m.tipo == 'entrada' and m.quantidade)
        total_saidas = sum(m.quantidade for m in movs if m.tipo == 'saida' and m.quantidade)
        total_gastos = sum(m.valor for m in movs if m.tipo == 'gasto' and m.valor)

        return jsonify({
            "cards": {
                "total_entradas": total_entradas,
                "total_saidas": total_saidas,
                "total_gastos": total_gastos
            },
            "tabela": [
                {
                    'id': m.id,
                    'produto_nome': m.produto.nome if m.produto else None,
                    'tipo': m.tipo,
                    'quantidade': m.quantidade,
                    'valor': m.valor,
                    'descricao': m.descricao,
                    'data': m.data.astimezone(fuso_sp).strftime("%d/%m/%Y %H:%M")
                }
                for m in movs
            ]
        })

    # POST: registrar movimentação
    dados = request.get_json()
    tipo = dados['tipo']

    if tipo in ['entrada', 'saida']:
        produto = Produto.query.get(dados['produto_id'])
        if not produto:
            return jsonify({'erro': 'Produto não encontrado'}), 404
        quantidade = int(dados['quantidade'])
        if tipo == 'entrada':
            produto.quantidade += quantidade
        else:
            if produto.quantidade < quantidade:
                return jsonify({'erro': 'Estoque insuficiente'}), 400
            produto.quantidade -= quantidade
        mov = Movimentacao(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            descricao=dados.get('descricao')
        )
        db.session.add(mov)

    elif tipo == 'gasto':
        mov = Movimentacao(
            tipo='gasto',
            valor=float(dados['valor']),
            descricao=dados.get('descricao')
        )
        db.session.add(mov)
    else:
        return jsonify({'erro': 'Tipo de movimentação inválido'}), 400

    db.session.commit()
    return jsonify({'mensagem': 'Movimentação registrada com sucesso!'}), 201


# ===============================
# API DASHBOARD
# ===============================
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    today = datetime.now(fuso_sp).date()
    first_day_of_month = today.replace(day=1)

    total_entradas_mes = db.session.query(func.sum(Movimentacao.quantidade))\
        .filter(Movimentacao.tipo == 'entrada', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_saidas_mes = db.session.query(func.sum(Movimentacao.quantidade))\
        .filter(Movimentacao.tipo == 'saida', Movimentacao.data >= first_day_of_month).scalar() or 0
    total_gastos = db.session.query(func.sum(Movimentacao.valor))\
        .filter(Movimentacao.tipo == 'gasto').scalar() or 0.0

    produtos_mais_movimentados = db.session.query(
        Produto.nome,
        func.count(Movimentacao.id).label('total_mov')
    ).join(Movimentacao).group_by(Produto.nome)\
     .order_by(db.desc('total_mov')).limit(5).all()
    
    return jsonify({
        'cards': {
            'total_entradas_mes': total_entradas_mes, 
            'total_saidas_mes': total_saidas_mes, 
            'total_gastos': total_gastos
        },
        'grafico_movimentacoes': {
            'labels': [row[0] for row in produtos_mais_movimentados],
            'data': [row[1] for row in produtos_mais_movimentados]
        }
    })


# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        adicionar_produtos_iniciais()
    app.run(debug=True)
