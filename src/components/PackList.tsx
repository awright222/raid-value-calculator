import { motion } from 'framer-motion';
import GradeDisplay from './GradeDisplay';

interface Pack {
  id: number;
  name: string;
  price: number;
  energy_pots: number;
  raw_energy: number;
  total_energy: number;
  cost_per_energy: number;
  created_at?: string;
}

interface PackListProps {
  packs: Pack[];
  loading: boolean;
}

export default function PackList({ packs, loading }: PackListProps) {
  const calculateGrade = (costPerEnergy: number) => {
    if (!packs.length) return 'C';
    
    const costs = packs.map(pack => pack.cost_per_energy).sort((a, b) => a - b);
    const percentile = costs.findIndex(cost => cost >= costPerEnergy) / costs.length;
    
    if (percentile <= 0.1) return 'S';
    if (percentile <= 0.3) return 'A';
    if (percentile <= 0.6) return 'B';
    if (percentile <= 0.8) return 'C';
    return 'D';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading packs...</p>
        </div>
      </div>
    );
  }

  if (!packs.length) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Packs Found</h3>
          <p className="text-gray-600">Add some packs using the Admin panel to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Energy Pack Database</h2>
          <div className="text-sm text-gray-600">
            {packs.length} pack{packs.length !== 1 ? 's' : ''} total
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack, index) => {
            const grade = calculateGrade(pack.cost_per_energy);
            
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{pack.name}</h3>
                  <span className="text-xl font-bold text-primary-600">${pack.price}</span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Energy Pots:</span>
                    <span className="font-medium">{pack.energy_pots}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Raw Energy:</span>
                    <span className="font-medium">{pack.raw_energy.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium text-gray-700">Total Energy:</span>
                    <span className="font-bold text-lg">{pack.total_energy.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Cost per Energy:</span>
                    <span className="font-bold text-lg">${pack.cost_per_energy.toFixed(5)}</span>
                  </div>
                </div>

                <div className="scale-75 -m-3">
                  <GradeDisplay grade={grade} />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How Grading Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="bg-yellow-100 rounded-lg p-3">
              <div className="font-bold text-yellow-800">S Grade</div>
              <div className="text-sm text-yellow-700">Top 10%</div>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <div className="font-bold text-green-800">A Grade</div>
              <div className="text-sm text-green-700">Top 30%</div>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <div className="font-bold text-blue-800">B Grade</div>
              <div className="text-sm text-blue-700">Top 60%</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="font-bold text-gray-800">C Grade</div>
              <div className="text-sm text-gray-700">Top 80%</div>
            </div>
            <div className="bg-red-100 rounded-lg p-3">
              <div className="font-bold text-red-800">D Grade</div>
              <div className="text-sm text-red-700">Bottom 20%</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
