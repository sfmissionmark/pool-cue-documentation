'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ModificationSpec } from '@/app/components/shared/types';

import MachiningStepsEditor from '@/app/components/shared/MachiningStepsEditor';
import TechnicalDrawing from '@/app/components/shared/TechnicalDrawing';
import SpecificationCard from '@/app/components/shared/SpecificationCard';
import SearchFilter from '@/app/components/shared/SearchFilter';

export default function ModificationsPage() {
  const [specs, setSpecs] = useState<ModificationSpec[]>([]);
  const [filteredSpecs, setFilteredSpecs] = useState<ModificationSpec[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<ModificationSpec>({
    id: '',
    name: '',
    description: '',
    category: 'Other',
    difficulty: 'Easy',
    manufacture: '',
    machiningSteps: [],
    assemblyNotes: '',
    timeEstimate: '',
    toolsRequired: '',
    materialsNeeded: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Fetch modifications from database on component mount
  useEffect(() => {
    fetchModifications();
  }, []);

  const fetchModifications = async () => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      setDatabaseError('Firebase is not configured. Please check your configuration.');
      return;
    }

    try {
      const db = getFirestore();
      if (!db) {
        setDatabaseError('Failed to initialize database connection.');
        setLoading(false);
        return;
      }
      
      const modificationsCollection = collection(db, 'modifications');
      const modificationsQuery = query(modificationsCollection, orderBy('name'));
      const querySnapshot = await getDocs(modificationsQuery);
      
      const modificationsData: ModificationSpec[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Migrate fields to ensure backward compatibility
        const migratedData = {
          ...data,
          machiningSteps: data.machiningSteps || [],
          category: data.category || 'Other',
          difficulty: data.difficulty || 'Easy',
          timeEstimate: data.timeEstimate || '',
          toolsRequired: data.toolsRequired || '',
          materialsNeeded: data.materialsNeeded || ''
        };
        modificationsData.push({
          id: doc.id,
          ...migratedData
        } as ModificationSpec);
      });
      
      setSpecs(modificationsData);
      setFilteredSpecs(modificationsData);
      setDatabaseError(null);
    } catch (error) {
      console.error('Error fetching modifications:', error);
      setDatabaseError('Failed to load modifications from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSpec.name.trim()) {
      alert('Please enter a modification name');
      return;
    }

    if (!isFirebaseConfigured()) {
      setDatabaseError('Firebase is not configured. Cannot save modifications.');
      return;
    }

    setSaving(true);
    try {
      const db = getFirestore();
      if (!db) {
        setDatabaseError('Failed to initialize database connection.');
        setSaving(false);
        return;
      }
      
      if (currentSpec.id) {
        // Update existing modification
        await updateDoc(doc(db, 'modifications', currentSpec.id), {
          name: currentSpec.name,
          description: currentSpec.description,
          category: currentSpec.category,
          difficulty: currentSpec.difficulty,
          manufacture: currentSpec.manufacture,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          timeEstimate: currentSpec.timeEstimate,
          toolsRequired: currentSpec.toolsRequired,
          materialsNeeded: currentSpec.materialsNeeded,
          updatedAt: Timestamp.now()
        });
      } else {
        // Add new modification
        await addDoc(collection(db, 'modifications'), {
          name: currentSpec.name,
          description: currentSpec.description,
          category: currentSpec.category,
          difficulty: currentSpec.difficulty,
          manufacture: currentSpec.manufacture,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          timeEstimate: currentSpec.timeEstimate,
          toolsRequired: currentSpec.toolsRequired,
          materialsNeeded: currentSpec.materialsNeeded,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      handleCancel();
      await fetchModifications(); // Refresh the list
      setDatabaseError(null);
    } catch (error) {
      console.error('Error saving modification:', error);
      setDatabaseError('Failed to save modification to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (spec: ModificationSpec) => {
    setCurrentSpec(spec);
    setIsEditing(true);
  };

  const handleDuplicate = (spec: ModificationSpec) => {
    setCurrentSpec({
      ...spec,
      id: '', // Clear ID for new record
      name: `${spec.name} (Copy)`
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modification?')) {
      return;
    }

    if (!isFirebaseConfigured()) {
      setDatabaseError('Firebase is not configured. Cannot delete modifications.');
      return;
    }

    try {
      const db = getFirestore();
      if (!db) {
        setDatabaseError('Failed to initialize database connection.');
        return;
      }
      
      await deleteDoc(doc(db, 'modifications', id));
      await fetchModifications(); // Refresh the list
      setDatabaseError(null);
    } catch (error) {
      console.error('Error deleting modification:', error);
      setDatabaseError('Failed to delete modification from database.');
    }
  };

  const handleCancel = () => {
    setCurrentSpec({
      id: '',
      name: '',
      description: '',
      category: 'Other',
      difficulty: 'Easy',
      manufacture: '',
      machiningSteps: [],
      assemblyNotes: '',
      timeEstimate: '',
      toolsRequired: '',
      materialsNeeded: ''
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading modifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Cue Modifications
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Document cue modifications, custom work, and enhancement procedures
              </p>
            </div>
            <Link 
              href="/"
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ← Back to Components
            </Link>
          </div>

          {databaseError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              <p className="font-medium">Database Error</p>
              <p className="text-sm mt-1">{databaseError}</p>
            </div>
          )}

          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm"
          >
            + Add New Modification
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              {currentSpec.id ? 'Edit Modification' : 'Add New Modification'}
            </h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Modification Name *
                  </label>
                  <input
                    type="text"
                    value={currentSpec.name}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., Weight Bolt Addition, Custom Wrap, Tip Replacement"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Manufacturer/Creator
                  </label>
                  <input
                    type="text"
                    value={currentSpec.manufacture}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, manufacture: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., Custom Shop, OEM, DIY"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={currentSpec.description}
                  onChange={(e) => setCurrentSpec({ ...currentSpec, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  rows={3}
                  placeholder="Describe the modification, its purpose, and expected outcome..."
                  required
                />
              </div>

              {/* Category and Difficulty */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <select
                    value={currentSpec.category}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, category: e.target.value as ModificationSpec['category'] })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="Weight">Weight</option>
                    <option value="Balance">Balance</option>
                    <option value="Grip">Grip</option>
                    <option value="Aesthetics">Aesthetics</option>
                    <option value="Performance">Performance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={currentSpec.difficulty}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, difficulty: e.target.value as ModificationSpec['difficulty'] })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Time Estimate
                  </label>
                  <input
                    type="text"
                    value={currentSpec.timeEstimate || ''}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, timeEstimate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 2-3 hours, 1 day"
                  />
                </div>
              </div>

              {/* Tools and Materials */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tools Required
                  </label>
                  <textarea
                    value={currentSpec.toolsRequired || ''}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, toolsRequired: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    rows={3}
                    placeholder="List tools needed for this modification..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Materials Needed
                  </label>
                  <textarea
                    value={currentSpec.materialsNeeded || ''}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, materialsNeeded: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    rows={3}
                    placeholder="List materials, parts, or supplies needed..."
                  />
                </div>
              </div>

              {/* Machining Steps and Technical Drawing */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Machining Steps - Left Side */}
                <div className="lg:col-span-2">
                  <MachiningStepsEditor
                    spec={currentSpec}
                    onUpdate={(updatedSpec) => setCurrentSpec(updatedSpec as ModificationSpec)}
                  />
                </div>
                
                {/* Technical Drawing - Right Side */}
                {currentSpec.machiningSteps.length > 0 && (
                  <div className="lg:col-span-1">
                    <TechnicalDrawing spec={currentSpec} />
                  </div>
                )}
              </div>

              {/* Assembly Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Procedure Notes
                </label>
                <textarea
                  value={currentSpec.assemblyNotes}
                  onChange={(e) => setCurrentSpec({ ...currentSpec, assemblyNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  rows={4}
                  placeholder="Document step-by-step procedures, special requirements, safety notes, or tips..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : (currentSpec.id ? 'Update Modification' : 'Save Modification')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modifications List */}
        <div className="space-y-6">
          
          {specs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No modifications documented yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Start by creating your first modification specification</p>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create First Modification
              </button>
            </div>
          ) : (
            <>
              <SearchFilter
                items={specs}
                onFilteredItems={setFilteredSpecs}
                placeholder="Search modifications by name, category, difficulty..."
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredSpecs.map((spec) => (
                  <SpecificationCard
                    key={spec.id}
                    spec={spec}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}