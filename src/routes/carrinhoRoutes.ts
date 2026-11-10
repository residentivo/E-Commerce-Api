import { RequestHandler, Router } from 'express';
import { HttpError } from '../utils/errors';
import carrinhoController from '../controllers/carrinhoController';

const router = Router();

// Middleware de auth fake — troque por JWT depois
const authFake: RequestHandler = (req, _res, next) => {
  const id = Number(req.headers['x-usuario-id'] ?? 1);
  if (!Number.isInteger(id) || id <= 0) {
    return next(new HttpError(401, 'Usuário não autenticado'));
  }
  req.usuarioId = id;
  next();
};

router.use(authFake);

router.get('/', (req, res, next) => carrinhoController.montarCarrinho(req, res, next));
router.delete('/', (req, res, next) => carrinhoController.removerCarrinho(req, res, next));
router.post('/itens', (req, res, next) => carrinhoController.adicionarItem(req, res, next));
router.patch('/itens', (req, res, next) => carrinhoController.removeritem(req, res, next));


export default router;
