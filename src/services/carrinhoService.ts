
import carrinhoRepository from '../repositories/carrinhoRepository.js';

class CarrinhoService {
    async montarCarrinho(id : number) {
        let carrinho = await carrinhoRepository.montarCarrinho(id);
        if(carrinho.status === 'FECHADO'){
            carrinho = await carrinhoRepository.mudarStatusCarrinho(id, 'FECHADO');
            throw new Error("Carrinho fechado");
        }
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
    async fecharCarrinho(usuarioId: number) {
        const carrinho = await carrinhoRepository.mudarStatusCarrinho(usuarioId, 'FECHADO');
        if (carrinho.itens.length === 0) {
            throw new Error("Carrinho vazio");
        }
        return carrinho;
    }
}

export default new CarrinhoService();
