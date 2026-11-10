import { Router } from 'express';
import productController from '../controllers/produtoController';
import cacheMiddleware from '../middlewares/cacheMiddleware';

const router = Router();

router.post('/', (req, res, next) => productController.create(req, res, next));
router.get('/', cacheMiddleware('products', 300), (req, res, next) => productController.list(req, res, next));
router.get('/:id', cacheMiddleware('products', 300), (req, res, next) => productController.show(req, res, next));
router.put('/:id', (req, res, next) => productController.update(req, res, next));
router.delete('/:id', (req, res, next) => productController.remove(req, res, next));

export default router;
