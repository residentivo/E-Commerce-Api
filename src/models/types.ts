// ---- Linhas do banco (snake_case, como vêm do Postgres) ----
export interface ProductPayload {
    name: string;
    description?: string | null;
    price: number;
    stock?: number;
}

export interface ProdutoRow {
  id: number;
  nome: string;
  preco: number;      // centavos
  estoque: number;
}

export interface CarrinhoRow {
  id: number;
  status: string;
  cliente_id: number;
}

export interface ItemCarrinhoRow {
  produto_id: number;
  nome: string;
  preco: number;      // centavos
  quantidade: number;
  subtotal: number;   // centavos
}

export interface PedidoRow {
  id: number;
  cliente_id: number;
  status: string;
  total: string;
  updated_at: Date;
}

// ---- DTOs de API (camelCase, o que o cliente vê) ----

export interface ItemCarrinhoDTO {
  produtoId: number;
  nome: string;
  preco: number;      // em reais, ex.: 49.9
  quantidade: number;
  subtotal: number;   // em reais
}

export interface CarrinhoDTO {
  clienteId: number;
  status: string;
  itens: ItemCarrinhoDTO[];
  total: number;      // em reais
}

// ---- Corpo das requisições ----

export interface AdicionarItemBody {
  produto_id?: number;
  quantidade?: number;
}

export interface RemoverItemBody {
  produto_id?: number;
  //quantidade?: number;
}

// ---- Enriquecer Request do Express ----

declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
    }
  }
}