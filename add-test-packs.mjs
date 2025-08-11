import { addPack } from '../src/firebase/database';

async function addTestPacks() {
  console.log('Adding test pack data...');
  
  try {
    // Test pack 1: Energy focused pack
    const pack1 = await addPack({
      name: 'Energy Bundle',
      price: 4.99,
      energy_pots: 5,
      raw_energy: 1000,
      total_energy: 1650,
      cost_per_energy: 0.00302,
      items: [
        { itemTypeId: 'energy_pot', quantity: 5 },
        { itemTypeId: 'raw_energy', quantity: 1000 },
        { itemTypeId: 'mystery_shard', quantity: 2 }
      ]
    });
    console.log('Added pack 1:', pack1);
    
    // Test pack 2: Shards pack
    const pack2 = await addPack({
      name: 'Shard Collector',
      price: 9.99,
      energy_pots: 3,
      raw_energy: 500,
      total_energy: 890,
      cost_per_energy: 0.01123,
      items: [
        { itemTypeId: 'energy_pot', quantity: 3 },
        { itemTypeId: 'ancient_shard', quantity: 1 },
        { itemTypeId: 'void_shard', quantity: 1 },
        { itemTypeId: 'mystery_shard', quantity: 5 }
      ]
    });
    console.log('Added pack 2:', pack2);
    
    // Test pack 3: Mixed value pack
    const pack3 = await addPack({
      name: 'Weekly Special',
      price: 19.99,
      energy_pots: 10,
      raw_energy: 2500,
      total_energy: 3800,
      cost_per_energy: 0.00526,
      items: [
        { itemTypeId: 'energy_pot', quantity: 10 },
        { itemTypeId: 'raw_energy', quantity: 2500 },
        { itemTypeId: 'sacred_shard', quantity: 1 },
        { itemTypeId: 'ancient_shard', quantity: 3 },
        { itemTypeId: 'legendary_tome', quantity: 2 },
        { itemTypeId: 'silver', quantity: 50000 }
      ]
    });
    console.log('Added pack 3:', pack3);
    
    console.log('✅ Test packs added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding test packs:', error);
  }
}

addTestPacks().then(() => process.exit(0));
