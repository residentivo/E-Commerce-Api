import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ValidationError } from '../utils/validators';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ValidationError) {
        res.status(400).json({ message: error.message, details: error.details });
        return;
    }

    if (error instanceof Error && error.name === 'NOT_FOUND_ERROR') {
        res.status(404).json({ message: error.message });
        return;
    }

    console.error('[Unhandled Error]', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
};

export const notFoundHandler: RequestHandler = (req, res) => {
    res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
};
