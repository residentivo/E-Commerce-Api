import 'dotenv/config';
import app from './app';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
    throw new Error('A variável PORT deve ser um inteiro entre 1 e 65535.');
}

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
