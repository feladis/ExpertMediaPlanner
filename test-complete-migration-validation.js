/**
 * ✅ VALIDAÇÃO COMPLETA PÓS-MIGRAÇÃO
 * Verifica que o sistema de scraping foi completamente removido
 * e que o sistema Perplexity está funcionando corretamente
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function validateCompleteMigration() {
  console.log('🔍 INICIANDO VALIDAÇÃO COMPLETA PÓS-MIGRAÇÃO...\n');

  const results = {
    databaseCleanup: false,
    codeCleanup: false,
    testsUpdated: false,
    systemIntegrity: false,
    perplexityReady: false
  };

  try {
    // 1. Verificar remoção completa das tabelas
    console.log('1️⃣ Verificando limpeza do banco de dados...');
    const { stdout: dbCheck } = await execAsync(`
      export DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
      psql $DATABASE_URL -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('scraped_content', 'scraping_targets', 'expert_content_relevance');
      "
    `);
    
    const tableCount = parseInt(dbCheck.trim());
    results.databaseCleanup = tableCount === 0;
    console.log(`   📊 Tabelas de scraping encontradas: ${tableCount}`);
    console.log(`   ${results.databaseCleanup ? '✅' : '❌'} Limpeza do banco: ${results.databaseCleanup ? 'SUCESSO' : 'FALHOU'}\n`);

    // 2. Verificar remoção de código obsoleto
    console.log('2️⃣ Verificando limpeza do código...');
    const scrapingReferences = [
      'server/scraping.ts',
      'server/scraping-service.ts',
      'server/web-scraper.ts'
    ];
    
    let obsoleteFiles = 0;
    for (const file of scrapingReferences) {
      if (fs.existsSync(file)) {
        obsoleteFiles++;
        console.log(`   ❌ Arquivo obsoleto encontrado: ${file}`);
      }
    }
    
    results.codeCleanup = obsoleteFiles === 0;
    console.log(`   ${results.codeCleanup ? '✅' : '❌'} Limpeza de código: ${results.codeCleanup ? 'SUCESSO' : 'FALHOU'}\n`);

    // 3. Verificar atualização dos testes
    console.log('3️⃣ Verificando atualização dos testes...');
    const testFiles = ['tests/storage.test.ts', 'tests/regression-suite.test.ts'];
    let testsValid = true;
    
    for (const testFile of testFiles) {
      if (fs.existsSync(testFile)) {
        const content = fs.readFileSync(testFile, 'utf8');
        if (content.includes('getScrapedContent') || content.includes('WebScraper')) {
          console.log(`   ❌ Teste obsoleto encontrado em: ${testFile}`);
          testsValid = false;
        }
      }
    }
    
    results.testsUpdated = testsValid;
    console.log(`   ${results.testsUpdated ? '✅' : '❌'} Testes atualizados: ${results.testsUpdated ? 'SUCESSO' : 'FALHOU'}\n`);

    // 4. Verificar integridade do sistema
    console.log('4️⃣ Verificando integridade do sistema...');
    try {
      await execAsync('npm run build', { cwd: process.cwd() });
      results.systemIntegrity = true;
      console.log('   ✅ Build do sistema: SUCESSO\n');
    } catch (error) {
      console.log('   ❌ Build do sistema: FALHOU');
      console.log(`   Erro: ${error.message}\n`);
    }

    // 5. Verificar se Perplexity está pronto
    console.log('5️⃣ Verificando prontidão do Perplexity...');
    const perplexityFiles = [
      'server/services/master-perplexity-clean.ts',
      'server/services/perplexity.ts',
      'server/perplexity-routes.ts'
    ];
    
    let perplexityReady = true;
    for (const file of perplexityFiles) {
      if (!fs.existsSync(file)) {
        console.log(`   ❌ Arquivo Perplexity ausente: ${file}`);
        perplexityReady = false;
      }
    }
    
    results.perplexityReady = perplexityReady;
    console.log(`   ${results.perplexityReady ? '✅' : '❌'} Perplexity pronto: ${results.perplexityReady ? 'SUCESSO' : 'FALHOU'}\n`);

  } catch (error) {
    console.error('❌ Erro durante validação:', error.message);
  }

  // Relatório final
  console.log('📋 RELATÓRIO FINAL DA MIGRAÇÃO:');
  console.log('=====================================');
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅ SUCESSO' : '❌ FALHOU';
    const description = {
      databaseCleanup: 'Limpeza do Banco de Dados',
      codeCleanup: 'Limpeza do Código',
      testsUpdated: 'Atualização dos Testes',
      systemIntegrity: 'Integridade do Sistema', 
      perplexityReady: 'Prontidão do Perplexity'
    };
    console.log(`${status} - ${description[key]}`);
  });

  const allSuccess = Object.values(results).every(result => result);
  console.log('\n🎯 RESULTADO GERAL:');
  console.log(allSuccess ? '🎉 MIGRAÇÃO COMPLETAMENTE CONCLUÍDA!' : '⚠️  MIGRAÇÃO PRECISA DE AJUSTES');
  
  return results;
}

// Executar validação
validateCompleteMigration().catch(console.error);

export { validateCompleteMigration };