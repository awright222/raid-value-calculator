import { getAllPacks } from '../firebase/database';
import { calculateItemPrices } from '../services/pricingService';

export async function diagnosePricingServiceIssue(): Promise<{
  success: boolean;
  details: {
    getAllPacksResult: {
      success: boolean;
      packsCount: number;
      error?: any;
      samplePack?: any;
    };
    pricingServiceResult: {
      success: boolean;
      itemCount: number;
      error?: any;
      sampleItem?: any;
    };
  };
  recommendations: string[];
}> {
  console.log('🔍 Starting Item Values diagnostic...');
  
  const result = {
    success: false,
    details: {
      getAllPacksResult: {
        success: false,
        packsCount: 0,
        error: undefined as any,
        samplePack: undefined as any
      },
      pricingServiceResult: {
        success: false,
        itemCount: 0,
        error: undefined as any,
        sampleItem: undefined as any
      }
    },
    recommendations: [] as string[]
  };

  // Test 1: Direct getAllPacks call
  try {
    console.log('🔍 Testing getAllPacks()...');
    const packs = await getAllPacks();
    
    result.details.getAllPacksResult = {
      ...result.details.getAllPacksResult,
      success: true,
      packsCount: packs.length,
      samplePack: packs.length > 0 ? {
        id: packs[0].id,
        name: packs[0].name,
        price: packs[0].price,
        itemsCount: packs[0].items?.length || 0
      } : null
    };
    
    console.log(`✅ getAllPacks() succeeded: ${packs.length} packs found`);
  } catch (error: any) {
    console.error('❌ getAllPacks() failed:', error);
    
    result.details.getAllPacksResult = {
      ...result.details.getAllPacksResult,
      success: false,
      packsCount: 0,
      error: {
        name: error.name,
        code: error.code,
        message: error.message
      }
    };
    
    result.recommendations.push(`getAllPacks() failed: ${error.code || error.name} - ${error.message}`);
    
    if (error.code === 'permission-denied') {
      result.recommendations.push('Check Firestore security rules for packs collection read access');
    }
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      result.recommendations.push('Missing Firestore index for orderBy query on created_at field');
    }
    if (error.code === 'unavailable') {
      result.recommendations.push('Firestore service temporarily unavailable');
    }
  }

  // Test 2: Pricing service call (only if getAllPacks succeeded)
  if (result.details.getAllPacksResult.success) {
    try {
      console.log('🔍 Testing calculateItemPrices()...');
      const pricingResult = await calculateItemPrices();
      const itemPrices = pricingResult.itemPrices;
      
      result.details.pricingServiceResult = {
        ...result.details.pricingServiceResult,
        success: true,
        itemCount: Object.keys(itemPrices).length,
        sampleItem: Object.keys(itemPrices).length > 0 ? {
          itemId: Object.keys(itemPrices)[0],
          price: Object.values(itemPrices)[0]
        } : null
      };
      
      console.log(`✅ calculateItemPrices() succeeded: ${Object.keys(itemPrices).length} items priced`);
      result.success = true;
    } catch (error: any) {
      console.error('❌ calculateItemPrices() failed:', error);
      
      result.details.pricingServiceResult = {
        ...result.details.pricingServiceResult,
        success: false,
        itemCount: 0,
        error: {
          name: error.name,
          code: error.code,
          message: error.message
        }
      };
      
      result.recommendations.push(`calculateItemPrices() failed: ${error.code || error.name} - ${error.message}`);
    }
  } else {
    result.recommendations.push('Skipping calculateItemPrices() test due to getAllPacks() failure');
  }

  // Overall assessment
  if (result.success) {
    result.recommendations.push('✅ Item Values functionality appears to be working correctly');
  } else {
    result.recommendations.push('❌ Item Values functionality has issues that need to be resolved');
  }

  return result;
}
