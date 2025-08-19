// Test per identificare il problema TanStack
const puppeteer = require('puppeteer');

async function testTanStackIssue() {
  let browser;
  try {
    console.log('🚀 Avviando test TanStack issue...');
    
    browser = await puppeteer.launch({ 
      headless: false, 
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Cattura errori console
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      console.log(`📝 Console [${msg.type()}]:`, text);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.log('🚫 Request Failed:', request.url(), request.failure()?.errorText);
    });
    
    // Naviga alla pagina companies
    console.log('🌐 Navigando a http://localhost:5173/companies');
    await page.goto('http://localhost:5173/companies', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Aspetta un po' per il caricamento
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Cerca il testo "TanStack" nella pagina
    console.log('🔍 Cercando "TanStack" nella pagina...');
    const tanstackElements = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const results = [];
      let node;
      
      while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.toLowerCase().includes('tanstack')) {
          results.push({
            text: node.textContent,
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className,
            parentId: node.parentElement?.id
          });
        }
      }
      
      return results;
    });
    
    if (tanstackElements.length > 0) {
      console.log('🎯 TROVATO "TanStack" nella pagina:');
      tanstackElements.forEach((element, index) => {
        console.log(`  ${index + 1}. Testo: "${element.text}"`);
        console.log(`     Parent: <${element.parentTag}> class="${element.parentClass}" id="${element.parentId}"`);
      });
    } else {
      console.log('✅ Nessun riferimento a "TanStack" trovato nella pagina');
    }
    
    // Verifica se ci sono React Query DevTools visibili
    console.log('🔧 Verificando presenza React Query DevTools...');
    const devToolsVisible = await page.evaluate(() => {
      // Cerca elementi che potrebbero essere i DevTools
      const devToolsSelectors = [
        '[data-testid="react-query-devtools"]',
        '.react-query-devtools',
        '[class*="react-query"]',
        '[class*="tanstack"]',
        '[id*="react-query"]',
        '[id*="tanstack"]'
      ];
      
      const found = [];
      devToolsSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          found.push({
            selector,
            count: elements.length,
            visible: Array.from(elements).some(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden';
            })
          });
        }
      });
      
      return found;
    });
    
    if (devToolsVisible.length > 0) {
      console.log('🔧 DevTools trovati:');
      devToolsVisible.forEach(tool => {
        console.log(`  - ${tool.selector}: ${tool.count} elementi, visibili: ${tool.visible}`);
      });
    } else {
      console.log('✅ Nessun DevTools visibile');
    }
    
    // Verifica il contenuto della tabella companies
    console.log('📊 Verificando contenuto tabella companies...');
    const tableContent = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return { found: false };
      
      const rows = Array.from(table.querySelectorAll('tr'));
      const content = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        return cells.map(cell => cell.textContent?.trim() || '').join(' | ');
      });
      
      return {
        found: true,
        rowCount: rows.length,
        content: content.slice(0, 5) // Prime 5 righe
      };
    });
    
    if (tableContent.found) {
      console.log(`📊 Tabella trovata con ${tableContent.rowCount} righe:`);
      tableContent.content.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row}`);
      });
    } else {
      console.log('❌ Nessuna tabella trovata');
    }
    
    // Verifica errori JavaScript
    if (errors.length > 0) {
      console.log('❌ Errori JavaScript trovati:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Verifica messaggi console sospetti
    const suspiciousMessages = consoleMessages.filter(msg => 
      msg.text.toLowerCase().includes('tanstack') || 
      msg.text.toLowerCase().includes('error') ||
      msg.text.toLowerCase().includes('failed')
    );
    
    if (suspiciousMessages.length > 0) {
      console.log('⚠️ Messaggi console sospetti:');
      suspiciousMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.type}] ${msg.text}`);
      });
    }
    
    // Screenshot per debug
    await page.screenshot({ path: 'companies_page_debug.png', fullPage: true });
    console.log('📸 Screenshot salvato come companies_page_debug.png');
    
    console.log('✅ Test completato');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Avvia il test
testTanStackIssue();