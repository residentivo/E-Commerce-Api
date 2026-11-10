import { pool } from '../config/database';  

class HealthController {
  
  // Liveness: apenas verifica se o processo está de pé.
  liveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  // Readiness: verifica a dependência crítica (banco).
  async readiness() {
    const start = Date.now();
    try {
      // Consulta mínima para validar a conexão.
      await pool.query('SELECT 1');
      return {
        status: 'healthy',
        database: 'up',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'down',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        // Evite expor detalhes do erro em produção.
      };
    }
  }
}

export default new HealthController();
