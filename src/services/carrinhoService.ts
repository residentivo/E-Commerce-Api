import { Router, type RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/errors.js';
import type { AdicionarItemBody, RemoverItemBody } from '../models/types.js';
import carrinhoRepository from '../repositories/carrinhoRepository.js';

class CarrinhoService {
    async montarCarrinho(id : number) {
        const carrinho = await carrinhoRepository.montarCarrinho(id);
        return carrinho;
    }
    async limparCarrinho(id : number) {
        await carrinhoRepository.limparCarrinho(id);
    }
    async adicionarItem(usuarioId: number, produtoId: number, quantidade: number) {
        const carrinho = await carrinhoRepository.adicionarItem(usuarioId, produtoId, quantidade);
        return carrinho;
    }
    async removerItem(usuarioId: number, produtoId: number) {
        const carrinho = await carrinhoRepository.removerItem(usuarioId, produtoId);
        return carrinho;
    }
}

export default new CarrinhoService();
