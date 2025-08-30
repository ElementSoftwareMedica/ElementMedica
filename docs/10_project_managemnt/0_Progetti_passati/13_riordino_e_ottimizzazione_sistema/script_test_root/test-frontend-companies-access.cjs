const puppeteer = require('puppeteer');

async function testFrontendCompaniesAccess() {
  console.log('🧪 Testing frontend companies page access...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Mostra il browser per debug
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Abilita console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('🔴 Browser Error:', text);
      } else if (text.includes('🔍') || text.includes('✅') || text.includes('❌')) {
        console.log('🔍 Browser Log:', text);
      }
    });
    
    // Intercetta errori di rete
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`🔴 Network Error: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('\n1. Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    
    console.log('\n2. Performing login...');
    await page.type('input[type="email"]', 'admin@example.com');
    await page.type('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Aspetta il redirect dopo login
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Login completed, current URL:', page.url());
    
    console.log('\n3. Navigating directly to companies page...');
    await page.goto('http://localhost:5173/companies', { waitUntil: 'networkidle0' });
    
    // Aspetta un po' per permettere al React di caricare
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 Current URL after companies navigation:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('❌ PROBLEM: Redirected to login page!');
      
      // Controlla se ci sono errori nella console
      const logs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      
      console.log('🔍 Checking page content...');
      const pageContent = await page.content();
      if (pageContent.includes('Accesso negato')) {
        console.log('❌ Found "Accesso negato" message');
      }
      
    } else if (currentUrl.includes('/companies')) {
      console.log('✅ SUCCESS: Companies page loaded successfully!');
      
      // Verifica che la pagina contenga elementi della companies page
      const hasCompaniesContent = await page.evaluate(() => {
        return document.body.innerText.includes('Aziende') || 
               document.body.innerText.includes('Companies') ||
               document.querySelector('[data-testid="companies-page"]') !== null;
      });
      
      if (hasCompaniesContent) {
        console.log('✅ Companies page content verified');
      } else {
        console.log('⚠️ Companies page loaded but content not found');
      }
    }
    
    console.log('\n4. Checking AuthContext state...');
    const authState = await page.evaluate(() => {
      // Prova ad accedere allo stato React DevTools se disponibile
      return {
        localStorage: {
          token: localStorage.getItem('token'),
          hasToken: !!localStorage.getItem('token')
        },
        url: window.location.href
      };
    });
    
    console.log('🔍 Auth state:', authState);
    
    // Mantieni il browser aperto per 10 secondi per debug manuale
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testFrontendCompaniesAccess();