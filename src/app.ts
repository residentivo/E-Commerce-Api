import express from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { RedisStore } from 'rate-limit-redis';
import redisClient from './config/redisClient';
import healthRoutes from './routes/healthRoutes';
import productRoutes from './routes/produtoRoutes';
import carrinhoRoutes from './routes/carrinhoRoutes';
import compraRoutes from './routes/compraRoutes';



function readPositiveInteger(name: string, defaultValue: number): number {
    const rawValue = process.env[name];
    const value = rawValue === undefined ? defaultValue : Number(rawValue);

    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`A variável ${name} deve ser um inteiro positivo.`);
    }

    return value;
}

const app = express();

const limiter = rateLimit({
    windowMs: readPositiveInteger('RATE_LIMIT_WINDOW', 15 * 60 * 1000),
    max: readPositiveInteger('RATE_LIMIT_MAX', 100),
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
});

app.use(limiter);
app.use(morgan(process.env.ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use('/health', healthRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/carrinho', carrinhoRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
