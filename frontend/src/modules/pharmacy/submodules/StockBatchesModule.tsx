import React, { useState } from 'react';
import { Layers, Download } from 'lucide-react';
import { MedicineMaster } from '../../../types';

interface StockBatchesModuleProps {
  medicines: MedicineMaster[];
}

export const StockBatchesModule: React.FC<StockBatchesModuleProps> = ({ medicines }) => {
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockFilterType, setStockFilterType] = useState<string>('ALL');

  const now = new Date().getTime();

  const filteredStockMedicines = medicines.filter((m) => {
    const matchesSearch =
      !stockSearchQuery ||
      m.medicineName.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      (m.brandName && m.brandName.toLowerCase().includes(stockSearchQuery.toLowerCase())) ||
      m.itemCode.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      (m.barcode && m.barcode.toLowerCase().includes(stockSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (stockFilterType === 'EXPIRED') {
      return m.batches.some((b) => new Date(b.expiryDate).getTime() < now && b.quantityInBase > 0);
    }
    if (stockFilterType === 'LOW_STOCK') return m.isLowStock;
    if (stockFilterType === 'EXPIRING_SOON') {
      return m.batches.some((b) => {
        const expTime = new Date(b.expiryDate).getTime();
        const diffDays = (expTime - now) / (1000 * 3600 * 24);
        return diffDays > 0 && diffDays <= 60 && b.quantityInBase > 0;
      });
    }
    if (stockFilterType !== 'ALL') return m.medicineType === stockFilterType;
    return true;
  });

  const handleExportStocksCsv = () => {
    const headers = [
      'Item Name',
      'Brand',
      'Item Code',
      'Manufacturer',
      'Strength',
      'Barcode',
      'Package Info',
      'HSN Code',
      'Medicine Type',
      'Buying Unit',
      'Selling Unit',
      'Unit Ratio',
      'Reorder Level',
      'Buying Price',
      'MRP',
      'Selling Price',
      'Opening Stock',
      'Batch Number',
      'Expiry Date',
      'Prescription Type',
      'Status',
    ];

    const rows: string[][] = [];
    filteredStockMedicines.forEach((med) => {
      const currentQty = med.currentStock ?? (med.batches || []).reduce((s, b) => s + (b.quantityInBase || 0), 0);
      const statusLabel = currentQty <= 0 ? 'OUT OF STOCK' : med.isLowStock ? 'LOW STOCK' : 'IN STOCK';
      if (med.batches && med.batches.length > 0) {
        med.batches.forEach((b) => {
          rows.push([
            med.medicineName || '',
            med.brandName || '',
            med.itemCode || '',
            med.manufacturer || '',
            med.strength || '',
            med.barcode || '',
            med.packageInfo || '',
            med.hsnCode || '',
            med.medicineType || '',
            med.buyingUnit || '',
            med.sellingUnit || '',
            String(med.unitRatio || 1),
            String(med.reorderLevel || 0),
            String(b.purchasePrice || 0),
            String(b.mrp || 0),
            String(b.sellingPrice || 0),
            String(b.quantityInBase || 0),
            b.batchNumber || '',
            b.expiryDate ? new Date(b.expiryDate).toISOString().substring(0, 10) : '',
            med.prescriptionType || '',
            new Date(b.expiryDate).getTime() < now ? 'EXPIRED' : statusLabel,
          ]);
        });
      } else {
        rows.push([
          med.medicineName || '',
          med.brandName || '',
          med.itemCode || '',
          med.manufacturer || '',
          med.strength || '',
          med.barcode || '',
          med.packageInfo || '',
          med.hsnCode || '',
          med.medicineType || '',
          med.buyingUnit || '',
          med.sellingUnit || '',
          String(med.unitRatio || 1),
          String(med.reorderLevel || 0),
          '0',
          '0',
          '0',
          String(currentQty),
          '',
          '',
          med.prescriptionType || '',
          statusLabel,
        ]);
      }
    });

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const todayStr = new Date().toISOString().substring(0, 10);
    a.href = url;
    a.download = `Pharmacy-Stocks-Export-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0A685D]" />
            Live Stock &amp; FEFO Batches
          </h3>
          <p className="text-xs text-slate-500">
            Active shelf inventory with automated expired quarantine, low-stock, and FEFO alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={stockSearchQuery}
            onChange={(e) => setStockSearchQuery(e.target.value)}
            placeholder="Search stock..."
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
          <select
            value={stockFilterType}
            onChange={(e) => setStockFilterType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
          >
            <option value="ALL">All Items</option>
            <option value="EXPIRED">🛑 Expired Batches</option>
            <option value="LOW_STOCK">🟡 Low Stock</option>
            <option value="EXPIRING_SOON">🟠 Expiring Soon (&lt; 60d)</option>
          </select>
          <button
            type="button"
            onClick={handleExportStocksCsv}
            disabled={filteredStockMedicines.length === 0}
            className="px-3.5 py-1.5 bg-[#0A685D] hover:bg-[#085249] disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
            title="Export medicines and batch stock as CSV for backup or future import"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F1F5F9] text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
            <tr>
              <th className="p-3 pl-4">Item Code &amp; Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Active Batches (FEFO Tracked)</th>
              <th className="p-3 text-right">In-Stock Qty</th>
              <th className="p-3 text-right">Selling Rate</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStockMedicines.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                  No medicine matches the selected search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredStockMedicines.map((med) => {
                const hasExpired = med.batches.some(
                  (b) => b.quantityInBase > 0 && new Date(b.expiryDate).getTime() < now
                );

                return (
                  <tr key={med.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 pl-4">
                      <div className="font-mono text-[10px] text-[#0A685D] font-bold">{med.itemCode}</div>
                      <div className="font-extrabold text-slate-900 text-xs">{med.medicineName}</div>
                      <div className="text-[10px] text-slate-400">{med.brandName}</div>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                        {med.medicineType}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">{med.packageInfo || '—'}</div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        {med.batches.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">No batches in stock</span>
                        ) : (
                          med.batches.map((b) => {
                            const isExpired = new Date(b.expiryDate).getTime() < now;
                            const isExpiringSoon =
                              !isExpired &&
                              (new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24) <= 60;

                            return (
                              <div
                                key={b.id}
                                className={`flex items-center justify-between gap-3 text-[10px] font-mono px-2 py-1 rounded border ${
                                  isExpired
                                    ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                                    : isExpiringSoon
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200/70'
                                }`}
                              >
                                <span className="font-bold">{b.batchNumber}</span>
                                <span className="text-slate-500">Qty: {b.quantityInBase}</span>
                                <span
                                  className={`font-black ${
                                    isExpired
                                      ? 'text-red-700'
                                      : isExpiringSoon
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {isExpired ? '🛑 EXPIRED: ' : 'Exp: '}
                                  {new Date(b.expiryDate).toLocaleDateString()}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right font-black text-sm text-slate-900">
                      {med.currentStock} {med.sellingUnit}s
                    </td>

                    <td className="p-3 text-right font-bold text-[#0A685D]">
                      ₹{med.batches[0]?.sellingPrice || (med as any).mrp || 0}
                    </td>

                    <td className="p-3 text-center">
                      {hasExpired ? (
                        <span className="px-2.5 py-1 bg-red-100 border border-red-300 text-red-800 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          EXPIRED (LOCKED)
                        </span>
                      ) : med.currentStock === 0 ? (
                        <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[10px] font-bold">
                          OUT OF STOCK
                        </span>
                      ) : med.isLowStock ? (
                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-bold">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] font-bold">
                          IN STOCK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
