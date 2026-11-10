import type { RequestHandler } from 'express';
import redisClient from '../config/redisClient';

const appName = process.env.REDIS_NAME || 'ecommerce';

const cacheMiddleware = (resource: string, ttlSeconds = 300): RequestHandler => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            next();
            return;
        }

        try {
            const version = (await redisClient.get(`cache:${appName}:${resource}:version`)) || '1';
            const key = `cache:${appName}:${resource}:v${version}:${req.originalUrl}`;
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                console.log(`[Cache HIT] ${key}`);
                res.json(JSON.parse(cachedData));
                return;
            }

            console.log(`[Cache MISS] ${key}`);
            const originalJson = res.json.bind(res);

            res.json = (data: unknown) => {
                if (res.statusCode === 200) {
                    void redisClient.setEx(key, ttlSeconds, JSON.stringify(data))
                        .catch((error: Error) => console.error('Erro ao salvar no cache:', error));
                }

                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Erro no middleware de cache:', error);
            next();
        }
    };
};

export default cacheMiddleware;
