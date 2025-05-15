const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Tavus API Key Setup');
console.log('=====================');
console.log('Please enter your Tavus API key:');

rl.question('API Key: ', (apiKey) => {
  if (!apiKey) {
    console.error('❌ API key cannot be empty');
    rl.close();
    return;
  }

  // Create .env.local file
  const envContent = `TAVUS_API_KEY=${apiKey}\n`;

  const envPath = path.join(__dirname, '.env.local');

  try {
    // Read existing .env.local if it exists
    let existingContent = '';
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove any existing TAVUS_API_KEY line
    const lines = existingContent.split('\n').filter(line => !line.startsWith('TAVUS_API_KEY='));
    
    // Add the new API key
    const newContent = lines.join('\n') + (lines.length > 0 ? '\n' : '') + envContent;

    fs.writeFileSync(envPath, newContent);
    console.log('✅ Tavus API key has been set successfully!');
    console.log('Please restart your development server for the changes to take effect.');
  } catch (error) {
    console.error('❌ Error setting up API key:', error.message);
    console.log('\nPlease create a .env.local file manually with the following content:');
    console.log(envContent);
  }

  rl.close();
}); 