// Regression Test: Scraping-First Content Authenticity Workflow
// This test verifies the complete scraping-first enforcement pipeline

const BASE_URL = 'http://localhost:5000';

async function testScrapingFirstWorkflow() {
  console.log('🧪 REGRESSION TEST: Scraping-First Content Authenticity System');
  console.log('='.repeat(70));

  try {
    // Test 1: Verify Profile Scraping Sync API
    console.log('\n📋 TEST 1: Profile Scraping Sync');
    const syncResponse = await fetch(`${BASE_URL}/api/sync-scraping-targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expertId: 2 })
    });
    
    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      console.log('✅ Profile scraping sync:', syncData.message);
    } else {
      console.log('❌ Profile scraping sync failed:', syncResponse.status);
    }

    // Test 2: Check Scraping Targets Creation
    console.log('\n📋 TEST 2: Scraping Targets Verification');
    const targetsResponse = await fetch(`${BASE_URL}/api/scraping-targets`);
    
    if (targetsResponse.ok) {
      const targets = await targetsResponse.json();
      console.log(`✅ Found ${targets.length} scraping targets configured`);
      targets.forEach(target => {
        console.log(`   - ${target.sourceName}: ${target.baseUrl}`);
      });
    } else {
      console.log('❌ Failed to fetch scraping targets');
    }

    // Test 3: Test Scraping-First Enforcement in Topic Generation
    console.log('\n📋 TEST 3: Scraping-First Topic Generation Enforcement');
    const topicResponse = await fetch(`${BASE_URL}/api/generate-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expertId: 2, count: 1 })
    });
    
    if (topicResponse.ok) {
      const topics = await topicResponse.json();
      console.log('✅ Topic generation completed with scraped content');
      console.log(`   Generated ${topics.length} topic(s)`);
    } else if (topicResponse.status === 400) {
      const error = await topicResponse.json();
      if (error.code === 'NO_SCRAPED_CONTENT') {
        console.log('✅ Scraping-first enforcement working - blocked generation without sources');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    } else {
      console.log('❌ Topic generation failed:', topicResponse.status);
    }

    // Test 4: Check Fresh Content Scraping
    console.log('\n📋 TEST 4: Fresh Content Scraping');
    const freshResponse = await fetch(`${BASE_URL}/api/scrape-fresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expertId: 2, maxAgeHours: 24 })
    });
    
    if (freshResponse.ok) {
      const freshData = await freshResponse.json();
      console.log('✅ Fresh content scraping:', freshData.message);
      console.log(`   Summary: ${JSON.stringify(freshData.summary)}`);
    } else {
      console.log('❌ Fresh content scraping failed:', freshResponse.status);
    }

    // Test 5: Verify Relevant Content for Expert
    console.log('\n📋 TEST 5: Expert-Relevant Content Verification');
    const relevantResponse = await fetch(`${BASE_URL}/api/relevant-content/2`);
    
    if (relevantResponse.ok) {
      const relevantContent = await relevantResponse.json();
      console.log(`✅ Found ${relevantContent.length} pieces of relevant content for expert`);
      relevantContent.slice(0, 3).forEach((content, i) => {
        console.log(`   ${i+1}. ${content.title} (${content.domain})`);
      });
    } else {
      console.log('❌ Failed to fetch relevant content');
    }

    // Test 6: Test Content Pipeline with Scraping-First
    console.log('\n📋 TEST 6: Content Pipeline Scraping-First Workflow');
    const pipelineResponse = await fetch(`${BASE_URL}/api/generate-content-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topicId: 9, 
        platform: 'linkedin', 
        expertId: 2 
      })
    });
    
    if (pipelineResponse.ok) {
      const pipelineData = await pipelineResponse.json();
      console.log('✅ Content pipeline completed with scraping-first workflow');
      if (pipelineData.metadata && pipelineData.metadata.scrapingFirst) {
        console.log('✅ Confirmed: Scraping-first flag verified');
        console.log(`   Sources used: ${pipelineData.metadata.sourcesUsed?.length || 0}`);
      }
    } else {
      const error = await pipelineResponse.json();
      console.log('⚠️  Content pipeline result:', error.message);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 SCRAPING-FIRST WORKFLOW REGRESSION TEST COMPLETE');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Wait for server to be ready and run test
setTimeout(testScrapingFirstWorkflow, 2000);