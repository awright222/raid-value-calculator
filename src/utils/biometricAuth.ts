// Biometric Authentication using WebAuthn API
// This will use Touch ID/Face ID on supported devices

interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export class BiometricAuth {
  // Check if biometric authentication is available
  static async isAvailable(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      return false;
    }
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  // Clear stored credentials (reset biometric setup)
  static clearSetup(): void {
    localStorage.removeItem('biometric-credential-id');
    localStorage.removeItem('biometric-setup-date');
  }

  // Check if setup is recent (within 30 days) to prevent stale credentials
  static isSetupValid(): boolean {
    const credentialId = localStorage.getItem('biometric-credential-id');
    const setupDate = localStorage.getItem('biometric-setup-date');
    
    if (!credentialId || !setupDate) {
      return false;
    }
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return parseInt(setupDate) > thirtyDaysAgo;
  }

  // Register biometric authentication (one-time setup)
  static async register(): Promise<BiometricAuthResult> {
    try {
      if (!(await this.isAvailable())) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // In production, get from server
          rp: {
            name: "Raid Value Calculator",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode("admin"),
            name: "admin",
            displayName: "Admin User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // Force platform authenticator (Touch ID/Face ID)
            requireResidentKey: false,
            userVerification: "required",
          },
          timeout: 30000, // Shorter timeout
          attestation: "none" // Don't require attestation
        },
      }) as PublicKeyCredential;

      if (credential) {
        // Store credential ID and setup date in localStorage for future auth
        localStorage.setItem('biometric-credential-id', credential.id);
        localStorage.setItem('biometric-setup-date', Date.now().toString());
        return { success: true };
      }
      
      return { success: false, error: 'Failed to create credential' };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Authentication cancelled by user' };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, error: 'Invalid credential state. Try resetting biometric setup.' };
      } else if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Biometric authentication not supported on this device' };
      } else if (error.message?.includes('security key') || error.message?.includes('authenticator')) {
        return { success: false, error: 'Hardware security key required. Use password login instead or reset biometric setup.' };
      }
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  // Authenticate using biometrics
  static async authenticate(): Promise<BiometricAuthResult> {
    try {
      const credentialId = localStorage.getItem('biometric-credential-id');
      if (!credentialId) {
        return { success: false, error: 'Biometric authentication not set up' };
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // In production, get from server
          allowCredentials: [{
            id: new TextEncoder().encode(credentialId),
            type: 'public-key',
          }],
          userVerification: "required",
          timeout: 30000, // Shorter timeout
        },
      }) as PublicKeyCredential;

      return credential ? { success: true } : { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Authentication cancelled or failed' };
      } else if (error.name === 'InvalidStateError') {
        return { success: false, error: 'Invalid credential state. Try resetting biometric setup.' };
      } else if (error.name === 'NotSupportedError') {
        return { success: false, error: 'Biometric authentication not supported' };
      } else if (error.message?.includes('security key') || error.message?.includes('authenticator')) {
        return { success: false, error: 'Hardware security key required. Use password login instead.' };
      }
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }

  // Check if biometric auth is already set up and valid
  static isSetup(): boolean {
    return this.isSetupValid();
  }

  // Reset biometric setup if it's stale or causing issues
  static resetIfNeeded(): boolean {
    if (!this.isSetupValid()) {
      this.clearSetup();
      return true; // Was reset
    }
    return false; // No reset needed
  }
}
