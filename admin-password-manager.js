#!/usr/bin/env node

// Secure Admin Password Generator and Manager
// Only the admin can run this script to generate/reset passwords

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurePasswordManager {
  constructor() {
    this.envPath = path.join(__dirname, '.env.local');
    this.productionEnvPath = path.join(__dirname, '.env.production.local');
  }

  // Generate a cryptographically secure random password
  generateSecurePassword(length = 16) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += symbols[crypto.randomInt(0, symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password to randomize positions
    return password.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');
  }

  // Read current environment file
  readEnvFile() {
    if (fs.existsSync(this.envPath)) {
      return fs.readFileSync(this.envPath, 'utf8');
    }
    return null;
  }

  // Update password in environment files
  updatePassword(newPassword) {
    const envContent = this.readEnvFile();
    if (!envContent) {
      console.error('❌ .env.local file not found. Please create it first.');
      return false;
    }

    // Update .env.local
    const updatedContent = envContent.replace(
      /^VITE_ADMIN_PASSWORD=.*$/m,
      `VITE_ADMIN_PASSWORD=${newPassword}`
    );

    fs.writeFileSync(this.envPath, updatedContent);
    console.log('✅ Updated .env.local');

    // Update production env if it exists
    if (fs.existsSync(this.productionEnvPath)) {
      const prodContent = fs.readFileSync(this.productionEnvPath, 'utf8');
      const updatedProdContent = prodContent.replace(
        /^VITE_ADMIN_PASSWORD=.*$/m,
        `VITE_ADMIN_PASSWORD=${newPassword}`
      );
      fs.writeFileSync(this.productionEnvPath, updatedProdContent);
      console.log('✅ Updated .env.production.local');
    }

    return true;
  }

  // Generate and set new password
  generateAndSetPassword() {
    console.log('🔐 Generating new secure admin password...\n');
    
    const newPassword = this.generateSecurePassword(20); // 20 character password
    
    if (this.updatePassword(newPassword)) {
      console.log('🎉 NEW ADMIN PASSWORD GENERATED:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔑 ${newPassword}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📝 IMPORTANT NOTES:');
      console.log('• Save this password securely (password manager recommended)');
      console.log('• Previous biometric setups will be invalidated');
      console.log('• You will need to log in with this new password');
      console.log('• Run "npm run build && firebase deploy --only hosting" to deploy');
      console.log('\n🛡️  This password has been set in your environment files.');
      return true;
    }
    return false;
  }

  // Verify admin identity before allowing password operations
  async verifyAdmin() {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('🔐 ADMIN VERIFICATION REQUIRED');
      console.log('To prevent unauthorized access, please verify your identity:\n');
      
      readline.question('Enter your current admin password (or "RESET" if forgotten): ', (answer) => {
        readline.close();
        
        if (answer === 'RESET') {
          console.log('\n🚨 EMERGENCY RESET MODE');
          console.log('This will generate a new password and invalidate all previous credentials.');
          const confirmReadline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          confirmReadline.question('Type "CONFIRM_RESET" to proceed: ', (confirm) => {
            confirmReadline.close();
            resolve(confirm === 'CONFIRM_RESET');
          });
        } else {
          // Check if provided password matches current password
          const envContent = this.readEnvFile();
          const currentPassword = envContent?.match(/^VITE_ADMIN_PASSWORD=(.*)$/m)?.[1];
          resolve(answer === currentPassword);
        }
      });
    });
  }
}

// Main execution
async function main() {
  const manager = new SecurePasswordManager();
  
  console.log('🛡️  SECURE ADMIN PASSWORD MANAGER');
  console.log('=====================================\n');
  
  const isVerified = await manager.verifyAdmin();
  
  if (!isVerified) {
    console.log('\n❌ VERIFICATION FAILED');
    console.log('Access denied. Only the admin can manage passwords.');
    process.exit(1);
  }
  
  console.log('\n✅ VERIFICATION SUCCESSFUL');
  console.log('Proceeding with password generation...\n');
  
  const success = manager.generateAndSetPassword();
  
  if (success) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test login locally: npm run dev');
    console.log('2. Deploy to production: npm run build && firebase deploy --only hosting');
    console.log('3. Set up biometric authentication again (optional)');
  }
}

// Run only if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurePasswordManager;
