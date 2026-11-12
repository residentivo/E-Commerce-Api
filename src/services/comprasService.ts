import { ItemCarrinhoDTO } from "../models/types";
import carrinhoRepository from "../repositories/carrinhoRepository";
import comprasRespository from "../repositories/comprasRespository";
import { transaction } from "../repositories/transactionRepository";
import { HttpError } from "../utils/errors";



class ComprasService {
    async finalizarCarrinho(UsarioId: number) {
        //verificar se tem itens no carrinho
        const carrinho = await carrinhoRepository.montarCarrinho(UsarioId);

        if (carrinho.itens.length === 0) {
            throw new HttpError(400, 'Carrinho vazio');
        }

        const valorTotal = carrinho.itens.reduce((total, item) => total + item.subtotal, 0);

        //comecar a transação
        await transaction(async (client) => {
            const compra = await comprasRespository.criarCompra(client, UsarioId, valorTotal);
            //Verificar se tem estoque suficiente para cada item do carrinho
            for (const item of carrinho.itens) {
                const quantidade = await comprasRespository.carregarEstoque(item.produtoId, item.quantidade);
                if (quantidade < item.quantidade) {
                    throw new Error("Estoque insuficiente");                    
                }
            }
            //Agora que já verificamos o estoque, podemos atualizar o estoque dos produtos e limpar o carrinho
            for (const item of carrinho.itens) {
                await comprasRespository.atualizarEstoque(client, item.produtoId, item.quantidade);
                await comprasRespository.criarItemCompra(client, compra.id, item.produtoId, item.quantidade);
            }
            //limpar o carrinho
            await carrinhoRepository.limparCarrinho(UsarioId, client);
        });

        return { message: "Compra finalizada com sucesso" };
    }

}
export default new ComprasService();