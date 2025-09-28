'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';

interface PinSpec {
  id: string;
  name: string;
  diameter: string;
  length: string;
  material: string;
  buildStyle: string;
  machiningSteps: string[];
  assemblyNotes: string;
}

export default function PinsPage() {
  const [specs, setSpecs] = useState<PinSpec[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<PinSpec>({
    id: '',
    name: '',
    diameter: '',
    length: '',
    material: '',
    buildStyle: '',
    machiningSteps: [''],
    assemblyNotes: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Fetch pins from database on component mount
  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    try {
      setLoading(true);
      setDatabaseError(null);

      if (!isFirebaseConfigured()) {
        console.log('Firebase not configured, loading from localStorage');
        const localSpecs = JSON.parse(localStorage.getItem('pins') || '[]');
        setSpecs(localSpecs);
        setLoading(false);
        return;
      }

      const db = getFirestore();
      if (!db) {
        const localSpecs = JSON.parse(localStorage.getItem('pins') || '[]');
        setSpecs(localSpecs);
        setDatabaseError('Firebase not configured - using browser storage');
        setLoading(false);
        return;
      }

      const pinsCollection = collection(db, 'pins');
      const q = query(pinsCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const pinsList: PinSpec[] = [];
      querySnapshot.forEach((doc) => {
        pinsList.push({
          id: doc.id,
          ...doc.data()
        } as PinSpec);
      });
      
      setSpecs(pinsList);
      console.log('Pins loaded from Firebase:', pinsList);
    } catch (error) {
      console.error('Error fetching pins:', error);
      setDatabaseError('Failed to load pins from database. Using local storage as fallback.');
      
      // Fallback to localStorage
      const localSpecs = JSON.parse(localStorage.getItem('pins') || '[]');
      setSpecs(localSpecs);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSpec.name.trim()) {
      alert('Please enter a pin name');
      return;
    }

    try {
      setSaving(true);
      setDatabaseError(null);

      if (!isFirebaseConfigured()) {
        console.log('Firebase not configured, saving to localStorage');
        saveToLocalStorage();
        return;
      }

      const db = getFirestore();
      if (!db) {
        saveToLocalStorage();
        return;
      }

      const pinsCollection = collection(db, 'pins');

      const specData = {
        ...currentSpec,
        updatedAt: Timestamp.now()
      };

      if (currentSpec.id) {
        // Update existing pin
        const pinDoc = doc(db, 'pins', currentSpec.id);
        await updateDoc(pinDoc, specData);
        console.log('Pin updated in Firebase');
      } else {
        // Add new pin
        const docRef = await addDoc(pinsCollection, {
          ...specData,
          createdAt: Timestamp.now()
        });
        console.log('Pin added to Firebase with ID:', docRef.id);
      }

      await fetchPins(); // Refresh the list
      resetForm();
    } catch (error) {
      console.error('Error saving pin:', error);
      setDatabaseError('Failed to save to database. Saving locally instead.');
      saveToLocalStorage();
    } finally {
      setSaving(false);
    }
  };

  const saveToLocalStorage = () => {
    let updatedSpecs;
    
    if (currentSpec.id) {
      // Update existing
      updatedSpecs = specs.map(spec => 
        spec.id === currentSpec.id ? currentSpec : spec
      );
    } else {
      // Add new
      const newSpec = {
        ...currentSpec,
        id: Date.now().toString()
      };
      updatedSpecs = [...specs, newSpec];
    }
    
    setSpecs(updatedSpecs);
    localStorage.setItem('pins', JSON.stringify(updatedSpecs));
    resetForm();
    console.log('Pin saved to localStorage');
  };

  const handleEdit = (spec: PinSpec) => {
    setCurrentSpec(spec);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pin?')) {
      return;
    }

    try {
      setDatabaseError(null);

      if (!isFirebaseConfigured()) {
        console.log('Firebase not configured, deleting from localStorage');
        const updatedSpecs = specs.filter(spec => spec.id !== id);
        setSpecs(updatedSpecs);
        localStorage.setItem('pins', JSON.stringify(updatedSpecs));
        return;
      }

      const db = getFirestore();
      if (!db) {
        const updatedSpecs = specs.filter(spec => spec.id !== id);
        setSpecs(updatedSpecs);
        localStorage.setItem('pins', JSON.stringify(updatedSpecs));
        return;
      }

      await deleteDoc(doc(db, 'pins', id));
      console.log('Pin deleted from Firebase');
      
      await fetchPins(); // Refresh the list
    } catch (error) {
      console.error('Error deleting pin:', error);
      setDatabaseError('Failed to delete from database. Please try again.');
    }
  };

  const resetForm = () => {
    setCurrentSpec({
      id: '',
      name: '',
      diameter: '',
      length: '',
      material: '',
      buildStyle: '',
      machiningSteps: [''],
      assemblyNotes: ''
    });
    setIsEditing(false);
  };

  const addMachiningStep = () => {
    setCurrentSpec({
      ...currentSpec,
      machiningSteps: [...currentSpec.machiningSteps, '']
    });
  };

  const updateMachiningStep = (index: number, value: string) => {
    const updatedSteps = [...currentSpec.machiningSteps];
    updatedSteps[index] = value;
    setCurrentSpec({
      ...currentSpec,
      machiningSteps: updatedSteps
    });
  };

  const removeMachiningStep = (index: number) => {
    if (currentSpec.machiningSteps.length > 1) {
      const updatedSteps = currentSpec.machiningSteps.filter((_, i) => i !== index);
      setCurrentSpec({
        ...currentSpec,
        machiningSteps: updatedSteps
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading pins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 inline-flex items-center"
            >
              ← Back to Components
            </Link>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Pin Documentation
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Document pin specifications, materials, dimensions, and assembly details
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {isEditing ? 'Cancel' : 'Add New Pin'}
          </button>
        </div>

        {/* Database Error Alert */}
        {databaseError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Database Connection Issue
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>{databaseError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          {isEditing && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                {currentSpec.id ? 'Edit Pin' : 'Add New Pin'}
              </h2>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pin Name *
                    </label>
                    <input
                      type="text"
                      value={currentSpec.name}
                      onChange={(e) => setCurrentSpec({...currentSpec, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., Standard Pin, Custom Pin"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Material
                    </label>
                    <input
                      type="text"
                      value={currentSpec.material}
                      onChange={(e) => setCurrentSpec({...currentSpec, material: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., Stainless Steel, Brass"
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Diameter
                    </label>
                    <input
                      type="text"
                      value={currentSpec.diameter}
                      onChange={(e) => setCurrentSpec({...currentSpec, diameter: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., 5/16&quot;, 8mm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Length
                    </label>
                    <input
                      type="text"
                      value={currentSpec.length}
                      onChange={(e) => setCurrentSpec({...currentSpec, length: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., 1&quot;, 25mm"
                    />
                  </div>
                </div>

                {/* Build Style */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Build Style
                  </label>
                  <input
                    type="text"
                    value={currentSpec.buildStyle}
                    onChange={(e) => setCurrentSpec({...currentSpec, buildStyle: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., Pressed, Threaded, Tapered"
                  />
                </div>

                {/* Machining Steps */}
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
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                        placeholder={`Step ${index + 1}`}
                      />
                      {currentSpec.machiningSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMachiningStep(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMachiningStep}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    + Add Step
                  </button>
                </div>

                {/* Assembly Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Assembly Notes
                  </label>
                  <textarea
                    value={currentSpec.assemblyNotes}
                    onChange={(e) => setCurrentSpec({...currentSpec, assemblyNotes: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                    rows={4}
                    placeholder="Assembly instructions, special considerations, etc."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : (currentSpec.id ? 'Update Pin' : 'Save Pin')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-slate-500 hover:bg-slate-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List Section */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 ${isEditing ? '' : 'lg:col-span-2'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Saved Pins ({specs.length})
              </h2>
            </div>

            {specs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📍</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No pins documented yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Start documenting your pin specifications by adding your first pin.
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add Your First Pin
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {specs.map((spec) => (
                  <div key={spec.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {spec.name}
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Material:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.material || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Diameter:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.diameter || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Length:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.length || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Build Style:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.buildStyle || 'Not specified'}</div>
                          </div>
                        </div>

                        {spec.machiningSteps.length > 0 && spec.machiningSteps[0] && (
                          <div className="mb-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Machining Steps:</span>
                            <ol className="list-decimal list-inside text-sm text-slate-700 dark:text-slate-300 mt-1 space-y-1">
                              {spec.machiningSteps.map((step, index) => (
                                step && <li key={index}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {spec.assemblyNotes && (
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Assembly Notes:</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{spec.assemblyNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(spec)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2"
                          title="Edit pin"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(spec.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2"
                          title="Delete pin"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
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