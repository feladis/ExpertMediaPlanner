export class SimpleRateLimiter {
  private lastRequestTime = 0;
  private requestCount = 0;
  private resetTime = 0;

  // Configuração conservadora para começar
  private readonly MAX_REQUESTS_PER_MINUTE = 20;
  private readonly MIN_INTERVAL_MS = 3000; // 3 segundos entre requests

  async throttle(): Promise<void> {
    const now = Date.now();

    // Reset contador a cada minuto
    if (now - this.resetTime > 60000) {
      this.requestCount = 0;
      this.resetTime = now;
    }

    // Verificar limite por minuto
    if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.resetTime);
      console.log(`Rate limit reached. Waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.resetTime = Date.now();
    }

    // Verificar intervalo mínimo
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_INTERVAL_MS) {
      const waitTime = this.MIN_INTERVAL_MS - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}