import type { NextFunction, Request, Response } from 'express';
import comprasService from '../services/comprasService';

class ComprasController {
 async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const usuarioId = this.get_UsarioIdFromRequest(req);
            console.log("UsuarioId: ", usuarioId);
            const product = await comprasService.finalizarCarrinho(usuarioId);
            res.status(201).json(product);
        } catch (error) {
            next(error);
        }
    }
        get_UsarioIdFromRequest(req: Request): number {
        const usuarioId = Number(req.get("x-usuario-id"));
        if (!usuarioId || isNaN(usuarioId)) {
            throw new Error("Usuário não autenticado");
        }
        return usuarioId;
    }
}

export default new ComprasController();

