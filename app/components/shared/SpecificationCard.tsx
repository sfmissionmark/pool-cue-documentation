'use client';

import { ComponentSpec, FerruleSpec, PinSpec, JointSpec, ModificationSpec } from './types';
import TechnicalDrawing from './TechnicalDrawing';

interface SpecificationCardProps<T extends ComponentSpec = ComponentSpec> {
  spec: T;
  onEdit: (spec: T) => void;
  onDuplicate: (spec: T) => void;
  onDelete: (id: string) => void;
}

function SpecificationCard<T extends ComponentSpec>({ 
  spec, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: SpecificationCardProps<T>) {
  // Helper function to get spec type-specific information
  const getSpecInfo = (spec: ComponentSpec) => {
    if ('exposedLength' in spec) {
      // This is a PinSpec
      const pinSpec = spec as PinSpec;
      return {
        type: 'Pin',
        details: [
          { label: 'Exposed Length', value: pinSpec.exposedLength },
          { label: 'Manufacture', value: pinSpec.manufacture }
        ].filter(item => item.value)
      };
    } else if ('diameter' in spec && 'length' in spec && 'material' in spec) {
      // This is a FerruleSpec
      const ferruleSpec = spec as FerruleSpec;
      return {
        type: 'Ferrule',
        details: [
          { label: 'Diameter', value: ferruleSpec.diameter },
          { label: 'Length', value: ferruleSpec.length },
          { label: 'Material', value: ferruleSpec.material },
          { label: 'Manufacture', value: ferruleSpec.manufacture },
          ...(ferruleSpec.vaultPlate ? [
            { label: 'Vault Plate', value: ferruleSpec.vaultPlateMaterial || 'Yes' },
            ...(ferruleSpec.vaultPlateThickness ? [{ label: 'Plate Thickness', value: ferruleSpec.vaultPlateThickness }] : [])
          ] : [])
        ].filter(item => item.value)
      };
    } else if ('diameter' in spec && !('length' in spec) && !('material' in spec)) {
      // This is a JointSpec
      const jointSpec = spec as JointSpec;
      return {
        type: 'Joint',
        details: [
          { label: 'Finished Joint Diameter', value: `⌀${jointSpec.diameter}` },
          { label: 'Manufacture', value: jointSpec.manufacture },
          ...(jointSpec.hasInsert ? [
            { label: 'Has Insert', value: 'Yes' },
            ...(jointSpec.insertMaterial ? [{ label: 'Insert Material', value: jointSpec.insertMaterial }] : [])
          ] : [{ label: 'Has Insert', value: 'No' }])
        ].filter(item => item.value)
      };
    } else if ('category' in spec && 'difficulty' in spec) {
      // This is a ModificationSpec
      const modificationSpec = spec as ModificationSpec;
      return {
        type: 'Modification',
        details: [
          { label: 'Category', value: modificationSpec.category },
          { label: 'Difficulty', value: modificationSpec.difficulty },
          { label: 'Manufacturer', value: modificationSpec.manufacture },
          ...(modificationSpec.timeEstimate ? [{ label: 'Time Estimate', value: modificationSpec.timeEstimate }] : []),
          ...(modificationSpec.description ? [{ label: 'Description', value: modificationSpec.description }] : [])
        ].filter(item => item.value)
      };
    }
    
    return {
      type: 'Component',
      details: []
    };
  };

  const specInfo = getSpecInfo(spec);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-600 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {spec.name}
          </h3>
          <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium">
            {specInfo.type}
          </span>
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(spec)}
            className="p-2 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDuplicate(spec)}
            className="p-2 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Duplicate"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          
          <button
            onClick={() => onDelete(spec.id)}
            className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Specifications Grid */}
      {specInfo.details.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {specInfo.details.map((detail, index) => (
            <div key={index} className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">{detail.label}:</span>
              <span className="ml-2 text-slate-900 dark:text-slate-100 font-medium">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Machining Steps and Technical Drawing */}
      {spec.machiningSteps.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Machining Steps ({spec.machiningSteps.length})
          </div>
          <div className="flex gap-4">
            {/* Machining Steps List */}
            <div className="flex-1 space-y-2">
              {spec.machiningSteps.map((step, index) => {
                // Handle both string and object step formats for backward compatibility
                if (typeof step === 'string') {
                  return (
                    <div key={index} className="flex items-center text-sm">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium min-w-[20px] text-center mr-3">
                        {index + 1}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{step}</span>
                    </div>
                  );
                }
                
                // Handle MachiningStep object format
                const stepDetails = [];
                if (step.size) stepDetails.push(`⌀${step.size}`);
                if (step.depth) stepDetails.push(`↓${step.depth}`);
                if (step.threadSize) stepDetails.push(`⚹${step.threadSize}`);
                if (step.finalDiameter) stepDetails.push(`→⌀${step.finalDiameter}`);
                
                return (
                  <div key={step.id || index} className="flex items-center text-sm">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium min-w-[20px] text-center mr-3">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{step.process}</span>
                      {stepDetails.length > 0 && (
                        <span className="ml-2 text-slate-600 dark:text-slate-400 text-xs">
                          {stepDetails.join(' • ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Technical Drawing Thumbnail */}
            <div className="flex-shrink-0">
              <TechnicalDrawing spec={spec} />
            </div>
          </div>
        </div>
      )}

      {/* Assembly Notes Preview */}
      {spec.assemblyNotes && (
        <div className="mb-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Assembly Notes</div>
          <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
            {spec.assemblyNotes}
          </div>
        </div>
      )}

      {/* Technical Drawing Thumbnail - fallback for specs without machining steps */}
      {spec.machiningSteps.length === 0 && (
        <div className="flex justify-center">
          <TechnicalDrawing spec={spec} />
        </div>
      )}
    </div>
  );
}

export default SpecificationCard;