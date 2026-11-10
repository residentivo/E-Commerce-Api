import { pool, query } from '../config/database.js';
import { HttpError } from '../utils/errors.js';
import type {
    CarrinhoDTO,
    CarrinhoRow,
    ItemCarrinhoRow,
} from '../models/types.js';

class CarrinhoRepository {
    /** Retorna o carrinho do usuário, criando se não existir. */
    async obterOuCriarCarrinho(usuarioId: number): Promise<CarrinhoRow> {
        const { rows } = await query<CarrinhoRow>(
            `INSERT INTO carrinhos (usuario_id)
     VALUES ($1)
     ON CONFLICT (usuario_id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
     RETURNING id, usuario_id`,
            [usuarioId]
        );
        const row = rows[0];
        if (!row) throw new HttpError(500, 'Falha ao obter carrinho');
        return row;
    }

    /** Monta a visão do carrinho com itens, subtotais e total. */
    async montarCarrinho(usuarioId: number): Promise<CarrinhoDTO> {
        const carrinho = await this.obterOuCriarCarrinho(usuarioId);

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
            usuarioId: usuarioId,
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
    async adicionarItem(usuarioId: number, produtoId: number, quantidade: number): Promise<CarrinhoDTO> {
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
                `INSERT INTO carrinhos (usuario_id)
       VALUES ($1)
       ON CONFLICT (usuario_id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
       RETURNING id`,
                [usuarioId]
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

        return this.montarCarrinho(usuarioId);
    }

    /** Remove um item (ou reduz quantidade, se informada). */
    async removerItem(usuarioId: number, produtoId: number): Promise<CarrinhoDTO> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const carrRes = await client.query<{ id: number }>(
                'SELECT id FROM carrinhos WHERE usuario_id = $1',
                [usuarioId]
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

        return this.montarCarrinho(usuarioId);
    }

    /** Esvazia o carrinho. */
    async limparCarrinho(usuarioId: number): Promise<CarrinhoDTO> {
        await query(
            `DELETE FROM carrinho_itens ci
      USING carrinhos c
      WHERE ci.carrinho_id = c.id AND c.usuario_id = $1`,
            [usuarioId]
        );
        return this.montarCarrinho(usuarioId);
    }
}

export default new CarrinhoRepository();
