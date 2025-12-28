import { Package, Plus, Trash2, Edit2 } from 'lucide-react'

function MaterialList({ materials = [], onAdd, onEdit, onDelete, editable = false }) {
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package size={20} className="text-primary" />
          Materials
        </h3>
        {editable && onAdd && (
          <button
            onClick={onAdd}
            className="btn-primary text-sm flex items-center gap-1 px-3 py-1"
          >
            <Plus size={16} />
            Add Material
          </button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No materials listed</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-2 text-sm text-gray-400 font-medium">Material</th>
                <th className="text-left py-3 px-2 text-sm text-gray-400 font-medium">Quantity</th>
                <th className="text-left py-3 px-2 text-sm text-gray-400 font-medium">Unit</th>
                <th className="text-right py-3 px-2 text-sm text-gray-400 font-medium">Cost</th>
                {editable && <th className="text-right py-3 px-2 text-sm text-gray-400 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id || index} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-2 text-white">{material.name}</td>
                  <td className="py-3 px-2 text-gray-300">{material.quantity}</td>
                  <td className="py-3 px-2 text-gray-300">{material.unit || 'pcs'}</td>
                  <td className="py-3 px-2 text-right text-white font-medium">
                    ${material.cost ? material.cost.toFixed(2) : '0.00'}
                  </td>
                  {editable && (
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(material)}
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(material.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-700">
                <td colSpan={editable ? 4 : 3} className="py-3 px-2 text-right text-gray-400 font-semibold">
                  Total Cost:
                </td>
                <td className="py-3 px-2 text-right text-primary font-bold text-lg">
                  ${materials.reduce((sum, m) => sum + (m.cost || 0), 0).toFixed(2)}
                </td>
                {editable && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export { MaterialList }
export default MaterialList
