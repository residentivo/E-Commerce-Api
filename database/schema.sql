CREATE TABLE
  IF NOT EXISTS produtos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    estoque INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW (),
    updated_at TIMESTAMP DEFAULT NOW ()
  );

-- carts
CREATE TABLE
  IF NOT EXISTS carrinhos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id INTEGER NOT NULL UNIQUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now ()
  );

-- cart items
CREATE TABLE
  IF NOT EXISTS carrinho_itens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    carrinho_id INTEGER NOT NULL REFERENCES carrinhos (id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos (id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    UNIQUE (carrinho_id, produto_id)
  );

CREATE INDEX IF NOT EXISTS idx_carrinho_itens_carrinho
  ON carrinho_itens (carrinho_id);
  
-- (opcional) garantir unicidade do nome
ALTER TABLE produtos ADD CONSTRAINT produtos_nome_key UNIQUE (nome);

-- Tabela principal de pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de histórico (imutável)
CREATE TABLE pedidos_historico (
    historico_id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL,
    cliente_id INTEGER,
    status TEXT,
    total DECIMAL(10,2),
    operacao CHAR(1) NOT NULL, -- 'I' (Insert), 'U' (Update), 'D' (Delete)
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by TEXT -- Opcional: ID do usuário que fez a alteração
);

-- Função da Trigger
CREATE OR REPLACE FUNCTION log_pedido_historico()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO pedidos_historico (pedido_id, cliente_id, status, total, operacao)
        VALUES (OLD.id, OLD.cliente_id, OLD.status, OLD.total, 'D');
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO pedidos_historico (pedido_id, cliente_id, status, total, operacao)
        VALUES (OLD.id, OLD.cliente_id, OLD.status, OLD.total, 'U');
        RETURN NEW;
    -- ELSIF (TG_OP = 'INSERT') THEN
    --     INSERT INTO pedidos_historico (pedido_id, cliente_id, status, total, operacao)
    --     VALUES (NEW.id, NEW.cliente_id, NEW.status, NEW.total, 'I');
    --     RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela principal
CREATE TRIGGER pedidos_historico_trigger
AFTER INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION log_pedido_historico();

INSERT INTO
  produtos (nome, descricao, preco, estoque)
SELECT
  v.nome,
  v.descricao,
  v.preco,
  v.estoque
FROM
  (
    VALUES
      (
        'Camiseta',
        'Camiseta 100% algodão, unissex',
        49.90,
        100
      ),
      (
        'Tênis',
        'Tênis esportivo para corrida',
        299.90,
        20
      ),
      ('Boné', 'Boné ajustável com aba curva', 39.90, 50)
  ) AS v (nome, descricao, preco, estoque)
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      produtos
  );
