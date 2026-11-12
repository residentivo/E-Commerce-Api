import { pool, query } from '../config/database.js';
import { HttpError } from '../utils/errors.js';
import type {
    CarrinhoDTO,
    CarrinhoRow,
    ItemCarrinhoRow,
} from '../models/types.js';
import client from '../config/redisClient.js';
import { PoolClient } from 'pg';

class CarrinhoRepository {
    /** Retorna o carrinho do usuário, criando se não existir. */
    async obterOuCriarCarrinho(clienteId: number): Promise<CarrinhoRow> {
        const { rows } = await query<CarrinhoRow>(
            `INSERT INTO carrinhos (cliente_id, status)
     VALUES ($1, 'ABERTO')
     ON CONFLICT (cliente_id) DO UPDATE SET cliente_id = EXCLUDED.cliente_id
     RETURNING id, cliente_id, status`,
            [clienteId]
        );
        const row = rows[0];
        if (!row) throw new HttpError(500, 'Falha ao obter carrinho');
        return row;
    }

    /** Monta a visão do carrinho com itens, subtotais e total. */
    async montarCarrinho(clienteId: number): Promise<CarrinhoDTO> {
        const carrinho = await this.obterOuCriarCarrinho(clienteId);

        const { rows } = await query<ItemCarrinhoRow>(
            `SELECT ci.produto_id,
            p.nome,
            p.preco,
            ci.quantidade,
            (p.preco * ci.quantidade)::int AS subtotal
       FROM carrinho_itens ci
       JOIN produtos p ON p.id = ci.produto_id
      WHERE ci.carrinho_id = $1
      ORDER BY ci.id`,
            [carrinho.id]
        );

        const totalCentavos = rows.reduce((acc, i) => acc + i.subtotal, 0);

        return {
            clienteId: clienteId,
            status: carrinho.status,
            itens: rows.map((i) => ({
                produtoId: i.produto_id,
                nome: i.nome,
                preco: i.preco / 100,
                quantidade: i.quantidade,
                subtotal: i.subtotal / 100,
            })),
            total: totalCentavos / 100,
        };
    }

    /** Adiciona quantidade de um produto ao carrinho. */
    async adicionarItem(clienteId: number, produtoId: number, quantidade: number): Promise<CarrinhoDTO> {
        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new HttpError(400, 'Quantidade deve ser inteiro positivo');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const prodRes = await client.query<{ id: number; estoque: number }>(
                'SELECT id, estoque FROM produtos WHERE id = $1 FOR UPDATE',
                [produtoId]
            );
            const produto = prodRes.rows[0];
            if (!produto) {
                throw new HttpError(404, 'Produto não encontrado');
            }

            const carrRes = await client.query<{ id: number }>(
                `INSERT INTO carrinhos (cliente_id)
       VALUES ($1)
       ON CONFLICT (cliente_id) DO UPDATE SET cliente_id = EXCLUDED.cliente_id
       RETURNING id`,
                [clienteId]
            );
            const carrinhoId = carrRes.rows[0]?.id;
            if (!carrinhoId) throw new HttpError(500, 'Falha ao criar carrinho');

            const atualRes = await client.query<{ quantidade: number }>(
                'SELECT quantidade FROM carrinho_itens WHERE carrinho_id = $1 AND produto_id = $2',
                [carrinhoId, produtoId]
            );
            const jaNoCarrinho = atualRes.rows[0]?.quantidade ?? 0;

            if (jaNoCarrinho + quantidade > produto.estoque) {
                throw new HttpError(
                    400,
                    `Estoque insuficiente (disponível: ${produto.estoque - jaNoCarrinho})`
                );
            }

            await client.query(
                `INSERT INTO carrinho_itens (carrinho_id, produto_id, quantidade)
       VALUES ($1, $2, $3)
       ON CONFLICT (carrinho_id, produto_id)
       DO UPDATE SET quantidade = carrinho_itens.quantidade + EXCLUDED.quantidade`,
                [carrinhoId, produtoId, quantidade]
            );

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return this.montarCarrinho(clienteId);
    }

    /** Remove um item (ou reduz quantidade, se informada). */
    async removerItem(clienteId: number, produtoId: number): Promise<CarrinhoDTO> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const carrRes = await client.query<{ id: number }>(
                'SELECT id FROM carrinhos WHERE cliente_id = $1',
                [clienteId]
            );
            const carrinhoId = carrRes.rows[0]?.id;
            if (!carrinhoId) {
                throw new HttpError(400, 'Carrinho não encontrado');
            }
            const itemRes = await client.query<{ id: number; quantidade: number }>(
                'SELECT id, quantidade FROM carrinho_itens WHERE carrinho_id = $1 AND produto_id = $2 FOR UPDATE',
                [carrinhoId, produtoId]
            );
            const item = itemRes.rows[0];
            if (!item) {
                throw new HttpError(400, 'Produto não está no carrinho');
            }

            await client.query('DELETE FROM carrinho_itens WHERE id = $1', [item.id]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return this.montarCarrinho(clienteId);
    }

    /** Esvazia o carrinho. */
    async limparCarrinho(clienteId: number, client?: PoolClient): Promise<CarrinhoDTO> {
        const carrinhoClient = client || await pool.connect();

        await carrinhoClient.query(
            `DELETE FROM carrinho_itens ci
          USING carrinhos c
          WHERE ci.carrinho_id = c.id AND c.cliente_id = $1`,
            [clienteId]
        );

        return this.mudarStatusCarrinho(clienteId, 'ABERTO');
    }

    /** Muda o status do carrinho (ex: FECHADO). */
    async mudarStatusCarrinho(clienteId: number, status: string): Promise<CarrinhoDTO> {
        const carrRes = await pool.query<{ id: number }>(
            'SELECT id FROM carrinhos WHERE cliente_id = $1',
            [clienteId]
        );
        const carrinhoId = carrRes.rows[0]?.id;
        if (!carrinhoId) {
            throw new HttpError(400, 'Carrinho não encontrado');
        }

        await pool.query('UPDATE carrinhos SET status = $1 WHERE id = $2', [status, carrinhoId]);

        return this.montarCarrinho(clienteId);
    }
}

export default new CarrinhoRepository();
