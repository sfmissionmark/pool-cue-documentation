'use client';

import React from 'react';
import { ComponentSpec, MachiningStep } from './types';

interface MachiningStepsEditorProps {
  spec: ComponentSpec;
  onUpdate: (updatedSpec: ComponentSpec) => void;
}

export default function MachiningStepsEditor({ spec, onUpdate }: MachiningStepsEditorProps) {
  const addMachiningStep = () => {
    const newStep: MachiningStep = {
      id: Date.now().toString(),
      process: 'Center Drill',
      unit: 'inches'
    };
    onUpdate({
      ...spec,
      machiningSteps: [...spec.machiningSteps, newStep]
    });
  };

  const updateMachiningStep = (index: number, field: keyof MachiningStep, value: string) => {
    const updatedSteps = [...spec.machiningSteps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    onUpdate({
      ...spec,
      machiningSteps: updatedSteps
    });
  };

  const removeMachiningStep = (index: number) => {
    const updatedSteps = spec.machiningSteps.filter((_, i) => i !== index);
    onUpdate({
      ...spec,
      machiningSteps: updatedSteps
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Machining Steps
      </label>
      <div className="space-y-3">
        {spec.machiningSteps.map((step, index) => (
          <div key={step.id} className="pb-3 border-b border-slate-200 dark:border-slate-600 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{index + 1}. {step.process}{step.process === 'Tap' && step.threadSize ? `: ${step.threadSize}` : ''}</h4>
              <button
                type="button"
                onClick={() => removeMachiningStep(index)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
            
            <div className={`grid grid-cols-1 gap-3 ${step.process === 'Center Drill' ? 'md:grid-cols-1' : step.process === 'Tap' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Process
                </label>
                <select
                  value={step.process}
                  onChange={(e) => updateMachiningStep(index, 'process', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="Center Drill">Center Drill</option>
                  <option value="Drill">Drill</option>
                  <option value="Tap">Tap</option>
                  <option value="Bore">Bore</option>
                  <option value="Ream">Ream</option>
                  <option value="Face">Face</option>
                </select>
              </div>
              
              {step.process === 'Tap' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Thread Size
                  </label>
                  <select
                    value={step.threadSize || ''}
                    onChange={(e) => updateMachiningStep(index, 'threadSize', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="">Select thread size...</option>
                    <option value="3/8-10">3/8-10</option>
                    <option value="5/16-14">5/16-14</option>
                    <option value="5/16-18">5/16-18</option>
                    <option value="Radial">Radial</option>
                    <option value="7/16-14">7/16-14</option>
                    <option value="1/2-13">1/2-13</option>
                    <option value="m16-1.5">m16-1.5</option>
                  </select>
                </div>
              )}
              
              {step.process !== 'Center Drill' && step.process !== 'Tap' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    value={step.size || ''}
                    onChange={(e) => updateMachiningStep(index, 'size', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 0.25, 1/4"
                  />
                </div>
              )}
              
              {step.process !== 'Center Drill' && step.process !== 'Tap' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Depth
                  </label>
                  <input
                    type="text"
                    value={step.depth || ''}
                    onChange={(e) => updateMachiningStep(index, 'depth', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 0.5, 1/2"
                  />
                </div>
              )}
            </div>
            
            {step.process === 'Bore' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Final Diameter
                  </label>
                  <input
                    type="text"
                    value={step.finalDiameter || ''}
                    onChange={(e) => updateMachiningStep(index, 'finalDiameter', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 0.375, 3/8"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addMachiningStep}
        className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-md transition-colors"
      >
        + Add Machining Step
      </button>
    </div>
  );
}