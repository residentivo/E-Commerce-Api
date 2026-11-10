import { pool } from '../config/database';
import type { ProductPayload } from '../models/types';

export interface ProductRecord {
    id: number;
    nome: string;
    descricao: string;
    preco: string;
    estoque: number;
    created_at: Date;
    updated_at: Date;
}

type ProductData = ProductPayload & { description: string; stock: number };

class ProdutoRepository {
    async create({ name, description, price, stock }: ProductData): Promise<ProductRecord> {
        const { rows } = await pool.query<ProductRecord>(
            `INSERT INTO produtos (nome, descricao, preco, estoque)
             VALUES ($1, $2, $3, $4)
             RETURNING *;`,
            [name, description, price, stock],
        );

        const product = rows[0];
        if (!product) {
            throw new Error('Failed to create product');
        }

        return product;
    }

    async findAll(): Promise<ProductRecord[]> {
        const { rows } = await pool.query<ProductRecord>('SELECT * FROM produtos ORDER BY id ASC;');
        return rows;
    }

    async findById(id: number): Promise<ProductRecord | null> {
        const { rows } = await pool.query<ProductRecord>(
            'SELECT * FROM produtos WHERE id = $1;',
            [id],
        );
        return rows[0] ?? null;
    }

    async update(id: number, { name, description, price, stock }: ProductData): Promise<ProductRecord | null> {
        const { rows } = await pool.query<ProductRecord>(
            `UPDATE produtos
             SET nome = $1, descricao = $2, preco = $3, estoque = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *;`,
            [name, description, price, stock, id],
        );
        return rows[0] ?? null;
    }

    async delete(id: number): Promise<boolean> {
        const { rowCount } = await pool.query(
            'DELETE FROM produtos WHERE id = $1;',
            [id],
        );
        return (rowCount ?? 0) > 0;
    }
}

export default new ProdutoRepository();
