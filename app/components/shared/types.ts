// Shared types for all cue components

export interface MachiningStep {
  id: string;
  process: 'Center Drill' | 'Drill' | 'Tap' | 'Bore' | 'Ream' | 'Face';
  size?: string;
  depth?: string;
  threadSize?: string;
  finalDiameter?: string;
  unit: 'inches' | 'mm';
}

export interface BaseSpec {
  id: string;
  name: string;
  manufacture: string;
  machiningSteps: MachiningStep[];
  assemblyNotes: string;
}

export interface PinSpec extends BaseSpec {
  exposedLength?: string;
}

export interface FerruleSpec extends BaseSpec {
  diameter: string;
  length: string;
  material: string;
  vaultPlate: boolean;
  vaultPlateMaterial?: string;
  vaultPlateThickness?: string;
}

export interface JointSpec extends BaseSpec {
  diameter: string;
  hasInsert: boolean;
  insertMaterial?: string;
}

export interface ModificationSpec extends BaseSpec {
  description: string;
  category: 'Weight' | 'Balance' | 'Grip' | 'Aesthetics' | 'Performance' | 'Other';
  difficulty: 'Easy' | 'Moderate' | 'Advanced' | 'Expert';
  timeEstimate?: string;
  toolsRequired?: string;
  materialsNeeded?: string;
}

export type ComponentSpec = PinSpec | FerruleSpec | JointSpec | ModificationSpec;