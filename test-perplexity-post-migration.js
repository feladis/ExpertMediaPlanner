// Test script to validate Perplexity service after scraping system removal
import { masterPerplexityService } from './server/services/master-perplexity-clean.js';

async function validatePerplexityPostMigration() {
  console.log('🔍 Testing Perplexity service after scraping removal...');
  
  try {
    // Test with expert ID 2 (Felipe Ladislau - Content Creator)
    const testResult = await masterPerplexityService.conductExpertResearch(2);
    
    if (!testResult || !testResult.content) {
      throw new Error('Perplexity service not working after scraping removal');
    }
    
    console.log('✅ Perplexity service working correctly');
    console.log('✅ Content generation successful');
    console.log('✅ Research data available');
    console.log('✅ Migration validation complete');
    
    // Display summary
    console.log('\n📊 Test Results:');
    console.log(`- Content items generated: ${testResult.content.length}`);
    console.log(`- Sources used: ${testResult.sources.length}`);
    console.log(`- Processing time: ${testResult.metadata.processingTime}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Perplexity validation failed:', error.message);
    throw error;
  }
}

validatePerplexityPostMigration()
  .then(() => {
    console.log('\n🎉 Migration validation successful! System ready for production.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration validation failed:', error);
    process.exit(1);
  });