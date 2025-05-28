export interface ValidationResult {
  url: string;
  isValid: boolean;
  isAccessible: boolean;
  reason?: string;
}

export class SourceValidator {
  private blacklist = new Set([
    'example.com',
    'test.com',
    'localhost',
    'placeholder.com',
    '127.0.0.1',
    'fake-site.com'
  ]);

  async validate(url: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      url,
      isValid: false,
      isAccessible: false,
    };

    try {
      // 1. Validar formato da URL
      const urlObj = new URL(url);

      // 2. Verificar blacklist
      if (this.blacklist.has(urlObj.hostname)) {
        result.reason = 'Domain is blacklisted';
        return result;
      }

      // 3. Verificar protocolo
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        result.reason = 'Invalid protocol';
        return result;
      }

      // 4. Verificar acessibilidade (HEAD request com timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'ExpertPlanner/1.0'
          }
        });

        clearTimeout(timeoutId);

        result.isAccessible = response.ok;
        result.isValid = response.ok;

        if (!response.ok) {
          result.reason = `HTTP ${response.status}`;
        }
      } catch (fetchError) {
        result.reason = 'Not accessible';
      }

      return result;

    } catch (error) {
      result.reason = 'Invalid URL format';
      return result;
    }
  }

  async validateBatch(urls: string[]): Promise<ValidationResult[]> {
    // Validar em paralelo mas com limite de concorrência
    const results: ValidationResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.validate(url))
      );
      results.push(...batchResults);
    }

    return results;
  }
}

export const sourceValidator = new SourceValidator();