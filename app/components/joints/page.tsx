'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { JointSpec } from '@/app/components/shared/types';

import MachiningStepsEditor from '@/app/components/shared/MachiningStepsEditor';
import TechnicalDrawing from '@/app/components/shared/TechnicalDrawing';
import SpecificationCard from '@/app/components/shared/SpecificationCard';
import SearchFilter from '@/app/components/shared/SearchFilter';

export default function JointsPage() {
  const [specs, setSpecs] = useState<JointSpec[]>([]);
  const [filteredSpecs, setFilteredSpecs] = useState<JointSpec[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<JointSpec>({
    id: '',
    name: '',
    diameter: '',
    manufacture: '',
    machiningSteps: [],
    assemblyNotes: '',
    hasInsert: false,
    insertMaterial: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  // Fetch joints from database on component mount
  useEffect(() => {
    fetchJoints();
  }, []);

  const fetchJoints = async () => {
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
      
      const jointsCollection = collection(db, 'joints');
      const jointsQuery = query(jointsCollection, orderBy('name'));
      const querySnapshot = await getDocs(jointsQuery);
      
      const jointsData: JointSpec[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Migrate machining steps and insert fields to ensure backward compatibility
        const migratedData = {
          ...data,
          machiningSteps: data.machiningSteps || [],
          hasInsert: data.hasInsert ?? false,
          insertMaterial: data.insertMaterial || ''
        };
        jointsData.push({
          id: doc.id,
          ...migratedData
        } as JointSpec);
      });
      
      setSpecs(jointsData);
      setFilteredSpecs(jointsData);
      setDatabaseError(null);
    } catch (error) {
      console.error('Error fetching joints:', error);
      setDatabaseError('Failed to load joints from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSpec.name.trim()) {
      alert('Please enter a joint name');
      return;
    }

    if (!isFirebaseConfigured()) {
      setDatabaseError('Firebase is not configured. Cannot save joints.');
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
        // Update existing joint
        await updateDoc(doc(db, 'joints', currentSpec.id), {
          name: currentSpec.name,
          diameter: currentSpec.diameter,
          manufacture: currentSpec.manufacture,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          hasInsert: currentSpec.hasInsert,
          insertMaterial: currentSpec.insertMaterial,
          updatedAt: Timestamp.now()
        });
      } else {
        // Add new joint
        await addDoc(collection(db, 'joints'), {
          name: currentSpec.name,
          diameter: currentSpec.diameter,
          manufacture: currentSpec.manufacture,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          hasInsert: currentSpec.hasInsert,
          insertMaterial: currentSpec.insertMaterial,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      handleCancel();
      await fetchJoints(); // Refresh the list
      setDatabaseError(null);
    } catch (error) {
      console.error('Error saving joint:', error);
      setDatabaseError('Failed to save joint to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (spec: JointSpec) => {
    setCurrentSpec(spec);
    setIsEditing(true);
  };

  const handleDuplicate = (spec: JointSpec) => {
    setCurrentSpec({
      ...spec,
      id: '', // Clear ID for new record
      name: `${spec.name} (Copy)`
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this joint?')) {
      return;
    }

    if (!isFirebaseConfigured()) {
      setDatabaseError('Firebase is not configured. Cannot delete joints.');
      return;
    }

    try {
      const db = getFirestore();
      if (!db) {
        setDatabaseError('Failed to initialize database connection.');
        return;
      }
      
      await deleteDoc(doc(db, 'joints', id));
      await fetchJoints(); // Refresh the list
      setDatabaseError(null);
    } catch (error) {
      console.error('Error deleting joint:', error);
      setDatabaseError('Failed to delete joint from database.');
    }
  };

  const handleCancel = () => {
    setCurrentSpec({
      id: '',
      name: '',
      diameter: '',
      manufacture: '',
      machiningSteps: [],
      assemblyNotes: '',
      hasInsert: false,
      insertMaterial: ''
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading joints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Pool Cue Components
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Joint Documentation</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Document joint specifications, machining steps, and assembly notes</p>
            </div>
            
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              New Joint
            </button>
          </div>
        </div>

        {databaseError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{databaseError}</p>
          </div>
        )}

        {isEditing && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              {currentSpec.id ? 'Edit Joint' : 'New Joint'}
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Joint Name *
                  </label>
                  <input
                    type="text"
                    value={currentSpec.name}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 5/16-18 Pin Joint, 3/8-10 Pin Joint"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Manufacture
                  </label>
                  <input
                    type="text"
                    value={currentSpec.manufacture}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, manufacture: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., Predator, Kamui, McDermott"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Finished Joint Diameter
                  </label>
                  <input
                    type="text"
                    value={currentSpec.diameter}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, diameter: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    placeholder="e.g., 0.500, 1/2"
                  />
                </div>
              </div>

              {/* Insert Options */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasInsert"
                    checked={currentSpec.hasInsert}
                    onChange={(e) => setCurrentSpec({ ...currentSpec, hasInsert: e.target.checked, insertMaterial: e.target.checked ? currentSpec.insertMaterial : '' })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="hasInsert" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                    Has Insert
                  </label>
                </div>

                {currentSpec.hasInsert && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Insert Material
                    </label>
                    <input
                      type="text"
                      value={currentSpec.insertMaterial || ''}
                      onChange={(e) => setCurrentSpec({ ...currentSpec, insertMaterial: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., Brass, Stainless Steel, Phenolic"
                    />
                  </div>
                )}
              </div>

              {/* Machining Steps and Technical Drawing */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Machining Steps - Left Side */}
                <div className="lg:col-span-2">
                  <MachiningStepsEditor
                    spec={currentSpec}
                    onUpdate={(updatedSpec) => setCurrentSpec(updatedSpec as JointSpec)}
                  />
                </div>
                
                {/* Technical Drawing - Right Side */}
                {(currentSpec.machiningSteps.length > 0 || currentSpec.diameter) && (
                  <div className="lg:col-span-1">
                    <TechnicalDrawing spec={currentSpec} />
                  </div>
                )}
              </div>

              {/* Assembly Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Assembly Notes
                </label>
                <textarea
                  value={currentSpec.assemblyNotes}
                  onChange={(e) => setCurrentSpec({ ...currentSpec, assemblyNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  rows={4}
                  placeholder="Document assembly procedures, special requirements, or notes..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : (currentSpec.id ? 'Update Joint' : 'Save Joint')}
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

        {/* Joints List */}
        <div className="space-y-6">
          
          {specs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No joints documented yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Start by creating your first joint specification</p>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create First Joint
              </button>
            </div>
          ) : (
            <>
              <SearchFilter
                items={specs}
                onFilteredItems={setFilteredSpecs}
                placeholder="Search joints by name, build style, diameter..."
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