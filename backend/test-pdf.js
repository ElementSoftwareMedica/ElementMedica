import axios from 'axios';
import fs from 'fs';

const PREVENTIVO_ID = '068dfa1b-8f84-444a-8c43-3ebf9a6ca539';

async function testPdfDownload() {
  try {
    // Try using the proxy which should have cookies
    console.log('Testing PDF download for preventivo:', PREVENTIVO_ID);
    console.log('Using proxy with cookies...');
    
    // Read cookies from file
    const cookieJar = fs.readFileSync('../backend_cookies.txt', 'utf8').trim();
    
    const response = await axios.get(
      `http://localhost:4003/api/preventivi/${PREVENTIVO_ID}/pdf`,
      {
        headers: {
          'Cookie': cookieJar
        },
        responseType: 'arraybuffer',
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      }
    );
    
    console.log('✅ Success! Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content length:', response.data.length);
    
    // Save the PDF to check it
    fs.writeFileSync('test-preventivo.pdf', response.data);
    console.log('✅ PDF saved to test-preventivo.pdf');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      
      // Try to parse the error body
      const bodyText = error.response.data?.toString();
      console.error('Body:', bodyText?.substring(0, 500));
    }
  }
}

testPdfDownload();
