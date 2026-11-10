import type { NextFunction, Request, Response } from 'express';
import productService from '../services/produtoService';

class ProductController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productService.createProduct(req.body);
            res.status(201).json(product);
        } catch (error) {
            next(error);
        }
    }

    async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const products = await productService.getAllProducts();
            res.json(products);
        } catch (error) {
            next(error);
        }
    }

    async show(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productService.getProductById(Number(req.params.id));
            res.json(product);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const product = await productService.updateProduct(Number(req.params.id), req.body);
            res.json(product);
        } catch (error) {
            next(error);
        }
    }

    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await productService.deleteProduct(Number(req.params.id));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new ProductController();
