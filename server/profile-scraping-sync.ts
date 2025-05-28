import { storage } from './storage';
import { InsertScrapingTarget } from '@shared/schema';

export class ProfileScrapingSync {
  /**
   * Syncs all expert profiles' information sources to scraping targets
   */
  async syncAllExpertSources(): Promise<void> {
    console.log('Syncing scraping targets for all experts...');
    
    // For now, we'll focus on the current expert (ID 2)
    await this.syncExpertSources(2);
  }

  /**
   * Syncs a specific expert's information sources to scraping targets
   */
  async syncExpertSources(expertId: number): Promise<void> {
    console.log(`Syncing scraping targets for expert ${expertId}...`);
    
    const profile = await storage.getExpertProfile(expertId);
    if (!profile || !profile.informationSources) {
      console.log('No profile or information sources found');
      return;
    }

    for (const source of profile.informationSources) {
      if (source.url && this.isValidUrl(source.url)) {
        await this.createOrUpdateScrapingTarget(source.url, source.name);
      }
    }
  }

  /**
   * Creates or updates a scraping target for a given URL
   */
  private async createOrUpdateScrapingTarget(url: string, sourceName: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const newTarget: InsertScrapingTarget = {
        domain: urlObj.hostname,
        baseUrl: url,
        isActive: true,
        scrapingFrequency: 24, // 24 hours = daily
        lastScrapedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await storage.createScrapingTarget(newTarget);
      console.log(`Created scraping target for ${sourceName}: ${url}`);
    } catch (error) {
      console.error(`Failed to create scraping target for ${url}:`, error);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export const profileScrapingSync = new ProfileScrapingSync();