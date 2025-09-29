import { MachiningStep } from './types';

// Unit detection and conversion utilities
export interface ParsedDimension {
  value: number;
  unit: 'inches' | 'mm' | 'cm';
  originalString: string;
}

export const parseDimensionWithUnit = (value: string | number | unknown): ParsedDimension => {
  if (typeof value === 'number') {
    return { value, unit: 'inches', originalString: value.toString() };
  }
  
  if (typeof value !== 'string') {
    return { value: 0, unit: 'inches', originalString: '' };
  }

  const originalString = value.trim();
  const lowerValue = originalString.toLowerCase();

  // Check for metric units
  if (lowerValue.includes('mm')) {
    const numericPart = lowerValue.replace(/mm/g, '').trim();
    return { 
      value: parseValue(numericPart), 
      unit: 'mm', 
      originalString 
    };
  }
  
  if (lowerValue.includes('cm')) {
    const numericPart = lowerValue.replace(/cm/g, '').trim();
    return { 
      value: parseValue(numericPart), 
      unit: 'cm', 
      originalString 
    };
  }

  // Default to inches if no unit specified
  return { 
    value: parseValue(originalString), 
    unit: 'inches', 
    originalString 
  };
};

// Convert any dimension to inches for consistent calculations
export const convertToInches = (dimension: ParsedDimension): number => {
  switch (dimension.unit) {
    case 'mm':
      return dimension.value / 25.4; // 1 inch = 25.4 mm
    case 'cm':
      return dimension.value / 2.54; // 1 inch = 2.54 cm
    case 'inches':
    default:
      return dimension.value;
  }
};

// Format dimension for display with appropriate unit
export const formatDimension = (dimension: ParsedDimension): string => {
  if (dimension.unit === 'inches') {
    // Try to convert to fraction if it's a common fraction
    const fractions = [
      { decimal: 0.0625, fraction: '1/16' },
      { decimal: 0.125, fraction: '1/8' },
      { decimal: 0.1875, fraction: '3/16' },
      { decimal: 0.25, fraction: '1/4' },
      { decimal: 0.3125, fraction: '5/16' },
      { decimal: 0.375, fraction: '3/8' },
      { decimal: 0.4375, fraction: '7/16' },
      { decimal: 0.5, fraction: '1/2' },
      { decimal: 0.5625, fraction: '9/16' },
      { decimal: 0.625, fraction: '5/8' },
      { decimal: 0.6875, fraction: '11/16' },
      { decimal: 0.75, fraction: '3/4' },
      { decimal: 0.8125, fraction: '13/16' },
      { decimal: 0.875, fraction: '7/8' },
      { decimal: 0.9375, fraction: '15/16' }
    ];
    
    const wholePart = Math.floor(dimension.value);
    const fractionalPart = dimension.value - wholePart;
    
    // Check if fractional part matches a common fraction (within tolerance)
    const matchingFraction = fractions.find(f => Math.abs(f.decimal - fractionalPart) < 0.001);
    
    if (matchingFraction) {
      return wholePart > 0 ? `${wholePart} ${matchingFraction.fraction}"` : `${matchingFraction.fraction}"`;
    }
    
    // Fall back to decimal with " for inches
    return `${dimension.value.toFixed(3)}"`;
  }
  
  // For metric, return with unit
  return `${dimension.value.toFixed(1)}${dimension.unit}`;
};

export const parseValue = (value: string | number | unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  // Handle fractions like "1/2", "3/4", etc.
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number);
    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  
  // Handle decimal values
  const numericValue = parseFloat(value);
  return isNaN(numericValue) ? 0 : numericValue;
};

export const getMaxDiameter = (machiningSteps: MachiningStep[]): number => {
  let maxDiameter = 0;
  machiningSteps.forEach(step => {
    if (typeof step === 'object' && step.size) {
      const dimension = parseDimensionWithUnit(step.size);
      const diameter = convertToInches(dimension);
      if (diameter > maxDiameter) maxDiameter = diameter;
    }
  });
  return maxDiameter;
};

export const getMaxDepth = (machiningSteps: MachiningStep[], exposedLength?: string | unknown, materialLength?: string | unknown): number => {
  let maxDepth = 0;
  machiningSteps.forEach(step => {
    if (typeof step === 'object' && step.depth) {
      const dimension = parseDimensionWithUnit(step.depth);
      const depth = convertToInches(dimension);
      if (depth > maxDepth) maxDepth = depth;
    }
  });
  if (exposedLength) {
    const dimension = parseDimensionWithUnit(exposedLength);
    const exposed = convertToInches(dimension);
    if (exposed > maxDepth) maxDepth = exposed;
  }
  // For ferrules, use material length as the overall length
  if (materialLength) {
    const dimension = parseDimensionWithUnit(materialLength);
    const length = convertToInches(dimension);
    if (length > maxDepth) maxDepth = length;
  }
  return maxDepth;
};