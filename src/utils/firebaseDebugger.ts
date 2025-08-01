import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface FirebaseDebugResult {
  operation: string;
  success: boolean;
  error?: any;
  details?: any;
  timestamp: Date;
}

export class FirebaseDebugger {
  private results: FirebaseDebugResult[] = [];

  private log(operation: string, success: boolean, error?: any, details?: any) {
    const result: FirebaseDebugResult = {
      operation,
      success,
      error: error ? {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      } : undefined,
      details,
      timestamp: new Date()
    };
    
    this.results.push(result);
    console.log(`🔍 Firebase Debug [${operation}]:`, success ? '✅' : '❌', error || 'Success');
    
    return result;
  }

  async testBasicConnection(): Promise<FirebaseDebugResult> {
    try {
      // Test 1: Basic Firestore connection
      const testCollection = collection(db, 'packs');
      console.log('🔍 Firebase Debug: Testing basic Firestore connection...');
      
      this.log('basic-connection', true, null, { 
        dbInstance: !!db,
        collectionRef: !!testCollection 
      });
      
      return this.log('basic-connection', true);
    } catch (error) {
      return this.log('basic-connection', false, error);
    }
  }

  async testSimpleRead(): Promise<FirebaseDebugResult> {
    try {
      // Test 2: Simple read operation with limit
      console.log('🔍 Firebase Debug: Testing simple read with limit...');
      
      const q = query(collection(db, 'packs'), limit(1));
      const snapshot = await getDocs(q);
      
      return this.log('simple-read', true, null, { 
        docsCount: snapshot.docs.length,
        hasData: !snapshot.empty 
      });
    } catch (error) {
      return this.log('simple-read', false, error);
    }
  }

  async testOrderByRead(): Promise<FirebaseDebugResult> {
    try {
      // Test 3: Read with orderBy (common source of 400 errors)
      console.log('🔍 Firebase Debug: Testing orderBy query...');
      
      const q = query(
        collection(db, 'packs'), 
        orderBy('created_at', 'desc'), 
        limit(5)
      );
      const snapshot = await getDocs(q);
      
      return this.log('orderby-read', true, null, { 
        docsCount: snapshot.docs.length 
      });
    } catch (error) {
      return this.log('orderby-read', false, error);
    }
  }

  async testWhereQuery(): Promise<FirebaseDebugResult> {
    try {
      // Test 4: Where query
      console.log('🔍 Firebase Debug: Testing where query...');
      
      const q = query(
        collection(db, 'packs'), 
        where('price', '>', 0),
        limit(5)
      );
      const snapshot = await getDocs(q);
      
      return this.log('where-query', true, null, { 
        docsCount: snapshot.docs.length 
      });
    } catch (error) {
      return this.log('where-query', false, error);
    }
  }

  async testWriteOperation(): Promise<FirebaseDebugResult> {
    try {
      // Test 5: Write operation
      console.log('🔍 Firebase Debug: Testing write operation...');
      
      const testDoc = {
        name: 'DEBUG_TEST_PACK',
        price: 0.01,
        energy_pots: 0,
        raw_energy: 1,
        total_energy: 1,
        cost_per_energy: 0.01,
        created_at: Timestamp.now(),
        is_debug: true
      };
      
      const docRef = await addDoc(collection(db, 'packs'), testDoc);
      
      return this.log('write-operation', true, null, { 
        docId: docRef.id 
      });
    } catch (error) {
      return this.log('write-operation', false, error);
    }
  }

  async testComplexQuery(): Promise<FirebaseDebugResult> {
    try {
      // Test 6: Complex query similar to what causes issues
      console.log('🔍 Firebase Debug: Testing complex query...');
      
      const q = query(
        collection(db, 'packs'),
        where('total_energy', '>', 0),
        orderBy('total_energy'),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      
      return this.log('complex-query', true, null, { 
        docsCount: snapshot.docs.length 
      });
    } catch (error) {
      return this.log('complex-query', false, error);
    }
  }

  async runFullDiagnostic(): Promise<{
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      criticalFailures: string[];
    };
    results: FirebaseDebugResult[];
    recommendations: string[];
  }> {
    console.log('🔍 Firebase Debug: Starting full diagnostic...');
    this.results = []; // Clear previous results
    
    // Run all tests
    await this.testBasicConnection();
    await this.testSimpleRead();
    await this.testOrderByRead();
    await this.testWhereQuery();
    await this.testWriteOperation();
    await this.testComplexQuery();
    
    // Analyze results
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    // Identify critical failures
    const criticalFailures = this.results
      .filter(r => !r.success)
      .map(r => r.operation);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (this.results.find(r => r.operation === 'basic-connection' && !r.success)) {
      recommendations.push('Firebase configuration issue - check API keys and project settings');
    }
    
    if (this.results.find(r => r.operation === 'simple-read' && !r.success)) {
      recommendations.push('Firestore read permissions issue - check security rules');
    }
    
    if (this.results.find(r => r.operation === 'write-operation' && !r.success)) {
      recommendations.push('Firestore write permissions issue - check security rules');
    }
    
    if (this.results.find(r => r.operation === 'orderby-read' && !r.success)) {
      recommendations.push('Missing composite index for orderBy queries');
    }
    
    if (this.results.find(r => r.operation === 'complex-query' && !r.success)) {
      recommendations.push('Complex query requires database indexes');
    }
    
    // Check for specific 400 error patterns
    const has400Errors = this.results.some(r => 
      r.error?.code === 'invalid-argument' || 
      r.error?.message?.includes('400') ||
      r.error?.code === 'failed-precondition'
    );
    
    if (has400Errors) {
      recommendations.push('400 Bad Request detected - likely missing Firestore indexes or invalid query parameters');
    }
    
    return {
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        criticalFailures
      },
      results: this.results,
      recommendations
    };
  }
}

export const createFirebaseDebugger = () => new FirebaseDebugger();
