import { PoolClient } from "pg";
import { pool } from '../config/database';
import type { PedidoRow } from '../models/types';

class ComprasRepository {
    async criarItemCompra(client: PoolClient, compraId: number, produtoId: number, quantidade: number) {
        await client.query<PedidoRow>(
            `INSERT INTO pedidos_itens (compra_id, produto_id, quantidade)
             VALUES ($1, $2, $3)
             RETURNING *;`,
            [compraId, produtoId, quantidade]
        );
    }
    async criarCompra(client: PoolClient, usuarioId: number, total: number): Promise<PedidoRow> {

        const { rows } = await client.query<PedidoRow>(
            `INSERT INTO pedidos (usuario_id, total, status)
             VALUES ($1, $2, 'PENDENTE')
             RETURNING *;`,
            [usuarioId, total]
        );

        const pedido = rows[0];
        if (!pedido) {
            throw new Error('Failed to create pedido');
        }

        return pedido;
    }

    async carregarEstoque(produtoId: number, quantidade: number) {
        // Lógica para carregar o estoque do produto no banco de dados
        const { rows } = await pool.query<{ estoque: number }>(
            `SELECT estoque FROM produtos WHERE id = $1;`,
            [produtoId]
        );

        const produto = rows[0];
        if (!produto) {
            throw new Error('Produto não encontrado');
        }
        return produto.estoque; // Retorna a quantidade disponível em estoque
    }

    async finalizarCompra(usuarioId: number) {
        // Lógica para finalizar a compra no banco de dados
        return { message: "Compra finalizada com sucesso" };
    }

    async atualizarEstoque(client: PoolClient, produtoId: number, quantidade: number) {

        // Lógica para atualizar o estoque do produto no banco de dados
        return { message: "Estoque atualizado com sucesso" };
    }

}

export default new ComprasRepository();