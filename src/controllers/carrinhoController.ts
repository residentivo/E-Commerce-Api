import { NextFunction, Request, Response } from "express";
import carrinhoService from "../services/carrinhoService";
import { AdicionarItemBody, RemoverItemBody } from "../models/types";
import { HttpError } from "../utils/errors";

class CarrinhoController {
    async montarCarrinho(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const carrinho = await carrinhoService.montarCarrinho(this.get_UsarioIdFromRequest(req));
            res.status(201).json(carrinho);
        } catch (error) {
            next(error);
        }
    }
    async removerCarrinho(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await carrinhoService.limparCarrinho(this.get_UsarioIdFromRequest(req));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
    async adicionarItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const body = req.body as AdicionarItemBody;
            if (typeof body.produto_id !== 'number') {
                throw new HttpError(400, 'produto_id é obrigatório');
            }

            const quantidade = body.quantidade ?? 1;

            const carrinho = await carrinhoService.adicionarItem(this.get_UsarioIdFromRequest(req), body.produto_id, quantidade);

            res.status(201).json(carrinho);
        } catch (error) {
            next(error);
        }
    }
    async removeritem(req: Request, res: Response, next: NextFunction): Promise<void> {
        const body = req.body as RemoverItemBody;
        if (typeof body.produto_id !== 'number') {
            throw new HttpError(400, 'produto_id é obrigatório');
        }


        res.json(await carrinhoService.removerItem(this.get_UsarioIdFromRequest(req), body.produto_id))
    }

    get_UsarioIdFromRequest(req: Request): number {
        const usuarioId = Number(req.get("x-usuario-id"));
        if (!usuarioId || isNaN(usuarioId)) {
            throw new Error("Usuário não autenticado");
        }
        return usuarioId;
    }
}

export default new CarrinhoController();
