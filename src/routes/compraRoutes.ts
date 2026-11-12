import { Router } from 'express';
import comprasController from '../controllers/comprasController';


const router = Router();

router.post('/', (req, res, next) => comprasController.create(req, res, next));

export default router;