import produtoRepository from '../repositories/produtoRepository';
import redisClient from '../config/redisClient';
import { validateProductPayload} from '../utils/validators';
import type { ProductPayload } from '../models/types';

const appName = process.env.REDIS_NAME || 'ecommerce';

class ProdutoService {
    async createProduct(payload: unknown) {
        validateProductPayload(payload);
        const productData = this.toProductData(payload);
        const createdProduct = await produtoRepository.create(productData);
        await redisClient.incr(`cache:${appName}:products:version`);
        return createdProduct;
    }

    async getAllProducts() {
        return produtoRepository.findAll();
    }

    async getProductById(id: number) {
        const product = await produtoRepository.findById(id);
        if (!product) {
            throw this.buildNotFoundError();
        }
        return product;
    }

    async updateProduct(id: number, payload: unknown) {
        validateProductPayload(payload);
        const productData = this.toProductData(payload);
        const updatedProduct = await produtoRepository.update(id, productData);

        if (!updatedProduct) {
            throw this.buildNotFoundError();
        }

        await redisClient.incr(`cache:${appName}:products:version`);
        return updatedProduct;
    }

    async deleteProduct(id: number) {
        const wasDeleted = await produtoRepository.delete(id);

        if (!wasDeleted) {
            throw this.buildNotFoundError();
        }

        await redisClient.incr(`cache:${appName}:products:version`);
    }

    private toProductData(payload: ProductPayload): ProductPayload & { description: string; stock: number } {
        return {
            name: payload.name.trim(),
            description: payload.description ?? '',
            price: payload.price,
            stock: payload.stock ?? 0,
        };
    }

    private buildNotFoundError(): Error {
        const error = new Error('Produto não encontrado');
        error.name = 'NOT_FOUND_ERROR';
        return error;
    }
}

export default new ProdutoService();
