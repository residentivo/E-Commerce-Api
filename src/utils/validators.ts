import type { ProductPayload } from '../models/types';

export const VALIDATION_ERROR = 'VALIDATION_ERROR';

export class ValidationError extends Error {
    readonly details: string[];

    constructor(details: string[]) {
        super('Dados inválidos');
        this.name = VALIDATION_ERROR;
        this.details = details;
    }
}

export function validateProductPayload(payload: unknown): asserts payload is ProductPayload {
    const errors: string[] = [];
    const value = typeof payload === 'object' && payload !== null
        ? payload as Record<string, unknown>
        : {};
    const { name, price, stock } = value;

    if (typeof name !== 'string' || name.trim().length < 3) {
        errors.push('O campo "name" é obrigatório e deve ter ao menos 3 caracteres.');
    }

    if (typeof price !== 'number' || price < 0 || !Number.isFinite(price)) {
        errors.push('O campo "price" é obrigatório e deve ser um número maior ou igual a zero.');
    }

    if (stock !== undefined && (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0)) {
        errors.push('O campo "stock" deve ser um número inteiro maior ou igual a zero.');
    }

    if (value.description !== undefined && value.description !== null && typeof value.description !== 'string') {
        errors.push('O campo "description" deve ser uma string ou nulo.');
    }

    if (errors.length > 0) {
        throw new ValidationError(errors);
    }
}
