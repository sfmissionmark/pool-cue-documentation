'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, DocumentReference, writeBatch } from 'firebase/firestore';

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
  id?: string;
  name: string;
  buildStyle: string;
  exposedLength: string;
  machiningSteps: MachiningStep[];
  assemblyNotes: string;
}

// Technical Drawing Modal Component - opens in new window
const TechnicalDrawingModal = ({ spec, isOpen, onClose }: { spec: PinSpec; isOpen: boolean; onClose: () => void }) => {
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

  // Create a profile by analyzing all machining operations to show stepped holes correctly
  const generateProfile = () => {
    const maxDiam = getMaxDiameter();
    const maxDepth = getMaxDepth();
    const originalRadius = maxDiam / 2;
    
    // Get all drill operations sorted by depth
    const drillOps = [...spec.machiningSteps]
      .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
      .map(step => ({
        depth: parseValue(step.depth || '0'),
        radius: parseValue(step.size || '0') / 2,
        process: step.process
      }))
      .sort((a, b) => a.depth - b.depth); // Sort by depth ascending (shallowest first)
    
    if (drillOps.length === 0) {
      // No machining operations, just solid body
      return [{
        startDepth: 0,
        endDepth: maxDepth,
        radius: originalRadius,
        type: 'solid',
        outerRadius: originalRadius,
        hasBottom: false
      }];
    }
    
    // Create depth points where the hole profile changes
    const depthPoints = [0, ...drillOps.map(op => op.depth), maxDepth];
    const uniqueDepths = [...new Set(depthPoints)].sort((a, b) => a - b);
    
    const profile = [];
    
    // For each depth segment, find the largest hole that reaches that depth
    for (let i = 0; i < uniqueDepths.length - 1; i++) {
      const segmentStart = uniqueDepths[i];
      const segmentEnd = uniqueDepths[i + 1];
      
      // Find the largest hole that goes to or beyond this segment end
      let activeHole = null;
      let largestRadius = 0;
      
      for (const drill of drillOps) {
        if (drill.depth >= segmentEnd && drill.radius > largestRadius) {
          activeHole = drill;
          largestRadius = drill.radius;
        }
      }
      
      if (activeHole) {
        // This segment has a hole
        // Check if there's a smaller hole that ends exactly at segmentEnd
        const holeEndingHere = drillOps.find(d => d.depth === segmentEnd && d.radius < activeHole.radius);
        
        profile.push({
          startDepth: segmentStart,
          endDepth: segmentEnd,
          radius: activeHole.radius,
          type: activeHole.process,
          outerRadius: originalRadius,
          hasBottom: !!holeEndingHere // Has bottom if a smaller hole ends here
        });
      } else {
        // This segment is solid material
        profile.push({
          startDepth: segmentStart,
          endDepth: segmentEnd,
          radius: originalRadius,
          type: 'solid',
          outerRadius: originalRadius,
          hasBottom: false
        });
      }
    }
    
    return profile;
  };

  // When modal is requested to open, open in new window instead
  useEffect(() => {
    if (isOpen) {
      const newWindow = window.open('', '_blank', 'width=1200,height=900');
      
      if (!newWindow) {
        alert('Please allow popups to view the technical drawing');
        return;
      }

      const maxDiameter = getMaxDiameter();
      const maxDepth = getMaxDepth();
      const baseScale = 120; // Larger scale for detailed view
      const zoom = 1; // Default zoom in new window
      const scale = baseScale * zoom;
      const centerY = 200;
      const rightX = 600; // Start from right side (0 position)
      const leftX = rightX - (maxDepth * scale); // Calculate left position
      const profile = generateProfile();
      const svgWidth = Math.max(800, Math.abs(leftX - rightX) + 200);
      const svgHeight = Math.max(400, (maxDiameter * scale) + 200);

      // Build SVG content dynamically
      let svgContent = '';
      
      // Add profile lines
      profile.forEach((segment, index) => {
        const segmentStartX = rightX - (segment.startDepth * scale);
        const segmentEndX = rightX - (segment.endDepth * scale);
        const innerRadius = segment.radius * scale;
        const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
        
        // Top and bottom outer profile lines
        svgContent += `<line x1="${segmentStartX}" y1="${centerY - outerRadius}" x2="${segmentEndX}" y2="${centerY - outerRadius}" stroke="#000000" stroke-width="2"/>`;
        svgContent += `<line x1="${segmentStartX}" y1="${centerY + outerRadius}" x2="${segmentEndX}" y2="${centerY + outerRadius}" stroke="#000000" stroke-width="2"/>`;
        
        // Inner profile lines for machined sections
        if (segment.type !== 'solid') {
          svgContent += `<line x1="${segmentStartX}" y1="${centerY - innerRadius}" x2="${segmentEndX}" y2="${centerY - innerRadius}" stroke="#000000" stroke-width="2"/>`;
          svgContent += `<line x1="${segmentStartX}" y1="${centerY + innerRadius}" x2="${segmentEndX}" y2="${centerY + innerRadius}" stroke="#000000" stroke-width="2"/>`;
          
          // Add bottom cap if hole has bottom
          if (segment.hasBottom) {
            svgContent += `<line x1="${segmentEndX}" y1="${centerY - innerRadius}" x2="${segmentEndX}" y2="${centerY + innerRadius}" stroke="#000000" stroke-width="2"/>`;
          }
        }
        
        // End face at zero position for first machined segment
        if (index === 0 && segment.type !== 'solid') {
          svgContent += `<line x1="${rightX}" y1="${centerY - outerRadius}" x2="${rightX}" y2="${centerY - innerRadius}" stroke="#000000" stroke-width="2"/>`;
          svgContent += `<line x1="${rightX}" y1="${centerY + innerRadius}" x2="${rightX}" y2="${centerY + outerRadius}" stroke="#000000" stroke-width="2"/>`;
        }
      });
      
      // Add thread visualization
      spec.machiningSteps
        .filter(step => step.process === 'Tap' && step.threadSize)
        .forEach((tapStep) => {
          const tapStepIndex = spec.machiningSteps.findIndex(step => step === tapStep);
          const drillStep = spec.machiningSteps.find((step, index) => 
            index < tapStepIndex && step.process === 'Drill' && step.depth && step.size
          );
          
          if (drillStep && drillStep.depth && drillStep.size) {
            const tapDepth = parseValue(drillStep.depth);
            const tapRadius = parseValue(drillStep.size) / 2;
            
            let threadStartDepth = 0;
            const threadEndDepth = tapDepth;
            
            const threadStartX = rightX - (threadStartDepth * scale);
            const threadEndX = rightX - (threadEndDepth * scale);
            const threadPitch = 5;
            
            for (let x = threadStartX; x > threadEndX; x -= threadPitch) {
              const fullRadius = tapRadius * scale;
              svgContent += `<line x1="${x}" y1="${centerY - fullRadius}" x2="${x - 3}" y2="${centerY - fullRadius * 0.5}" stroke="#2563eb" stroke-width="1.5"/>`;
              svgContent += `<line x1="${x - 3}" y1="${centerY - fullRadius * 0.5}" x2="${x - 6}" y2="${centerY}" stroke="#2563eb" stroke-width="1.5"/>`;
              svgContent += `<line x1="${x - 6}" y1="${centerY}" x2="${x - 3}" y2="${centerY + fullRadius * 0.5}" stroke="#2563eb" stroke-width="1.5"/>`;
              svgContent += `<line x1="${x - 3}" y1="${centerY + fullRadius * 0.5}" x2="${x}" y2="${centerY + fullRadius}" stroke="#2563eb" stroke-width="1.5"/>`;
            }
          }
        });

      // Build machining steps list
      let stepsContent = '';
      if (spec.machiningSteps.length > 0) {
        spec.machiningSteps.forEach((step, index) => {
          stepsContent += `<div style="display: flex; align-items: center; gap: 16px; padding: 8px; margin-bottom: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">`;
          stepsContent += `<span style="font-weight: 600; color: #6b7280; width: 32px;">${index + 1}.</span>`;
          stepsContent += `<span style="font-weight: 600; color: #1f2937;">${step.process}</span>`;
          if (step.size) stepsContent += `<span style="color: #6b7280;">⌀${step.size}"</span>`;
          if (step.depth) stepsContent += `<span style="color: #6b7280;">× ${step.depth}"</span>`;
          if (step.threadSize) stepsContent += `<span style="color: #6b7280;">Thread: ${step.threadSize}</span>`;
          if (step.finalDiameter) stepsContent += `<span style="color: #6b7280;">Final ⌀${step.finalDiameter}"</span>`;
          stepsContent += `</div>`;
        });
      } else {
        stepsContent = '<p style="color: #6b7280; font-style: italic;">No machining steps defined.</p>';
      }

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Technical Drawing - ${spec.name}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: Arial, sans-serif; 
      background: white;
      text-align: center;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 20px; 
      padding-bottom: 10px; 
      border-bottom: 1px solid #e5e7eb;
    }
    .title { 
      font-size: 24px; 
      font-weight: 600; 
      color: #1f2937;
    }
    .print-btn { 
      padding: 8px 16px; 
      background: #2563eb; 
      color: white; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer;
    }
    .print-btn:hover { 
      background: #1d4ed8;
    }
    .drawing-container { 
      display: flex; 
      justify-content: center; 
      margin-bottom: 20px;
    }
    .steps { 
      border-top: 1px solid #e5e7eb; 
      padding-top: 20px;
    }
    .step { 
      display: flex; 
      align-items: center; 
      gap: 16px; 
      padding: 8px; 
      margin-bottom: 8px; 
      background: #f9fafb; 
      border: 1px solid #e5e7eb; 
      border-radius: 4px;
    }
    .step-num { 
      font-weight: 600; 
      color: #6b7280; 
      width: 32px;
    }
    .step-process { 
      font-weight: 600; 
      color: #1f2937;
    }
    .step-detail { 
      color: #6b7280;
    }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: fixed; top: 10px; right: 10px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Print (⌘P)</button>
    <button onclick="window.close()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
  </div>
  
  <div class="header">
    <div class="title">Technical Drawing - ${spec.name}</div>
    <button class="print-btn" onclick="window.print()">Print</button>
  </div>
  
  <div class="drawing-container">
    <svg width="${svgWidth}" height="${svgHeight}" style="border: 1px solid #e5e7eb; background: white;">
      <!-- Butler Logo -->
      <g transform="translate(40, 40)">
        <rect x="0" y="0" width="200" height="40" fill="#10b981" rx="4"/>
        <text x="100" y="28" text-anchor="middle" font-size="24" font-weight="bold" fill="white" font-family="Arial, sans-serif">
          BUTLER
        </text>
      </g>
      
      <!-- Profile lines -->
      ${svgContent}
      
      <!-- Left end cap -->
      <line x1="${leftX}" y1="${centerY - (maxDiameter * scale / 2)}" x2="${leftX}" y2="${centerY + (maxDiameter * scale / 2)}" stroke="#000000" stroke-width="2"/>
      
      <!-- Center line -->
      <line x1="${leftX - 30}" y1="${centerY}" x2="${rightX + 30}" y2="${centerY}" stroke="#000000" stroke-width="0.5" stroke-dasharray="8,8"/>
      
      <!-- Zero reference line -->
      <line x1="${rightX}" y1="${centerY - (maxDiameter * scale / 2) - 20}" x2="${rightX}" y2="${centerY + (maxDiameter * scale / 2) + 60}" stroke="#000000" stroke-width="1"/>
      
      <!-- Zero label -->
      <text x="${rightX + 8}" y="${centerY + (maxDiameter * scale / 2) + 50}" font-size="16" fill="#000000">0</text>
      
      <!-- Length dimension -->
      ${maxDepth > 0 ? `
        <line x1="${leftX}" y1="${centerY + (maxDiameter * scale / 2) + 30}" x2="${rightX}" y2="${centerY + (maxDiameter * scale / 2) + 30}" stroke="#000000" stroke-width="1"/>
        <line x1="${leftX}" y1="${centerY + (maxDiameter * scale / 2) + 25}" x2="${leftX}" y2="${centerY + (maxDiameter * scale / 2) + 35}" stroke="#000000" stroke-width="1"/>
        <line x1="${rightX}" y1="${centerY + (maxDiameter * scale / 2) + 25}" x2="${rightX}" y2="${centerY + (maxDiameter * scale / 2) + 35}" stroke="#000000" stroke-width="1"/>
        <text x="${(leftX + rightX) / 2}" y="${centerY + (maxDiameter * scale / 2) + 50}" text-anchor="middle" font-size="14" fill="#000000">${maxDepth.toFixed(3)}"</text>
      ` : ''}
    </svg>
  </div>
  
  <div class="steps">
    <h3 style="font-weight: 600; color: #1f2937; margin-bottom: 12px;">Machining Steps</h3>
    ${stepsContent}
</body>
</html>`;
      
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      onClose(); // Close the modal state
    }
  }, [isOpen]);
  
  // Return null since we're opening in a new window
  return null;
};

// Technical Drawing Component (Thumbnail)
const TechnicalDrawing = ({ spec }: { spec: PinSpec }) => {
  const [showModal, setShowModal] = useState(false);

  const parseValue = (value: string | undefined): number => {
    if (!value) return 0;
    if (value.includes('/')) {
      const [num, den] = value.split('/').map(n => parseFloat(n.trim()));
      return num / den;
    }
    return parseFloat(value) || 0;
  };

  const getMaxDiameter = () => {
    let maxDiam = 0.5;
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
    let maxDepth = 1;
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

  const generateProfile = () => {
    const maxDiam = getMaxDiameter();
    const maxDepth = getMaxDepth();
    const originalRadius = maxDiam / 2;
    
    // Get all drill operations sorted by depth
    const drillOps = [...spec.machiningSteps]
      .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
      .map(step => ({
        depth: parseValue(step.depth || '0'),
        radius: parseValue(step.size || '0') / 2,
        process: step.process
      }))
      .sort((a, b) => a.depth - b.depth); // Sort by depth ascending (shallowest first)
    
    if (drillOps.length === 0) {
      // No machining operations, just solid body
      return [{
        startDepth: 0,
        endDepth: maxDepth,
        radius: originalRadius,
        type: 'solid',
        outerRadius: originalRadius,
        hasBottom: false
      }];
    }
    
    // Create depth points where the hole profile changes
    const depthPoints = [0, ...drillOps.map(op => op.depth), maxDepth];
    const uniqueDepths = [...new Set(depthPoints)].sort((a, b) => a - b);
    
    const profile = [];
    
    // For each depth segment, find the largest hole that reaches that depth
    for (let i = 0; i < uniqueDepths.length - 1; i++) {
      const segmentStart = uniqueDepths[i];
      const segmentEnd = uniqueDepths[i + 1];
      
      // Find the largest hole that goes to or beyond this segment end
      let activeHole = null;
      let largestRadius = 0;
      
      for (const drill of drillOps) {
        if (drill.depth >= segmentEnd && drill.radius > largestRadius) {
          activeHole = drill;
          largestRadius = drill.radius;
        }
      }
      
      if (activeHole) {
        // This segment has a hole
        // Check if there's a smaller hole that ends exactly at segmentEnd
        const holeEndingHere = drillOps.find(d => d.depth === segmentEnd && d.radius < activeHole.radius);
        
        profile.push({
          startDepth: segmentStart,
          endDepth: segmentEnd,
          radius: activeHole.radius,
          type: activeHole.process,
          outerRadius: originalRadius,
          hasBottom: !!holeEndingHere // Has bottom if a smaller hole ends here
        });
      } else {
        // This segment is solid material
        profile.push({
          startDepth: segmentStart,
          endDepth: segmentEnd,
          radius: originalRadius,
          type: 'solid',
          outerRadius: originalRadius,
          hasBottom: false
        });
      }
    }
    
    return profile;
  };



  const openTechnicalDrawingWindow = () => {
    // Open the existing modal content in a new window
    setShowModal(true);
  };

  const maxDiameter = getMaxDiameter();
  const maxDepth = getMaxDepth();
  const scale = 60; // Smaller scale for thumbnail
  const centerY = 60;
  const rightX = 180;
  const leftX = rightX - (maxDepth * scale);
  const profile = generateProfile();
  const svgWidth = Math.max(200, Math.abs(leftX - rightX) + 40);
  const svgHeight = Math.max(120, (maxDiameter * scale) + 40);

  return (
    <>
      <div>
        <h4 className="text-sm font-medium text-slate-900 mb-2">Technical Drawing</h4>
        <div 
          className="border border-slate-200 rounded-lg p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={openTechnicalDrawingWindow}
        >
          <svg width={svgWidth} height={svgHeight} className="bg-white border border-slate-200">
            {/* Butler Logo */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="120" height="24" fill="#10b981" rx="2"/>
              <text x="60" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="Arial, sans-serif">
                BUTLER
              </text>
            </g>
            
            {/* Use same drawing logic as modal and print */}
            <g>
              {profile.map((segment, index) => {
                const segmentStartX = rightX - (segment.startDepth * scale);
                const segmentEndX = rightX - (segment.endDepth * scale);
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
                      strokeWidth="1.5"
                    />
                    {/* Bottom outer profile line */}
                    <line
                      x1={segmentStartX}
                      y1={centerY + outerRadius}
                      x2={segmentEndX}
                      y2={centerY + outerRadius}
                      stroke="#000000"
                      strokeWidth="1.5"
                    />
                    
                    {/* For machined sections, show the inner profile */}
                    {segment.type !== 'solid' && (
                      <>
                        <line
                          x1={segmentStartX}
                          y1={centerY - innerRadius}
                          x2={segmentEndX}
                          y2={centerY - innerRadius}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={segmentStartX}
                          y1={centerY + innerRadius}
                          x2={segmentEndX}
                          y2={centerY + innerRadius}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        
                        {/* Draw bottom cap if this hole has a bottom */}
                        {segment.hasBottom && (
                          <line
                            x1={segmentEndX}
                            y1={centerY - innerRadius}
                            x2={segmentEndX}
                            y2={centerY + innerRadius}
                            stroke="#000000"
                            strokeWidth="1.5"
                          />
                        )}
                      </>
                    )}
                    
                    {/* Vertical transitions */}
                    {index === 0 && segment.type !== 'solid' && (
                      <>
                        <line
                          x1={rightX}
                          y1={centerY - outerRadius}
                          x2={rightX}
                          y2={centerY - innerRadius}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={rightX}
                          y1={centerY + innerRadius}
                          x2={rightX}
                          y2={centerY + outerRadius}
                          stroke="#000000"
                          strokeWidth="1.5"
                        />
                      </>
                    )}
                    
                    {/* Step transitions between segments */}
                    {index < profile.length - 1 && (
                      (() => {
                        const nextSegment = profile[index + 1];
                        if (segment.type !== 'solid' && nextSegment.type !== 'solid' && nextSegment.radius !== segment.radius) {
                          const nextInnerRadius = nextSegment.radius * scale;
                          return (
                            <>
                              <line
                                x1={segmentEndX}
                                y1={centerY - innerRadius}
                                x2={segmentEndX}
                                y2={centerY - nextInnerRadius}
                                stroke="#000000"
                                strokeWidth="1.5"
                              />
                              <line
                                x1={segmentEndX}
                                y1={centerY + nextInnerRadius}
                                x2={segmentEndX}
                                y2={centerY + innerRadius}
                                stroke="#000000"
                                strokeWidth="1.5"
                              />
                            </>
                          );
                        }
                        return null;
                      })()
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
                strokeWidth="1.5"
              />
              
              {/* Cross-hatching for machined areas - same as modal */}
              {profile.map((segment, index) => {
                if (segment.type !== 'solid') {
                  const segmentStartX = rightX - (segment.startDepth * scale);
                  const segmentEndX = rightX - (segment.endDepth * scale);
                  const innerRadius = segment.radius * scale;
                  const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
                  const segmentWidth = segmentStartX - segmentEndX;
                  
                  const hatchLines = [];
                  for (let i = 0; i < segmentWidth; i += 8) {
                    hatchLines.push(
                      <line
                        key={`hatch-top-${index}-${i}`}
                        x1={segmentEndX + i}
                        y1={centerY - outerRadius}
                        x2={segmentEndX + i + 4}
                        y2={centerY - innerRadius}
                        stroke="#000000"
                        strokeWidth="0.3"
                        opacity="0.4"
                      />
                    );
                    hatchLines.push(
                      <line
                        key={`hatch-bottom-${index}-${i}`}
                        x1={segmentEndX + i}
                        y1={centerY + innerRadius}
                        x2={segmentEndX + i + 4}
                        y2={centerY + outerRadius}
                        stroke="#000000"
                        strokeWidth="0.3"
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
                x1={leftX - 10}
                y1={centerY}
                x2={rightX + 10}
                y2={centerY}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
              
              {/* Zero reference line at right */}
              <line
                x1={rightX}
                y1={centerY - (maxDiameter * scale / 2) - 8}
                x2={rightX}
                y2={centerY + (maxDiameter * scale / 2) + 15}
                stroke="#000000"
                strokeWidth="0.8"
              />
              
              {/* Bottom caps for drilled holes */}
              {(() => {
                // Get all drill operations with their depths
                const drillOps = spec.machiningSteps
                  .filter(step => step.process === 'Drill' && step.depth && step.size)
                  .map(step => ({
                    depth: parseValue(step.depth || '0'),
                    radius: parseValue(step.size || '0') / 2
                  }))
                  .sort((a, b) => a.depth - b.depth);
                
                return drillOps.map((drill, index) => {
                  const drillEndX = rightX - (drill.depth * scale);
                  const innerRadius = drill.radius * scale;
                  
                  // Check if ANY hole continues deeper (don't draw bottom cap if any hole goes deeper)
                  const continuesInNext = drillOps.slice(index + 1).some(nextDrill => 
                    nextDrill.depth > drill.depth
                  );
                  
                  // Draw bottom cap if hole doesn't continue
                  if (!continuesInNext) {
                    return (
                      <line
                        key={`hole-bottom-${index}`}
                        x1={drillEndX}
                        y1={centerY - innerRadius}
                        x2={drillEndX}
                        y2={centerY + innerRadius}
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                    );
                  }
                  return null;
                });
              })()}
              
              {/* Bottom caps for drilled holes */}
              {profile.map((segment, index) => {
                if (segment.type !== 'solid') {
                  const segmentEndX = rightX - (segment.endDepth * scale);
                  const innerRadius = segment.radius * scale;
                  
                  // Only draw bottom cap if this hole doesn't continue (next segment is solid or smaller)
                  const nextSegment = profile[index + 1];
                  const shouldDrawBottom = !nextSegment || 
                    nextSegment.type === 'solid' || 
                    nextSegment.radius < segment.radius;
                  
                  if (shouldDrawBottom) {
                    return (
                      <line
                        key={`hole-bottom-${index}`}
                        x1={segmentEndX}
                        y1={centerY - innerRadius}
                        x2={segmentEndX}
                        y2={centerY + innerRadius}
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                    );
                  }
                }
                return null;
              })}
              
              {/* Thread visualization for tapped holes */}
              {spec.machiningSteps
                .filter(step => step.process === 'Tap' && step.threadSize)
                .map((tapStep, tapIndex) => {
                  // Find the corresponding drill operation for this tap
                  const tapStepIndex = spec.machiningSteps.findIndex(step => step === tapStep);
                  const drillStep = spec.machiningSteps.find((step, index) => 
                    index < tapStepIndex && step.process === 'Drill' && step.depth && step.size
                  );
                  
                  if (!drillStep || !drillStep.depth || !drillStep.size) return null;
                  
                  const tapDepth = parseValue(drillStep.depth);
                  const tapRadius = parseValue(drillStep.size) / 2;
                  
                  // Find if there are subsequent operations that would remove threads
                  const subsequentOps = spec.machiningSteps.slice(tapStepIndex + 1)
                    .filter(step => (step.process === 'Drill' || step.process === 'Bore') && step.depth && step.size)
                    .map(step => ({
                      depth: parseValue(step.depth || '0'),
                      radius: parseValue(step.size || '0') / 2
                    }));
                  
                  // Determine the actual threaded region (not removed by subsequent ops)
                  let threadStartDepth = 0;
                  const threadEndDepth = tapDepth;
                  
                  // Check each subsequent operation
                  for (const op of subsequentOps) {
                    if (op.radius > tapRadius && op.depth < tapDepth) {
                      // This larger operation removes threads from 0 to its depth
                      threadStartDepth = Math.max(threadStartDepth, op.depth);
                    }
                  }
                  
                  // If threads are completely removed, don't draw any
                  if (threadStartDepth >= threadEndDepth) return null;
                  
                  const threadStartX = rightX - (threadStartDepth * scale);
                  const threadEndX = rightX - (threadEndDepth * scale);
                  
                  // Draw enhanced thread lines
                  const threadLines = [];
                  const threadPitch = 3; // Closer spacing for more obvious threads
                  
                  for (let x = threadStartX; x > threadEndX; x -= threadPitch) {
                    const fullRadius = tapRadius * scale;
                    threadLines.push(
                      <g key={`thread-${tapIndex}-${x}`}>
                        <line
                          x1={x}
                          y1={centerY - fullRadius}
                          x2={x - 2}
                          y2={centerY - fullRadius * 0.5}
                          stroke="#2563eb"
                          strokeWidth="1"
                        />
                        <line
                          x1={x - 2}
                          y1={centerY - fullRadius * 0.5}
                          x2={x - 4}
                          y2={centerY}
                          stroke="#2563eb"
                          strokeWidth="1"
                        />
                        <line
                          x1={x - 4}
                          y1={centerY}
                          x2={x - 2}
                          y2={centerY + fullRadius * 0.5}
                          stroke="#2563eb"
                          strokeWidth="1"
                        />
                        <line
                          x1={x - 2}
                          y1={centerY + fullRadius * 0.5}
                          x2={x}
                          y2={centerY + fullRadius}
                          stroke="#2563eb"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  }
                  
                  return <g key={`tap-threads-${tapIndex}`}>{threadLines}</g>;
                })}
              
              {/* Zero label */}
              <text x={rightX + 3} y={centerY + (maxDiameter * scale / 2) + 12} fontSize="8" fill="#000000">0</text>
            </g>
          </svg>
          <p className="text-xs text-slate-600 mt-1 text-center">Click to view detailed drawing</p>
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

      if (currentSpec.id && currentSpec.id.trim() !== '') {
        // Update existing pin - exclude id from the data since it's in the document path
        const updateData = {
          name: currentSpec.name,
          buildStyle: currentSpec.buildStyle,
          exposedLength: currentSpec.exposedLength,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          updatedAt: Timestamp.now()
        };
        
        const pinDoc = doc(db, 'pins', currentSpec.id);
        await updateDoc(pinDoc, updateData);
        console.log('Pin updated in Firebase');
      } else {
        // Add new pin - never include an id field in the document data
        const newPinData = {
          name: currentSpec.name,
          buildStyle: currentSpec.buildStyle,
          exposedLength: currentSpec.exposedLength,
          machiningSteps: currentSpec.machiningSteps,
          assemblyNotes: currentSpec.assemblyNotes,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        const docRef = await addDoc(pinsCollection, newPinData);
        console.log('Pin added to Firebase with ID:', docRef.id);
        
        // Update the current spec with the generated ID for immediate use
        setCurrentSpec(prev => ({ ...prev, id: docRef.id }));
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
    
    if (currentSpec.id && currentSpec.id.trim() !== '') {
      // Update existing
      updatedSpecs = specs.map(spec => 
        spec.id === currentSpec.id ? currentSpec : spec
      );
    } else {
      // Add new with generated ID
      const newSpec = {
        name: currentSpec.name,
        buildStyle: currentSpec.buildStyle,
        exposedLength: currentSpec.exposedLength,
        machiningSteps: currentSpec.machiningSteps,
        assemblyNotes: currentSpec.assemblyNotes,
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
    // Validate the ID first - before showing confirmation
    if (!id || id.trim() === '' || id === 'undefined' || id === 'null') {
      console.error('Invalid document ID for deletion:', id);
      alert('Cannot delete pin: Invalid document ID. This pin may have been created with an older version of the app.');
      return;
    }

    if (!confirm('Are you sure you want to delete this pin?')) {
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
      // Don't set id at all for new pins - let Firebase generate it
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

                {/* Machining Steps and Technical Drawing */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Machining Steps - Left Side */}
                  <div className="lg:col-span-2">
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
                        
                        {step.process !== 'Center Drill' && (
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
                        )}
                        
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
                            <select
                              value={step.threadSize || ''}
                              onChange={(e) => updateMachiningStep(index, 'threadSize', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
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
                  
                  {/* Technical Drawing - Right Side */}
                  {(currentSpec.machiningSteps.length > 0 || currentSpec.exposedLength) && (
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
                        {spec.id && spec.id.trim() !== '' && spec.id !== 'undefined' && spec.id !== 'null' ? (
                          <button
                            onClick={() => handleDelete(spec.id!)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2"
                            title="Delete pin"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <div className="p-2 text-gray-400" title="Cannot delete: Invalid ID">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" opacity="0.3">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                            </svg>
                          </div>
                        )}
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