import { createClient } from 'redis';

const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (error: Error) => console.error('Erro no Redis:', error));
client.on('connect', async () => {
    try {
        await client.scriptLoad(`
            local totalHits = redis.call("INCR", KEYS[1])
            local timeToExpire = redis.call("PTTL", KEYS[1])
            if timeToExpire <= 0 or ARGV[1] == "1" then
                redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
                timeToExpire = tonumber(ARGV[2])
            end
            return { totalHits, timeToExpire }
        `);
        console.log('Rate limit script loaded successfully');
    } catch (error) {
        console.error('Failed to load rate limit script', error);
    }
});

void client.connect();

export default client;
