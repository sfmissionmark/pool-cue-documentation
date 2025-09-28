'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';

interface MachiningStep {
  id: string;
  process: string;
  size?: string;
  depth?: string;
  threadSize?: string;
  finalDiameter?: string;
  unit: 'inches' | 'mm';
}

interface PinSpec {
  id: string;
  name: string;
  buildStyle: string;
  exposedLength: string;
  machiningSteps: MachiningStep[];
  assemblyNotes: string;
}

// Technical Drawing Modal Component
const TechnicalDrawingModal = ({ spec, isOpen, onClose }: { spec: PinSpec; isOpen: boolean; onClose: () => void }) => {
  const [zoom, setZoom] = useState(1);
  
  const parseValue = (value: string | undefined): number => {
    if (!value) return 0;
    // Handle fractions like 1/4, 3/8, etc.
    if (value.includes('/')) {
      const [num, den] = value.split('/').map(n => parseFloat(n.trim()));
      return num / den;
    }
    return parseFloat(value) || 0;
  };

  const getMaxDiameter = () => {
    let maxDiam = 0.5; // Default diameter
    spec.machiningSteps.forEach(step => {
      if (step.process === 'Drill' && step.size) {
        const diam = parseValue(step.size);
        if (diam > maxDiam) maxDiam = diam;
      }
      if (step.process === 'Bore' && step.finalDiameter) {
        const diam = parseValue(step.finalDiameter);
        if (diam > maxDiam) maxDiam = diam;
      }
    });
    return maxDiam;
  };

  const getMaxDepth = () => {
    let maxDepth = 1; // Default length
    spec.machiningSteps.forEach(step => {
      if (step.process === 'Drill' && step.depth) {
        const depth = parseValue(step.depth);
        if (depth > maxDepth) maxDepth = depth;
      }
    });
    if (spec.exposedLength) {
      const exposed = parseValue(spec.exposedLength);
      if (exposed > maxDepth) maxDepth = exposed;
    }
    return maxDepth;
  };

  // Create a profile by analyzing all machining operations starting from zero
  const generateProfile = () => {
    const maxDiam = getMaxDiameter();
    const maxDepth = getMaxDepth();
    const originalRadius = maxDiam / 2;
    
    // Sort machining steps by depth (shallowest first, as they would be machined)
    const sortedSteps = [...spec.machiningSteps]
      .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
      .sort((a, b) => parseValue(a.depth || '0') - parseValue(b.depth || '0'));
    
    // Create profile segments - start from zero and machine inward
    const profile = [];
    let currentDepth = 0;
    
    if (sortedSteps.length > 0) {
      // Process each machining step starting from zero
      for (let i = 0; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];
        const stepDepth = parseValue(step.depth || '0');
        const stepRadius = parseValue(step.size || '0') / 2;
        
        // Add the machined section (from current depth to step depth)
        profile.push({
          startDepth: currentDepth,  // Distance from zero
          endDepth: stepDepth,       // Distance from zero
          radius: stepRadius,        // Inner radius of machined area
          type: step.process,
          outerRadius: originalRadius // Original material radius
        });
        
        currentDepth = stepDepth;
      }
      
      // Add remaining solid section if any
      if (currentDepth < maxDepth) {
        profile.push({
          startDepth: currentDepth,
          endDepth: maxDepth,
          radius: originalRadius,
          type: 'solid',
          outerRadius: originalRadius
        });
      }
    } else {
      // No machining operations, just solid body
      profile.push({
        startDepth: 0,
        endDepth: maxDepth,
        radius: originalRadius,
        type: 'solid',
        outerRadius: originalRadius
      });
    }
    
    return profile;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const maxDiameter = getMaxDiameter();
  const maxDepth = getMaxDepth();
  const baseScale = 120; // Larger scale for detailed view
  const scale = baseScale * zoom;
  const centerY = 200;
  const rightX = 600; // Start from right side (0 position)
  const leftX = rightX - (maxDepth * scale); // Calculate left position
  const profile = generateProfile();
  const svgWidth = Math.max(800, Math.abs(leftX - rightX) + 200);
  const svgHeight = Math.max(400, (maxDiameter * scale) + 200);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Technical Drawing - {spec.name}</h2>
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
              >
                −
              </button>
              <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm"
              >
                +
              </button>
            </div>
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Print
            </button>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Drawing Area */}
        <div className="flex-1 overflow-auto bg-white p-4">
          <div className="flex justify-center">
            <svg width={svgWidth} height={svgHeight} className="bg-white border border-slate-200">
              {/* Create the subtractive profile - machining from zero (right) inward */}
              <g>
                {profile.map((segment, index) => {
                  // Calculate X positions: startDepth and endDepth are distances from zero (rightX)
                  const segmentStartX = rightX - (segment.startDepth * scale); // Starting point from zero
                  const segmentEndX = rightX - (segment.endDepth * scale);     // Ending point from zero
                  const innerRadius = segment.radius * scale;
                  const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
                  
                  return (
                    <g key={`segment-${index}`}>
                      {/* Top outer profile line */}
                      <line
                        x1={segmentStartX}
                        y1={centerY - outerRadius}
                        x2={segmentEndX}
                        y2={centerY - outerRadius}
                        stroke="#000000"
                        strokeWidth="2"
                      />
                      {/* Bottom outer profile line */}
                      <line
                        x1={segmentStartX}
                        y1={centerY + outerRadius}
                        x2={segmentEndX}
                        y2={centerY + outerRadius}
                        stroke="#000000"
                        strokeWidth="2"
                      />
                      
                      {/* For machined sections, show the inner profile */}
                      {segment.type !== 'solid' && (
                        <>
                          {/* Top inner profile line */}
                          <line
                            x1={segmentStartX}
                            y1={centerY - innerRadius}
                            x2={segmentEndX}
                            y2={centerY - innerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          {/* Bottom inner profile line */}
                          <line
                            x1={segmentStartX}
                            y1={centerY + innerRadius}
                            x2={segmentEndX}
                            y2={centerY + innerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                        </>
                      )}
                      
                      {/* Vertical transitions between segments */}
                      {index === 0 && (
                        /* End face at zero position (right side) */
                        <>
                          <line
                            x1={rightX}
                            y1={centerY - outerRadius}
                            x2={rightX}
                            y2={centerY - innerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          <line
                            x1={rightX}
                            y1={centerY + innerRadius}
                            x2={rightX}
                            y2={centerY + outerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                        </>
                      )}
                      
                      {/* Step transition at the end of machined section */}
                      {index < profile.length - 1 && segment.type !== 'solid' && (
                        <>
                          <line
                            x1={segmentEndX}
                            y1={centerY - outerRadius}
                            x2={segmentEndX}
                            y2={centerY - innerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                          <line
                            x1={segmentEndX}
                            y1={centerY + innerRadius}
                            x2={segmentEndX}
                            y2={centerY + outerRadius}
                            stroke="#000000"
                            strokeWidth="2"
                          />
                        </>
                      )}
                    </g>
                  );
                })}
                
                {/* Left end cap (back of part) */}
                <line
                  x1={leftX}
                  y1={centerY - (maxDiameter * scale / 2)}
                  x2={leftX}
                  y2={centerY + (maxDiameter * scale / 2)}
                  stroke="#000000"
                  strokeWidth="2"
                />
              </g>

              {/* Cross-hatching for machined areas - starting from zero */}
              {profile.map((segment, index) => {
                if (segment.type !== 'solid') {
                  const segmentStartX = rightX - (segment.startDepth * scale);
                  const segmentEndX = rightX - (segment.endDepth * scale);
                  const innerRadius = segment.radius * scale;
                  const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
                  const segmentWidth = segmentStartX - segmentEndX;
                  
                  // Add cross-hatch pattern to show removed material
                  const hatchLines = [];
                  for (let i = 0; i < segmentWidth; i += 12 * zoom) {
                    // Top material removal
                    hatchLines.push(
                      <line
                        key={`hatch-top-${index}-${i}`}
                        x1={segmentEndX + i}
                        y1={centerY - outerRadius}
                        x2={segmentEndX + i + (8 * zoom)}
                        y2={centerY - innerRadius}
                        stroke="#000000"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                    );
                    // Bottom material removal
                    hatchLines.push(
                      <line
                        key={`hatch-bottom-${index}-${i}`}
                        x1={segmentEndX + i}
                        y1={centerY + innerRadius}
                        x2={segmentEndX + i + (8 * zoom)}
                        y2={centerY + outerRadius}
                        stroke="#000000"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                    );
                  }
                  return <g key={`hatch-segment-${index}`}>{hatchLines}</g>;
                }
                return null;
              })}

              {/* Center line */}
              <line
                x1={leftX - 30}
                y1={centerY}
                x2={rightX + 30}
                y2={centerY}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="8,8"
              />
              
              {/* Zero reference line at right */}
              <line
                x1={rightX}
                y1={centerY - (maxDiameter * scale / 2) - 20}
                x2={rightX}
                y2={centerY + (maxDiameter * scale / 2) + 60}
                stroke="#000000"
                strokeWidth="1"
              />
              
              {/* Zero label */}
              <text x={rightX + 8} y={centerY + (maxDiameter * scale / 2) + 50} fontSize="16" fill="#000000">
                0
              </text>

              {/* Dimensions */}
              {maxDepth > 0 && (
                <g>
                  {/* Length dimension */}
                  <line 
                    x1={leftX} 
                    y1={centerY + (maxDiameter * scale / 2) + 30} 
                    x2={rightX} 
                    y2={centerY + (maxDiameter * scale / 2) + 30} 
                    stroke="#000000" 
                    strokeWidth="1"
                  />
                  <line 
                    x1={leftX} 
                    y1={centerY + (maxDiameter * scale / 2) + 25} 
                    x2={leftX} 
                    y2={centerY + (maxDiameter * scale / 2) + 35} 
                    stroke="#000000" 
                    strokeWidth="1"
                  />
                  <line 
                    x1={rightX} 
                    y1={centerY + (maxDiameter * scale / 2) + 25} 
                    x2={rightX} 
                    y2={centerY + (maxDiameter * scale / 2) + 35} 
                    stroke="#000000" 
                    strokeWidth="1"
                  />
                  <text 
                    x={(leftX + rightX) / 2} 
                    y={centerY + (maxDiameter * scale / 2) + 50} 
                    textAnchor="middle" 
                    fontSize="14" 
                    fill="#000000"
                  >
                    {maxDepth.toFixed(3)}&quot;
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Machining Steps List */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 max-h-48 overflow-y-auto">
          <h3 className="font-semibold text-slate-900 mb-3">Machining Steps</h3>
          {spec.machiningSteps.length > 0 ? (
            <div className="space-y-2">
              {spec.machiningSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4 p-2 bg-white rounded border border-slate-200">
                  <span className="font-medium text-slate-600 w-8">{index + 1}.</span>
                  <span className="font-medium text-slate-900">{step.process}</span>
                  {step.size && <span className="text-slate-600">⌀{step.size}&quot;</span>}
                  {step.depth && <span className="text-slate-600">× {step.depth}&quot;</span>}
                  {step.threadSize && <span className="text-slate-600">Thread: {step.threadSize}</span>}
                  {step.finalDiameter && <span className="text-slate-600">Final ⌀{step.finalDiameter}&quot;</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">No machining steps defined.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Technical Drawing Component (Thumbnail)
const TechnicalDrawing = ({ spec }: { spec: PinSpec }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Technical Drawing</h4>
        <div 
          className="border border-slate-200 rounded-lg p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => setShowModal(true)}
        >
          <svg width="240" height="120" className="bg-white border border-slate-200">
            {/* Simplified thumbnail view */}
            <g>
              {/* Basic outline for thumbnail */}
              <rect
                x="40"
                y="40"
                width="160"
                height="40"
                fill="none"
                stroke="#000000"
                strokeWidth="2"
              />
              
              {/* Show some basic machining indication */}
              {spec.machiningSteps.length > 0 && (
                <>
                  <rect
                    x="160"
                    y="50"
                    width="30"
                    height="20"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1"
                  />
                  <line
                    x1="175"
                    y1="50"
                    x2="180"
                    y2="60"
                    stroke="#000000"
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                </>
              )}
              
              {/* Center line */}
              <line
                x1="30"
                y1="60"
                x2="210"
                y2="60"
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              
              {/* Zero reference */}
              <line
                x1="200"
                y1="30"
                x2="200"
                y2="90"
                stroke="#000000"
                strokeWidth="1"
              />
              <text x="203" y="88" fontSize="10" fill="#000000">0</text>
            </g>
          </svg>
          <p className="text-xs text-slate-600 mt-2 text-center">Click to view detailed drawing</p>
        </div>
      </div>
      
      <TechnicalDrawingModal 
        spec={spec} 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};

export default function PinsPage() {
  const [specs, setSpecs] = useState<PinSpec[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSpec, setCurrentSpec] = useState<PinSpec>({
    id: '',
    name: '',
    buildStyle: '',
    exposedLength: '',
    machiningSteps: [],
    assemblyNotes: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter specs based on search term
  const filteredSpecs = specs.filter(spec => 
    spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spec.buildStyle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (spec.exposedLength && spec.exposedLength.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (spec.assemblyNotes && spec.assemblyNotes.toLowerCase().includes(searchTerm.toLowerCase())) ||
    spec.machiningSteps.some(step => 
      step.process.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Fetch pins from database on component mount
  useEffect(() => {
    fetchPins();
    
    // Set up periodic refresh to sync changes
    const refreshInterval = setInterval(() => {
      if (isFirebaseConfigured()) {
        fetchPins();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
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
        
        // Update the currentSpec with the Firebase-generated ID
        setCurrentSpec(prevSpec => ({
          ...prevSpec,
          id: docRef.id
        }));
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

    // Validate the ID
    if (!id || id.trim() === '') {
      console.error('Invalid document ID for deletion:', id);
      setDatabaseError('Invalid document ID. Cannot delete pin.');
      return;
    }

    try {
      setSaving(true);
      console.log('Attempting to delete pin with ID:', id);
      
      if (isFirebaseConfigured()) {
        const db = getFirestore();
        if (!db) {
          throw new Error('Firebase not available');
        }
        
        // Create document reference and delete
        const docRef = doc(db, 'pins', id);
        console.log('Document reference created for:', docRef.path);
        await deleteDoc(docRef);
        console.log('Pin deleted from Firebase successfully');
        
        // Refresh data from Firebase
        await fetchPins();
      } else {
        // Update local state for localStorage fallback
        setSpecs(prev => prev.filter(spec => spec.id !== id));
        // Update localStorage
        const updatedSpecs = specs.filter(spec => spec.id !== id);
        localStorage.setItem('pins', JSON.stringify(updatedSpecs));
      }
      
      setDatabaseError(null);
    } catch (error) {
      console.error('Error deleting pin:', error);
      setDatabaseError('Failed to delete from database. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = (spec: PinSpec) => {
    const duplicatedSpec: PinSpec = {
      ...spec,
      id: '',
      name: `${spec.name} (Copy)`,
      machiningSteps: spec.machiningSteps.map(step => ({
        ...step,
        id: Math.random().toString(36).substr(2, 9)
      }))
    };
    setCurrentSpec(duplicatedSpec);
    setIsEditing(true);
  };

  const resetForm = () => {
    setCurrentSpec({
      id: '',
      name: '',
      buildStyle: '',
      exposedLength: '',
      machiningSteps: [],
      assemblyNotes: ''
    });
    setIsEditing(false);
  };

  const addMachiningStep = () => {
    const newStep: MachiningStep = {
      id: Date.now().toString(),
      process: 'Center Drill',
      unit: 'inches'
    };
    setCurrentSpec({
      ...currentSpec,
      machiningSteps: [...currentSpec.machiningSteps, newStep]
    });
  };

  const updateMachiningStep = (index: number, field: keyof MachiningStep, value: string) => {
    const updatedSteps = [...currentSpec.machiningSteps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    setCurrentSpec({
      ...currentSpec,
      machiningSteps: updatedSteps
    });
  };

  const removeMachiningStep = (index: number) => {
    const updatedSteps = currentSpec.machiningSteps.filter((_, i) => i !== index);
    setCurrentSpec({
      ...currentSpec,
      machiningSteps: updatedSteps
    });
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
              Document pin build styles, exposed lengths, machining steps, and assembly details
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPins()}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-lg transition-colors"
            >
              {loading ? '🔄' : '↻'} Refresh
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isEditing ? 'Cancel' : 'Add New Pin'}
            </button>
          </div>
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



                {/* Build Style and Exposed Length */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Build Style
                    </label>
                    <input
                      type="text"
                      value={currentSpec.buildStyle}
                      onChange={(e) => setCurrentSpec({...currentSpec, buildStyle: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., Quick-release, Big Pin, Small Pin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Exposed Length
                    </label>
                    <input
                      type="text"
                      value={currentSpec.exposedLength}
                      onChange={(e) => setCurrentSpec({...currentSpec, exposedLength: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                      placeholder="e.g., 1/4&quot;, 6mm"
                    />
                  </div>
                </div>

                {/* Machining Steps */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Machining Steps
                  </label>
                  {currentSpec.machiningSteps.map((step, index) => (
                    <div key={step.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">Step {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeMachiningStep(index)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Process
                          </label>
                          <select
                            value={step.process}
                            onChange={(e) => updateMachiningStep(index, 'process', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          >
                            <option value="Center Drill">Center Drill</option>
                            <option value="Drill">Drill</option>
                            <option value="Tap">Tap</option>
                            <option value="Bore">Bore</option>
                            <option value="Ream">Ream</option>
                            <option value="Face">Face</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Unit
                          </label>
                          <select
                            value={step.unit}
                            onChange={(e) => updateMachiningStep(index, 'unit', e.target.value as 'inches' | 'mm')}
                            className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                          >
                            <option value="inches">Inches</option>
                            <option value="mm">mm</option>
                          </select>
                        </div>
                        
                        {step.process === 'Drill' && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Size
                              </label>
                              <input
                                type="text"
                                value={step.size || ''}
                                onChange={(e) => updateMachiningStep(index, 'size', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                placeholder="e.g., 1/4, 6.35"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {step.process === 'Drill' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Depth
                            </label>
                            <input
                              type="text"
                              value={step.depth || ''}
                              onChange={(e) => updateMachiningStep(index, 'depth', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              placeholder="e.g., 0.5, 12"
                            />
                          </div>
                        )}
                        
                        {step.process === 'Tap' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Thread Size
                            </label>
                            <input
                              type="text"
                              value={step.threadSize || ''}
                              onChange={(e) => updateMachiningStep(index, 'threadSize', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              placeholder="e.g., 10-32, M6x1.0"
                            />
                          </div>
                        )}
                        
                        {step.process === 'Bore' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Final Diameter
                            </label>
                            <input
                              type="text"
                              value={step.finalDiameter || ''}
                              onChange={(e) => updateMachiningStep(index, 'finalDiameter', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              placeholder="e.g., 0.375, 9.5"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMachiningStep}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    + Add Machining Step
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

                {/* Technical Drawing */}
                {(currentSpec.machiningSteps.length > 0 || currentSpec.exposedLength) && (
                  <TechnicalDrawing spec={currentSpec} />
                )}

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

            {/* Search Field */}
            {specs.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Search Pins
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
                  placeholder="Search by name, build style, exposed length, or notes..."
                />
              </div>
            )}

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
            ) : filteredSpecs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No pins match your search
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Try adjusting your search terms or clear the search to see all pins.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSpecs.map((spec) => (
                  <div key={spec.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {spec.name}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Build Style:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.buildStyle || 'Not specified'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">Exposed Length:</span>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{spec.exposedLength || 'Not specified'}</div>
                          </div>
                        </div>

                        {spec.machiningSteps.length > 0 && (
                          <div className="mb-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Machining Steps:</span>
                            <ol className="list-decimal list-inside text-sm text-slate-700 dark:text-slate-300 mt-1 space-y-1">
                              {spec.machiningSteps.map((step, index) => (
                                <li key={step.id}>
                                  <span className="font-medium">{step.process}</span>
                                  {step.process === 'Drill' && step.size && (
                                    <span> - Size: {step.size}{step.unit === 'inches' ? '"' : 'mm'}</span>
                                  )}
                                  {step.process === 'Drill' && step.depth && (
                                    <span>, Depth: {step.depth}{step.unit === 'inches' ? '"' : 'mm'}</span>
                                  )}
                                  {step.process === 'Tap' && step.threadSize && (
                                    <span> - {step.threadSize}</span>
                                  )}
                                  {step.process === 'Bore' && step.finalDiameter && (
                                    <span> - Final Ø: {step.finalDiameter}{step.unit === 'inches' ? '"' : 'mm'}</span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {spec.assemblyNotes && (
                          <div className="mb-3">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Assembly Notes:</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{spec.assemblyNotes}</p>
                          </div>
                        )}

                        {/* Technical Drawing for saved pins */}
                        {(spec.machiningSteps.length > 0 || spec.exposedLength) && (
                          <div className="mt-3">
                            <TechnicalDrawing spec={spec} />
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
                          onClick={() => handleDuplicate(spec)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-2"
                          title="Duplicate pin"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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