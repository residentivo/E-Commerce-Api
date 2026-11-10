import { Router } from 'express';
import HealthController from '../controllers/healthController';
const router = Router();

router.get('/live', (req, res) => {
    res.status(200).json(HealthController.liveness());
});

// Readiness: 200 se o banco estiver OK; 503 caso contrário.
router.get('/ready', async (req, res) => {
    const result = await HealthController.readiness();
    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
});

export default router;
