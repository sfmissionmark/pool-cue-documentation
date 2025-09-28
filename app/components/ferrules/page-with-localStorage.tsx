'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

interface FerruleSpec {
  id: string;
  name: string;
  diameter: string;
  length: string;
  material: string;
  buildStyle: string;
  machiningSteps: string[];
  assemblyNotes: string;
  vaultPlate: boolean;
  vaultPlateMaterial?: string;
  vaultPlateThickness?: string;
}

export default function FerrulesPage() {
  const [specs, setSpecs] = useState<FerruleSpec[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<FerruleSpec>({
    id: '',
    name: '',
    diameter: '',
    length: '',
    material: '',
    buildStyle: '',
    machiningSteps: [''],
    assemblyNotes: '',
    vaultPlate: false,
    vaultPlateMaterial: '',
    vaultPlateThickness: ''
  });

  // Load from localStorage on component mount
  useEffect(() => {
    const savedSpecs = localStorage.getItem('ferrule-specs');
    if (savedSpecs) {
      setSpecs(JSON.parse(savedSpecs));
    }
  }, []);

  // Save to localStorage whenever specs change
  useEffect(() => {
    if (specs.length > 0) {
      localStorage.setItem('ferrule-specs', JSON.stringify(specs));
    }
  }, [specs]);

  const handleSave = () => {
    if (currentSpec.id) {
      setSpecs(prev => prev.map(spec => spec.id === currentSpec.id ? currentSpec : spec));
    } else {
      const newSpec = { ...currentSpec, id: Date.now().toString() };
      setSpecs(prev => [...prev, newSpec]);
    }
    setIsEditing(false);
    setCurrentSpec({
      id: '',
      name: '',
      diameter: '',
      length: '',
      material: '',
      buildStyle: '',
      machiningSteps: [''],
      assemblyNotes: '',
      vaultPlate: false,
      vaultPlateMaterial: '',
      vaultPlateThickness: ''
    });
  };

  const handleEdit = (spec: FerruleSpec) => {
    setCurrentSpec(spec);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this ferrule specification?')) {
      setSpecs(prev => prev.filter(spec => spec.id !== id));
    }
  };

  const addMachiningStep = () => {
    setCurrentSpec(prev => ({
      ...prev,
      machiningSteps: [...prev.machiningSteps, '']
    }));
  };

  const updateMachiningStep = (index: number, value: string) => {
    setCurrentSpec(prev => ({
      ...prev,
      machiningSteps: prev.machiningSteps.map((step, i) => i === index ? value : step)
    }));
  };

  const removeMachiningStep = (index: number) => {
    setCurrentSpec(prev => ({
      ...prev,
      machiningSteps: prev.machiningSteps.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            ← Back to Components
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            🔧 Ferrules Documentation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Document ferrule specifications, materials, and assembly processes
          </p>
          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💾 Currently saving to browser storage. Data will persist until you clear browser data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              {isEditing ? 'Edit Ferrule' : 'Add New Ferrule'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={currentSpec.name}
                  onChange={(e) => setCurrentSpec(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g., Standard Brass Ferrule"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Diameter
                  </label>
                  <input
                    type="text"
                    value={currentSpec.diameter}
                    onChange={(e) => setCurrentSpec(prev => ({ ...prev, diameter: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 13mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Length
                  </label>
                  <input
                    type="text"
                    value={currentSpec.length}
                    onChange={(e) => setCurrentSpec(prev => ({ ...prev, length: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 20mm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={currentSpec.material}
                  onChange={(e) => setCurrentSpec(prev => ({ ...prev, material: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g., Brass, Stainless Steel, Fiber"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Pin Style
                </label>
                <input
                  type="text"
                  value={currentSpec.buildStyle}
                  onChange={(e) => setCurrentSpec(prev => ({ ...prev, buildStyle: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="e.g., Threaded, Press-fit, Glue-on"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Machining Steps
                </label>
                {currentSpec.machiningSteps.map((step, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateMachiningStep(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder={`Step ${index + 1}`}
                    />
                    {currentSpec.machiningSteps.length > 1 && (
                      <button
                        onClick={() => removeMachiningStep(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addMachiningStep}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  + Add Step
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Assembly Notes
                </label>
                <textarea
                  value={currentSpec.assemblyNotes}
                  onChange={(e) => setCurrentSpec(prev => ({ ...prev, assemblyNotes: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Installation notes, tools required, tips, etc."
                />
              </div>

              <div>
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="vaultPlate"
                    checked={currentSpec.vaultPlate}
                    onChange={(e) => setCurrentSpec(prev => ({ ...prev, vaultPlate: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="vaultPlate" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Vault Plate
                  </label>
                </div>
                
                {currentSpec.vaultPlate && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Material
                      </label>
                      <input
                        type="text"
                        value={currentSpec.vaultPlateMaterial || ''}
                        onChange={(e) => setCurrentSpec(prev => ({ ...prev, vaultPlateMaterial: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        placeholder="e.g., Brass, Steel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Thickness
                      </label>
                      <input
                        type="text"
                        value={currentSpec.vaultPlateThickness || ''}
                        onChange={(e) => setCurrentSpec(prev => ({ ...prev, vaultPlateThickness: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        placeholder="e.g., 1mm, 0.5mm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? 'Update' : 'Save'} Ferrule
                </button>
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setCurrentSpec({
                        id: '',
                        name: '',
                        diameter: '',
                        length: '',
                        material: '',
                        buildStyle: '',
                        machiningSteps: [''],
                        assemblyNotes: '',
                        vaultPlate: false,
                        vaultPlateMaterial: '',
                        vaultPlateThickness: ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Specs List Section */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              Saved Ferrule Specifications
            </h2>
            
            {specs.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No ferrule specifications saved yet. Add one using the form on the left.
              </p>
            ) : (
              <div className="space-y-4">
                {specs.map((spec) => (
                  <div
                    key={spec.id}
                    className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {spec.name}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(spec)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(spec.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 mb-3">
                      <div><strong>Diameter:</strong> {spec.diameter}</div>
                      <div><strong>Length:</strong> {spec.length}</div>
                      <div><strong>Material:</strong> {spec.material}</div>
                      <div><strong>Build Style:</strong> {spec.buildStyle}</div>
                      {spec.vaultPlate && (
                        <>
                          <div><strong>Vault Plate:</strong> Yes</div>
                          <div><strong>VP Material:</strong> {spec.vaultPlateMaterial || 'Not specified'}</div>
                          <div><strong>VP Thickness:</strong> {spec.vaultPlateThickness || 'Not specified'}</div>
                        </>
                      )}
                    </div>
                    {spec.machiningSteps.length > 0 && spec.machiningSteps[0] && (
                      <div className="mb-3">
                        <strong className="text-sm text-slate-700 dark:text-slate-300">Machining Steps:</strong>
                        <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {spec.machiningSteps.filter(step => step.trim()).map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {spec.assemblyNotes && (
                      <div>
                        <strong className="text-sm text-slate-700 dark:text-slate-300">Assembly Notes:</strong>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {spec.assemblyNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}