-- ATENCAO: script destrutivo para desenvolvimento/testes.
-- Apaga e recria as tabelas da aplicacao no schema public, incluindo os dados.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;
SET LOCAL search_path TO public, pg_catalog;

DROP TABLE IF EXISTS public.pagamentos CASCADE;
DROP TABLE IF EXISTS public.pedidos_itens_historico CASCADE;
DROP TABLE IF EXISTS public.pedidos_itens CASCADE;
DROP TABLE IF EXISTS public.pedidos_historico CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.carrinho_itens CASCADE;
DROP TABLE IF EXISTS public.carrinhos CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;

DROP FUNCTION IF EXISTS public.log_pedidos_itens_historico() CASCADE;
DROP FUNCTION IF EXISTS public.log_pedido_historico() CASCADE;

CREATE TABLE public.produtos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.carrinhos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ABERTO'
    CHECK (status IN ('ABERTO', 'FECHADO')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.carrinho_itens (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  carrinho_id INTEGER NOT NULL
    REFERENCES public.carrinhos(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL
    REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  UNIQUE (carrinho_id, produto_id)
);

CREATE INDEX idx_carrinho_itens_carrinho
  ON public.carrinho_itens (carrinho_id);

CREATE TABLE public.pedidos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ABERTO'
    CHECK (status IN ('ABERTO', 'FECHADO', 'CANCELADO')),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pedidos_historico (
  historico_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL,
  cliente_id INTEGER,
  status TEXT,
  total NUMERIC(10, 2),
  operacao CHAR(1) NOT NULL CHECK (operacao IN ('I', 'U', 'D')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT
);

CREATE TABLE public.pedidos_itens (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL
    REFERENCES public.pedidos(id) ON DELETE RESTRICT,
  produto_id INTEGER
    REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome_produto TEXT NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL
    CHECK (preco_unitario >= 0),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  subtotal NUMERIC(12, 2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pedidos_itens_subtotal_nonnegative_check
    CHECK (subtotal >= 0),
  CONSTRAINT pedidos_itens_subtotal_consistency_check
    CHECK (subtotal = preco_unitario * quantidade)
);

CREATE INDEX idx_pedidos_itens_pedido_id
  ON public.pedidos_itens (pedido_id);

CREATE TABLE public.pedidos_itens_historico (
  historico_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_item_id INTEGER NOT NULL,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER,
  nome_produto TEXT NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL,
  quantidade INTEGER NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  operacao CHAR(1) NOT NULL CHECK (operacao IN ('I', 'U', 'D')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT
);

CREATE INDEX idx_pedidos_itens_historico_item_id
  ON public.pedidos_itens_historico (pedido_item_id);

CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id INTEGER NOT NULL
    REFERENCES public.pedidos(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  external_id TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0)
);

CREATE FUNCTION public.log_pedido_historico()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.pedidos_historico
      (pedido_id, cliente_id, status, total, operacao)
    VALUES (OLD.id, OLD.cliente_id, OLD.status, OLD.total, 'D');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.pedidos_historico
      (pedido_id, cliente_id, status, total, operacao)
    VALUES (OLD.id, OLD.cliente_id, OLD.status, OLD.total, 'U');
    RETURN NEW;
  ELSE
    INSERT INTO public.pedidos_historico
      (pedido_id, cliente_id, status, total, operacao)
    VALUES (NEW.id, NEW.cliente_id, NEW.status, NEW.total, 'I');
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedidos_historico_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.log_pedido_historico();

CREATE FUNCTION public.log_pedidos_itens_historico()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.pedidos_itens_historico (
      pedido_item_id, pedido_id, produto_id, nome_produto,
      preco_unitario, quantidade, subtotal, operacao
    )
    VALUES (
      OLD.id, OLD.pedido_id, OLD.produto_id, OLD.nome_produto,
      OLD.preco_unitario, OLD.quantidade, OLD.subtotal, 'D'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.pedidos_itens_historico (
      pedido_item_id, pedido_id, produto_id, nome_produto,
      preco_unitario, quantidade, subtotal, operacao
    )
    VALUES (
      OLD.id, OLD.pedido_id, OLD.produto_id, OLD.nome_produto,
      OLD.preco_unitario, OLD.quantidade, OLD.subtotal, 'U'
    );
    RETURN NEW;
  ELSE
    INSERT INTO public.pedidos_itens_historico (
      pedido_item_id, pedido_id, produto_id, nome_produto,
      preco_unitario, quantidade, subtotal, operacao
    )
    VALUES (
      NEW.id, NEW.pedido_id, NEW.produto_id, NEW.nome_produto,
      NEW.preco_unitario, NEW.quantidade, NEW.subtotal, 'I'
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedidos_itens_historico_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos_itens
FOR EACH ROW EXECUTE FUNCTION public.log_pedidos_itens_historico();

INSERT INTO public.produtos (nome, descricao, preco, estoque)
VALUES
  ('Camiseta', 'Camiseta 100% algodão, unissex', 49.90, 100),
  ('Tênis', 'Tênis esportivo para corrida', 299.90, 20),
  ('Boné', 'Boné ajustável com aba curva', 39.90, 50);

COMMIT;
