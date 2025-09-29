'use client';

import { BaseSpec } from './types';
import { parseValue, getMaxDiameter, getMaxDepth, parseDimensionWithUnit, convertToInches, formatDimension } from './utils';

interface TechnicalDrawingProps {
  spec: BaseSpec & { exposedLength?: string; diameter?: string };
}

// Helper function to get the correct diameter for the component
const getMaterialDiameter = (spec: BaseSpec & { exposedLength?: string; diameter?: string }): number => {
  // For ferrules, use the material diameter if available
  if ('diameter' in spec && spec.diameter) {
    const dimension = parseDimensionWithUnit(spec.diameter);
    return convertToInches(dimension);
  }
  // For pins or ferrules without diameter specified, calculate from machining steps and add 25% stock
  const maxMachinedDiameter = getMaxDiameter(spec.machiningSteps);
  return maxMachinedDiameter * 1.25; // Add 25% material stock around operations
};

// Shared profile generation function used by both thumbnail and modal
const generateCrossSectionProfile = (spec: BaseSpec & { exposedLength?: string; diameter?: string }) => {
  const maxDiam = getMaterialDiameter(spec);
  const maxDepth = getMaxDepth(spec.machiningSteps, spec.exposedLength, 'length' in spec ? spec.length : undefined);
  const originalRadius = maxDiam / 2;
  
  // Get all drill operations sorted by depth (deepest first)
  const drillOps = spec.machiningSteps
    .filter(step => step.process === 'Drill' && parseValue(step.depth || '0') > 0 && parseValue(step.size || '0') > 0)
    .map(step => {
      const depthDimension = parseDimensionWithUnit(step.depth || '0');
      const sizeDimension = parseDimensionWithUnit(step.size || '0');
      return {
        depth: convertToInches(depthDimension),
        radius: convertToInches(sizeDimension) / 2
      };
    })
    .sort((a, b) => b.depth - a.depth); // Sort deepest first
  
  if (drillOps.length === 0) {
    return [{
      startDepth: 0,
      endDepth: maxDepth,
      radius: originalRadius,
      type: 'solid',
      outerRadius: originalRadius
    }];
  }
  
  const profile = [];
  
  // Create depth breakpoints
  const depthPoints = [0, ...drillOps.map(op => op.depth), maxDepth].sort((a, b) => a - b);
  
  // For each depth segment, find what hole size exists there
  for (let i = 0; i < depthPoints.length - 1; i++) {
    const segmentStart = depthPoints[i];
    const segmentEnd = depthPoints[i + 1];
    
    // Find the LARGEST hole that goes at least as deep as this segment end
    const holesAtThisDepth = drillOps.filter(op => op.depth >= segmentEnd);
    
    if (holesAtThisDepth.length === 0) {
      // No holes reach this deep - solid material
      profile.push({
        startDepth: segmentStart,
        endDepth: segmentEnd,
        radius: originalRadius,
        type: 'solid',
        outerRadius: originalRadius
      });
    } else {
      // Find the LARGEST hole (biggest drill removes smaller holes)
      const activeHole = holesAtThisDepth.reduce((largest, current) => 
        current.radius > largest.radius ? current : largest
      );
      
      profile.push({
        startDepth: segmentStart,
        endDepth: segmentEnd,
        radius: activeHole.radius,
        type: 'hole',
        outerRadius: originalRadius,
        holeSize: activeHole.radius * 2
      });
    }
  }
  
  return profile;
};

// Shared SVG component for both thumbnail and modal
function TechnicalDrawingSVG({ spec, isModal }: { spec: BaseSpec & { exposedLength?: string; diameter?: string }; isModal: boolean }) {
  const maxDiameter = getMaterialDiameter(spec);
  const maxDepth = getMaxDepth(spec.machiningSteps, spec.exposedLength, 'length' in spec ? spec.length : undefined);
  const scale = isModal ? 120 : 40;
  const hasDiameter = 'diameter' in spec && spec.diameter;
  
  // Calculate drawing dimensions
  const drawingWidth = maxDepth * scale;
  const drawingHeight = maxDiameter * scale;
  
  // Calculate extra space needed for dimensions and labels
  const leftPadding = hasDiameter ? (isModal ? 100 : 30) : (isModal ? 50 : 15);
  
  // Calculate additional space needed for exposed length
  let exposedLengthSpace = 0;
  if ('exposedLength' in spec && spec.exposedLength) {
    const exposedLengthDimension = parseDimensionWithUnit(spec.exposedLength);
    const exposedLengthInches = convertToInches(exposedLengthDimension);
    exposedLengthSpace = exposedLengthInches * scale + (isModal ? 60 : 40); // Extra space for dimensions
  }
  
  const rightPadding = Math.max(
    ('length' in spec && spec.length) ? (isModal ? 80 : 50) : (isModal ? 60 : 25),
    exposedLengthSpace
  );
  const topPadding = ('length' in spec && spec.length) ? (isModal ? 80 : 30) : (isModal ? 30 : 10);
  const bottomPadding = isModal ? 150 : 30;
  
  // Calculate total SVG dimensions
  const svgWidth = drawingWidth + leftPadding + rightPadding;
  const svgHeight = drawingHeight + topPadding + bottomPadding;
  
  // Position drawing in center of available space horizontally
  const centerX = svgWidth / 2;
  const leftX = centerX - (drawingWidth / 2);
  const rightX = centerX + (drawingWidth / 2);
  const adjustedCenterY = topPadding + (drawingHeight / 2);
  
  const profile = generateCrossSectionProfile(spec);
  const strokeWidth = isModal ? 2 : 1;

  return (
    <svg width={svgWidth} height={svgHeight} className={isModal ? "border border-slate-200 bg-white" : "bg-white dark:bg-slate-100 mx-auto"}>
      
      {/* Profile rendering */}
      <g>
        {profile.map((segment: {startDepth: number; endDepth: number; radius: number; type: string; outerRadius?: number; holeSize?: number}, index: number) => {
          const segmentStartX = rightX - (segment.startDepth * scale);
          const segmentEndX = rightX - (segment.endDepth * scale);
          const innerRadius = segment.radius * scale;
          const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
          
          return (
            <g key={`segment-${index}`}>
              {/* Outer profile lines (always draw these) */}
              <line 
                x1={segmentStartX} y1={adjustedCenterY - outerRadius} 
                x2={segmentEndX} y2={adjustedCenterY - outerRadius} 
                stroke="#000000" strokeWidth={strokeWidth}
              />
              <line 
                x1={segmentStartX} y1={adjustedCenterY + outerRadius} 
                x2={segmentEndX} y2={adjustedCenterY + outerRadius} 
                stroke="#000000" strokeWidth={strokeWidth}
              />
              
              {/* For holes, draw inner profile lines and shoulders only for multiple drill operations */}
              {segment.type === 'hole' && (
                <>
                  {/* Inner hole profile lines */}
                  <line 
                    x1={segmentStartX} y1={adjustedCenterY - innerRadius} 
                    x2={segmentEndX} y2={adjustedCenterY - innerRadius} 
                    stroke="#000000" strokeWidth={strokeWidth}
                  />
                  <line 
                    x1={segmentStartX} y1={adjustedCenterY + innerRadius} 
                    x2={segmentEndX} y2={adjustedCenterY + innerRadius} 
                    stroke="#000000" strokeWidth={strokeWidth}
                  />
                  
                  {/* Show shoulders for multiple drill operations - only between hole segments */}
                  {(() => {
                    const drillOps = spec.machiningSteps.filter(step => 
                      step.process === 'Drill' && 
                      parseValue(step.depth || '0') > 0 && 
                      parseValue(step.size || '0') > 0
                    );
                    
                    // Only draw shoulders if there are multiple drill operations
                    if (drillOps.length <= 1) return null;
                    
                    return (
                      <>
                        {/* Shoulder at start of hole - only if previous segment is also a hole */}
                        {index > 0 && (() => {
                          const prevSegment = profile[index - 1];
                          if (prevSegment && prevSegment.type === 'hole' && prevSegment.radius !== segment.radius) {
                            const prevRadius = prevSegment.radius * scale;
                            return (
                              <>
                                <line 
                                  x1={segmentStartX} y1={adjustedCenterY - innerRadius} 
                                  x2={segmentStartX} y2={adjustedCenterY - prevRadius} 
                                  stroke="#000000" strokeWidth={strokeWidth}
                                />
                                <line 
                                  x1={segmentStartX} y1={adjustedCenterY + innerRadius} 
                                  x2={segmentStartX} y2={adjustedCenterY + prevRadius} 
                                  stroke="#000000" strokeWidth={strokeWidth}
                                />
                              </>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Shoulder at end of hole - only if next segment is also a hole */}
                        {index < profile.length - 1 && (() => {
                          const nextSegment = profile[index + 1];
                          if (nextSegment && nextSegment.type === 'hole' && nextSegment.radius !== segment.radius) {
                            const nextRadius = nextSegment.radius * scale;
                            return (
                              <>
                                <line 
                                  x1={segmentEndX} y1={adjustedCenterY - innerRadius} 
                                  x2={segmentEndX} y2={adjustedCenterY - nextRadius} 
                                  stroke="#000000" strokeWidth={strokeWidth}
                                />
                                <line 
                                  x1={segmentEndX} y1={adjustedCenterY + innerRadius} 
                                  x2={segmentEndX} y2={adjustedCenterY + nextRadius} 
                                  stroke="#000000" strokeWidth={strokeWidth}
                                />
                              </>
                            );
                          }
                          return null;
                        })()}
                      </>
                    );
                  })()}
                </>
              )}
            </g>
          );
        })}

        {/* Thread visualization - show where threads actually exist before being drilled out */}
        {(() => {
          const tapOps = spec.machiningSteps.filter(step => step.process === 'Tap' && step.threadSize);
          if (tapOps.length === 0) return null;
          
          const threadLines: React.ReactElement[] = [];
          const threadPitch = isModal ? 5 : 3;
          const threadStrokeWidth = isModal ? 1.5 : 0.8;
          const threadOffset = isModal ? 3 : 1.5;
          
          // For each tap operation, find what gets threaded
          tapOps.forEach((tapOp, tapIndex) => {
            // Find the tap operation's position in the sequence
            const tapStepIndex = spec.machiningSteps.findIndex(step => step === tapOp);
            
            // Find drill operations that happened BEFORE this tap
            const priorDrillOps = spec.machiningSteps
              .slice(0, tapStepIndex)
              .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
              .sort((a, b) => parseValue(b.depth || '0') - parseValue(a.depth || '0'));
            
            if (priorDrillOps.length === 0) return;
            
            // The hole being tapped is the most recent drill operation before the tap
            const tapTargetHole = priorDrillOps[0];
            const tapDepth = parseValue(tapTargetHole.depth || '0');
            const tapRadius = parseValue(tapTargetHole.size || '0') / 2 * scale;
            
            // Find any operations AFTER the tap that might drill out the threads
            const laterOps = spec.machiningSteps
              .slice(tapStepIndex + 1)
              .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'));
            
            // Calculate where threads actually exist
            let threadStartDepth = 0; // Threads start at surface by default
            let threadEndDepth = tapDepth; // Threads end at tap depth by default
            
            for (const laterOp of laterOps) {
              const laterDepth = parseValue(laterOp.depth || '0');
              const laterSize = parseValue(laterOp.size || '0');
              const tapHoleSize = parseValue(tapTargetHole.size || '0');
              
              // If a later operation has larger diameter, it removes threads from surface to its depth
              if (laterSize > tapHoleSize) {
                threadStartDepth = Math.max(threadStartDepth, laterDepth);
              }
            }
            
            // Only show threads if there's a valid threaded region
            if (threadStartDepth >= threadEndDepth) return;
            
            // Threads exist from where larger operations end to the tap depth
            const threadStartX = rightX - (threadStartDepth * scale); // Where threads start (after larger ops)
            const threadEndX = rightX - (threadEndDepth * scale); // Where threads end (tap depth)
            
            // Generate thread pattern from surface to where threads end
            for (let x = threadStartX; x > threadEndX; x -= threadPitch) {
              threadLines.push(
                <g key={`thread-${tapIndex}-${x}`}>
                  <line
                    x1={x} y1={adjustedCenterY - tapRadius}
                    x2={x - threadOffset} y2={adjustedCenterY - tapRadius * 0.5}
                    stroke="#2563eb" strokeWidth={threadStrokeWidth}
                  />
                  <line
                    x1={x - threadOffset} y1={adjustedCenterY - tapRadius * 0.5}
                    x2={x - threadOffset * 2} y2={adjustedCenterY}
                    stroke="#2563eb" strokeWidth={threadStrokeWidth}
                  />
                  <line
                    x1={x - threadOffset * 2} y1={adjustedCenterY}
                    x2={x - threadOffset} y2={adjustedCenterY + tapRadius * 0.5}
                    stroke="#2563eb" strokeWidth={threadStrokeWidth}
                  />
                  <line
                    x1={x - threadOffset} y1={adjustedCenterY + tapRadius * 0.5}
                    x2={x} y2={adjustedCenterY + tapRadius}
                    stroke="#2563eb" strokeWidth={threadStrokeWidth}
                  />
                </g>
              );
            }
          });
          
          return <g key="tap-threads">{threadLines}</g>;
        })()}
      </g>
      
      {/* Exposed length visualization for pins */}
      {('exposedLength' in spec && spec.exposedLength) ? (
        <g>
          {(() => {
            const exposedLengthDimension = parseDimensionWithUnit(spec.exposedLength);
            const exposedLengthInches = convertToInches(exposedLengthDimension);
            const exposedLengthPixels = exposedLengthInches * scale;
            const exposedDiameter = 0.25; // 0.25" diameter for exposed portion
            const exposedRadiusPixels = (exposedDiameter / 2) * scale;
            
            const exposedStartX = rightX;
            const exposedEndX = rightX + exposedLengthPixels;
            
            return (
              <>
                {/* Exposed portion outline (dotted) */}
                <line 
                  x1={exposedStartX} y1={adjustedCenterY - exposedRadiusPixels} 
                  x2={exposedEndX} y2={adjustedCenterY - exposedRadiusPixels} 
                  stroke="#666666" strokeWidth={strokeWidth} strokeDasharray={isModal ? "4,4" : "2,2"}
                />
                <line 
                  x1={exposedStartX} y1={adjustedCenterY + exposedRadiusPixels} 
                  x2={exposedEndX} y2={adjustedCenterY + exposedRadiusPixels} 
                  stroke="#666666" strokeWidth={strokeWidth} strokeDasharray={isModal ? "4,4" : "2,2"}
                />
                {/* End cap for exposed portion */}
                <line 
                  x1={exposedEndX} y1={adjustedCenterY - exposedRadiusPixels} 
                  x2={exposedEndX} y2={adjustedCenterY + exposedRadiusPixels} 
                  stroke="#666666" strokeWidth={strokeWidth} strokeDasharray={isModal ? "4,4" : "2,2"}
                />
                {/* Exposed length dimension line */}
                <line 
                  x1={exposedStartX} y1={adjustedCenterY + exposedRadiusPixels + (isModal ? 15 : 8)} 
                  x2={exposedEndX} y2={adjustedCenterY + exposedRadiusPixels + (isModal ? 15 : 8)} 
                  stroke="#9333ea" strokeWidth={isModal ? 2 : 0.8}
                />
                {/* Extension lines for exposed length */}
                <line 
                  x1={exposedStartX} y1={adjustedCenterY + exposedRadiusPixels} 
                  x2={exposedStartX} y2={adjustedCenterY + exposedRadiusPixels + (isModal ? 20 : 12)} 
                  stroke="#9333ea" strokeWidth={isModal ? 1 : 0.5} strokeDasharray={isModal ? "3,3" : "2,2"}
                />
                <line 
                  x1={exposedEndX} y1={adjustedCenterY + exposedRadiusPixels} 
                  x2={exposedEndX} y2={adjustedCenterY + exposedRadiusPixels + (isModal ? 20 : 12)} 
                  stroke="#9333ea" strokeWidth={isModal ? 1 : 0.5} strokeDasharray={isModal ? "3,3" : "2,2"}
                />
                {/* Exposed length label */}
                <text 
                  x={(exposedStartX + exposedEndX) / 2} y={adjustedCenterY + exposedRadiusPixels + (isModal ? 35 : 20)} 
                  textAnchor="middle" fontSize={isModal ? 14 : 6} fontWeight="bold" fill="#9333ea"
                >
                  {(() => {
                    return isModal ? formatDimension(exposedLengthDimension) : spec.exposedLength;
                  })()} exposed
                </text>
              </>
            );
          })()}
        </g>
      ) : null}
      
      {/* Left end cap */}
      <line 
        x1={leftX} y1={adjustedCenterY - (maxDiameter * scale / 2)} 
        x2={leftX} y2={adjustedCenterY + (maxDiameter * scale / 2)} 
        stroke="#000000" strokeWidth={strokeWidth}
      />
      
      {/* Center line */}
      <line 
        x1={leftX - (isModal ? 30 : 10)} y1={adjustedCenterY} 
        x2={rightX + (isModal ? 30 : 10)} y2={adjustedCenterY} 
        stroke="#000000" strokeWidth="0.5" strokeDasharray={isModal ? "8,8" : "4,4"}
      />
      
      {/* Zero reference line */}
      <line 
        x1={rightX} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 20 : 5)} 
        x2={rightX} y2={adjustedCenterY + (maxDiameter * scale / 2) + (isModal ? 60 : 15)} 
        stroke="#000000" strokeWidth={isModal ? 1 : 0.5}
      />
      
      {/* Zero label */}
      <text x={rightX + (isModal ? 8 : 3)} y={adjustedCenterY + (maxDiameter * scale / 2) + (isModal ? 50 : 12)} fontSize={isModal ? 16 : 8} fill="#000000">0</text>
      
      {/* Overall length dimension for components with stock length */}
      {('length' in spec && spec.length) ? (
        <g>
          {/* Length dimension line */}
          <line 
            x1={leftX} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            x2={rightX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            stroke="#2563eb" strokeWidth={isModal ? 2 : 0.8}
          />
          {/* Left arrow */}
          <line 
            x1={leftX + (isModal ? 8 : 3)} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 48 : 23)} 
            x2={leftX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            stroke="#2563eb" strokeWidth={isModal ? 2 : 0.8}
          />
          <line 
            x1={leftX + (isModal ? 8 : 3)} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 32 : 17)} 
            x2={leftX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            stroke="#2563eb" strokeWidth={isModal ? 2 : 0.8}
          />
          {/* Right arrow */}
          <line 
            x1={rightX - (isModal ? 8 : 3)} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 48 : 23)} 
            x2={rightX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            stroke="#2563eb" strokeWidth={isModal ? 2 : 0.8}
          />
          <line 
            x1={rightX - (isModal ? 8 : 3)} y1={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 32 : 17)} 
            x2={rightX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 40 : 20)} 
            stroke="#2563eb" strokeWidth={isModal ? 2 : 0.8}
          />
          {/* Extension lines */}
          <line 
            x1={leftX} y1={adjustedCenterY - (maxDiameter * scale / 2)} 
            x2={leftX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 50 : 25)} 
            stroke="#2563eb" strokeWidth={isModal ? 1 : 0.5} strokeDasharray={isModal ? "3,3" : "2,2"}
          />
          <line 
            x1={rightX} y1={adjustedCenterY - (maxDiameter * scale / 2)} 
            x2={rightX} y2={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 50 : 25)} 
            stroke="#2563eb" strokeWidth={isModal ? 1 : 0.5} strokeDasharray={isModal ? "3,3" : "2,2"}
          />
          {/* Length label */}
          <text 
            x={(leftX + rightX) / 2} y={adjustedCenterY - (maxDiameter * scale / 2) - (isModal ? 50 : 25)} 
            textAnchor="middle" fontSize={isModal ? 16 : 7} fontWeight="bold" fill="#2563eb"
          >
            {(() => {
              const lengthValue = (spec as any).length as string;
              const dimension = parseDimensionWithUnit(lengthValue);
              return isModal ? formatDimension(dimension) : lengthValue;
            })()}
          </text>
        </g>
      ) : null}
      
      {/* Material diameter dimension for ferrules */}
      {'diameter' in spec && spec.diameter && (
        <g>
          <line 
            x1={leftX - (isModal ? 40 : 15)} y1={adjustedCenterY - (maxDiameter * scale / 2)} 
            x2={leftX - (isModal ? 40 : 15)} y2={adjustedCenterY + (maxDiameter * scale / 2)} 
            stroke="#ff6b35" strokeWidth={isModal ? 2 : 0.8}
          />
          {/* Arrows */}
          <line 
            x1={leftX - (isModal ? 48 : 18)} y1={adjustedCenterY - (maxDiameter * scale / 2) + (isModal ? 8 : 3)} 
            x2={leftX - (isModal ? 40 : 15)} y2={adjustedCenterY - (maxDiameter * scale / 2)} 
            stroke="#ff6b35" strokeWidth={isModal ? 2 : 0.8}
          />
          <line 
            x1={leftX - (isModal ? 32 : 12)} y1={adjustedCenterY - (maxDiameter * scale / 2) + (isModal ? 8 : 3)} 
            x2={leftX - (isModal ? 40 : 15)} y2={adjustedCenterY - (maxDiameter * scale / 2)} 
            stroke="#ff6b35" strokeWidth={isModal ? 2 : 0.8}
          />
          <line 
            x1={leftX - (isModal ? 48 : 18)} y1={adjustedCenterY + (maxDiameter * scale / 2) - (isModal ? 8 : 3)} 
            x2={leftX - (isModal ? 40 : 15)} y2={adjustedCenterY + (maxDiameter * scale / 2)} 
            stroke="#ff6b35" strokeWidth={isModal ? 2 : 0.8}
          />
          <line 
            x1={leftX - (isModal ? 32 : 12)} y1={adjustedCenterY + (maxDiameter * scale / 2) - (isModal ? 8 : 3)} 
            x2={leftX - (isModal ? 40 : 15)} y2={adjustedCenterY + (maxDiameter * scale / 2)} 
            stroke="#ff6b35" strokeWidth={isModal ? 2 : 0.8}
          />
          <text 
            x={leftX - (isModal ? 60 : 25)} y={adjustedCenterY + (isModal ? 5 : 2)} 
            textAnchor="middle" fontSize={isModal ? 16 : 7} fontWeight="bold" fill="#ff6b35" 
            transform={`rotate(-90, ${leftX - (isModal ? 60 : 25)}, ${adjustedCenterY + (isModal ? 5 : 2)})`}
          >
            ⌀{(() => {
              const dimension = parseDimensionWithUnit(spec.diameter);
              return isModal ? formatDimension(dimension) : spec.diameter;
            })()}
          </text>
        </g>
      )}
      
      {/* Operation depth dimensions for modal */}
      {isModal && (() => {
        const drillOps = spec.machiningSteps
          .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
          .map(step => {
            const depthDimension = parseDimensionWithUnit(step.depth || '0');
            const sizeDimension = parseDimensionWithUnit(step.size || '0');
            return {
              depth: convertToInches(depthDimension),
              size: convertToInches(sizeDimension),
              process: step.process,
              depthFormatted: formatDimension(depthDimension),
              sizeFormatted: formatDimension(sizeDimension)
            };
          })
          .sort((a, b) => a.depth - b.depth);
        
        return drillOps.map((op, index) => {
          const depthX = rightX - (op.depth * scale);
          const yPos = adjustedCenterY + (maxDiameter * scale / 2) + 30 + (index * 25);
          
          return (
            <g key={`depth-dim-${index}`}>
              {/* Depth dimension line */}
              <line 
                x1={rightX} y1={yPos} 
                x2={depthX} y2={yPos} 
                stroke="#666666" strokeWidth="1"
              />
              {/* Extension lines */}
              <line 
                x1={depthX} y1={adjustedCenterY + (maxDiameter * scale / 2) + 15} 
                x2={depthX} y2={yPos + 5} 
                stroke="#666666" strokeWidth="0.5" strokeDasharray="3,3"
              />
              {/* Arrows */}
              <line 
                x1={rightX - 5} y1={yPos - 3} 
                x2={rightX} y2={yPos} 
                stroke="#666666" strokeWidth="1"
              />
              <line 
                x1={rightX - 5} y1={yPos + 3} 
                x2={rightX} y2={yPos} 
                stroke="#666666" strokeWidth="1"
              />
              <line 
                x1={depthX + 5} y1={yPos - 3} 
                x2={depthX} y2={yPos} 
                stroke="#666666" strokeWidth="1"
              />
              <line 
                x1={depthX + 5} y1={yPos + 3} 
                x2={depthX} y2={yPos} 
                stroke="#666666" strokeWidth="1"
              />
              {/* Dimension text */}
              <text 
                x={(rightX + depthX) / 2} y={yPos - 8} 
                textAnchor="middle" fontSize="12" fill="#666666"
              >
                ⌀{op.sizeFormatted} × {op.depthFormatted}
              </text>
            </g>
          );
        });
      })()}
      
      {/* Hole diameter callouts for modal */}
      {isModal && (() => {
        const drillOps = spec.machiningSteps
          .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
          .map(step => {
            const depthDimension = parseDimensionWithUnit(step.depth || '0');
            const sizeDimension = parseDimensionWithUnit(step.size || '0');
            return {
              depth: convertToInches(depthDimension),
              size: convertToInches(sizeDimension),
              process: step.process,
              sizeFormatted: formatDimension(sizeDimension)
            };
          })
          .sort((a, b) => b.size - a.size); // Largest first
        
        return drillOps.map((op, index) => {
          const holeRadius = op.size / 2 * scale;
          const calloutX = rightX - (op.depth * scale * 0.3);
          const calloutY = adjustedCenterY - holeRadius - 20 - (index * 25);
          
          return (
            <g key={`diameter-callout-${index}`}>
              {/* Leader line */}
              <line 
                x1={rightX - (op.depth * scale * 0.7)} y1={adjustedCenterY - holeRadius} 
                x2={calloutX} y2={calloutY + 15} 
                stroke="#2563eb" strokeWidth="1"
              />
              {/* Callout text */}
              <text 
                x={calloutX} y={calloutY} 
                textAnchor="middle" fontSize="12" fill="#2563eb" fontWeight="bold"
              >
                ⌀{op.sizeFormatted}
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
}

// Technical Drawing Component (Thumbnail)
export default function TechnicalDrawing({ spec }: TechnicalDrawingProps) {
  const openTechnicalDrawingWindow = () => {
    // Generate SVG string for the new window
    const generateSVGString = () => {
      const maxDiameter = getMaterialDiameter(spec);
      const maxDepth = getMaxDepth(spec.machiningSteps, spec.exposedLength, 'length' in spec ? spec.length : undefined);
      const scale = 100;
      const hasDiameter = 'diameter' in spec && spec.diameter;
      
      // Calculate drawing dimensions
      const drawingWidth = maxDepth * scale;
      const drawingHeight = maxDiameter * scale;
      
      // Calculate extra space needed for dimensions and labels
      const leftPadding = hasDiameter ? 120 : 80;
      
      // Calculate additional space needed for exposed length
      let exposedLengthSpace = 0;
      if ('exposedLength' in spec && spec.exposedLength) {
        const exposedLengthDimension = parseDimensionWithUnit(spec.exposedLength);
        const exposedLengthInches = convertToInches(exposedLengthDimension);
        exposedLengthSpace = exposedLengthInches * scale + 80; // Extra space for dimensions
      }
      
      const rightPadding = Math.max(
        ('length' in spec && spec.length) ? 100 : 80,
        exposedLengthSpace
      );
      const topPadding = ('length' in spec && spec.length) ? 100 : 50;
      const bottomPadding = 180;
      
      // Calculate total SVG dimensions
      const svgWidth = Math.max(600, drawingWidth + leftPadding + rightPadding);
      const svgHeight = Math.max(300, drawingHeight + topPadding + bottomPadding);
      
      // Position drawing in center of available space horizontally
      const centerX = svgWidth / 2;
      const leftX = centerX - (drawingWidth / 2);
      const rightX = centerX + (drawingWidth / 2);
      const adjustedCenterY = topPadding + (drawingHeight / 2);
      
      const profile = generateCrossSectionProfile(spec);
      const strokeWidth = 2;

      let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" style="border: 1px solid #e2e8f0; background: white;">`;
      
      // Profile rendering
      profile.forEach((segment, index) => {
        const segmentStartX = rightX - (segment.startDepth * scale);
        const segmentEndX = rightX - (segment.endDepth * scale);
        const innerRadius = segment.radius * scale;
        const outerRadius = (segment.outerRadius || maxDiameter / 2) * scale;
        
        // Outer profile lines
        svgContent += `
          <line x1="${segmentStartX}" y1="${adjustedCenterY - outerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY - outerRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
          <line x1="${segmentStartX}" y1="${adjustedCenterY + outerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY + outerRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
        `;
        
        // For holes, draw inner profile lines and shoulders ONLY for multiple drill operations
        if (segment.type === 'hole') {
          svgContent += `
            <line x1="${segmentStartX}" y1="${adjustedCenterY - innerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY - innerRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
            <line x1="${segmentStartX}" y1="${adjustedCenterY + innerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY + innerRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
          `;
          
          // Show shoulders for multiple drill operations - only between hole segments
          const drillOps = spec.machiningSteps.filter(step => 
            step.process === 'Drill' && 
            parseValue(step.depth || '0') > 0 && 
            parseValue(step.size || '0') > 0
          );
          
          if (drillOps.length > 1) {
            // Shoulder at start of hole - only if previous segment is also a hole
            if (index > 0) {
              const prevSegment = profile[index - 1];
              if (prevSegment && prevSegment.type === 'hole' && prevSegment.radius !== segment.radius) {
                const prevRadius = prevSegment.radius * scale;
                svgContent += `
                  <line x1="${segmentStartX}" y1="${adjustedCenterY - innerRadius}" x2="${segmentStartX}" y2="${adjustedCenterY - prevRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
                  <line x1="${segmentStartX}" y1="${adjustedCenterY + innerRadius}" x2="${segmentStartX}" y2="${adjustedCenterY + prevRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
                `;
              }
            }
            
            // Shoulder at end of hole - only if next segment is also a hole
            if (index < profile.length - 1) {
              const nextSegment = profile[index + 1];
              if (nextSegment && nextSegment.type === 'hole' && nextSegment.radius !== segment.radius) {
                const nextRadius = nextSegment.radius * scale;
                svgContent += `
                  <line x1="${segmentEndX}" y1="${adjustedCenterY - innerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY - nextRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
                  <line x1="${segmentEndX}" y1="${adjustedCenterY + innerRadius}" x2="${segmentEndX}" y2="${adjustedCenterY + nextRadius}" stroke="#000000" stroke-width="${strokeWidth}"/>
                `;
              }
            }
          }
        }
      });
      
      // Thread visualization
      const tapOps = spec.machiningSteps.filter(step => step.process === 'Tap' && step.threadSize);
      if (tapOps.length > 0) {
        const threadPitch = 5;
        const threadStrokeWidth = 1.5;
        const threadOffset = 3;
        
        tapOps.forEach((tapOp, tapIndex) => {
          const tapStepIndex = spec.machiningSteps.findIndex(step => step === tapOp);
          const priorDrillOps = spec.machiningSteps
            .slice(0, tapStepIndex)
            .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
            .sort((a, b) => parseValue(b.depth || '0') - parseValue(a.depth || '0'));
          
          if (priorDrillOps.length === 0) return;
          
          const tapTargetHole = priorDrillOps[0];
          const tapDepth = parseValue(tapTargetHole.depth || '0');
          const tapRadius = parseValue(tapTargetHole.size || '0') / 2 * scale;
          
          const laterOps = spec.machiningSteps
            .slice(tapStepIndex + 1)
            .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'));
          
          // Calculate where threads actually exist
          let threadStartDepth = 0; // Threads start at surface by default
          let threadEndDepth = tapDepth; // Threads end at tap depth by default
          
          for (const laterOp of laterOps) {
            const laterDepth = parseValue(laterOp.depth || '0');
            const laterSize = parseValue(laterOp.size || '0');
            const tapHoleSize = parseValue(tapTargetHole.size || '0');
            
            // If a later operation has larger diameter, it removes threads from surface to its depth
            if (laterSize > tapHoleSize) {
              threadStartDepth = Math.max(threadStartDepth, laterDepth);
            }
          }
          
          // Only show threads if there's a valid threaded region
          if (threadStartDepth >= threadEndDepth) return;
          
          const threadStartX = rightX - (threadStartDepth * scale);
          const threadEndX = rightX - (threadEndDepth * scale);
          
          for (let x = threadStartX; x > threadEndX; x -= threadPitch) {
            svgContent += `
              <line x1="${x}" y1="${adjustedCenterY - tapRadius}" x2="${x - threadOffset}" y2="${adjustedCenterY - tapRadius * 0.5}" stroke="#2563eb" stroke-width="${threadStrokeWidth}"/>
              <line x1="${x - threadOffset}" y1="${adjustedCenterY - tapRadius * 0.5}" x2="${x - threadOffset * 2}" y2="${adjustedCenterY}" stroke="#2563eb" stroke-width="${threadStrokeWidth}"/>
              <line x1="${x - threadOffset * 2}" y1="${adjustedCenterY}" x2="${x - threadOffset}" y2="${adjustedCenterY + tapRadius * 0.5}" stroke="#2563eb" stroke-width="${threadStrokeWidth}"/>
              <line x1="${x - threadOffset}" y1="${adjustedCenterY + tapRadius * 0.5}" x2="${x}" y2="${adjustedCenterY + tapRadius}" stroke="#2563eb" stroke-width="${threadStrokeWidth}"/>
            `;
          }
        });
      }
      
      // Exposed length visualization for pins
      if ('exposedLength' in spec && spec.exposedLength) {
        const exposedLengthDimension = parseDimensionWithUnit(spec.exposedLength);
        const exposedLengthInches = convertToInches(exposedLengthDimension);
        const exposedLengthPixels = exposedLengthInches * scale;
        const exposedDiameter = 0.25; // 0.25" diameter for exposed portion
        const exposedRadiusPixels = (exposedDiameter / 2) * scale;
        
        const exposedStartX = rightX;
        const exposedEndX = rightX + exposedLengthPixels;
        
        // Exposed portion outline (dotted)
        svgContent += `<line x1="${exposedStartX}" y1="${adjustedCenterY - exposedRadiusPixels}" x2="${exposedEndX}" y2="${adjustedCenterY - exposedRadiusPixels}" stroke="#666666" stroke-width="${strokeWidth}" stroke-dasharray="4,4"/>`;
        svgContent += `<line x1="${exposedStartX}" y1="${adjustedCenterY + exposedRadiusPixels}" x2="${exposedEndX}" y2="${adjustedCenterY + exposedRadiusPixels}" stroke="#666666" stroke-width="${strokeWidth}" stroke-dasharray="4,4"/>`;
        
        // End cap for exposed portion
        svgContent += `<line x1="${exposedEndX}" y1="${adjustedCenterY - exposedRadiusPixels}" x2="${exposedEndX}" y2="${adjustedCenterY + exposedRadiusPixels}" stroke="#666666" stroke-width="${strokeWidth}" stroke-dasharray="4,4"/>`;
        
        // Exposed length dimension line
        svgContent += `<line x1="${exposedStartX}" y1="${adjustedCenterY + exposedRadiusPixels + 15}" x2="${exposedEndX}" y2="${adjustedCenterY + exposedRadiusPixels + 15}" stroke="#9333ea" stroke-width="2"/>`;
        
        // Extension lines for exposed length
        svgContent += `<line x1="${exposedStartX}" y1="${adjustedCenterY + exposedRadiusPixels}" x2="${exposedStartX}" y2="${adjustedCenterY + exposedRadiusPixels + 20}" stroke="#9333ea" stroke-width="1" stroke-dasharray="3,3"/>`;
        svgContent += `<line x1="${exposedEndX}" y1="${adjustedCenterY + exposedRadiusPixels}" x2="${exposedEndX}" y2="${adjustedCenterY + exposedRadiusPixels + 20}" stroke="#9333ea" stroke-width="1" stroke-dasharray="3,3"/>`;
        
        // Exposed length label
        svgContent += `<text x="${(exposedStartX + exposedEndX) / 2}" y="${adjustedCenterY + exposedRadiusPixels + 35}" text-anchor="middle" font-size="14" font-weight="bold" fill="#9333ea">${formatDimension(exposedLengthDimension)} exposed</text>`;
      }
      
      // Left end cap
      svgContent += `<line x1="${leftX}" y1="${adjustedCenterY - (maxDiameter * scale / 2)}" x2="${leftX}" y2="${adjustedCenterY + (maxDiameter * scale / 2)}" stroke="#000000" stroke-width="${strokeWidth}"/>`;
      
      // Center line
      svgContent += `<line x1="${leftX - 30}" y1="${adjustedCenterY}" x2="${rightX + 30}" y2="${adjustedCenterY}" stroke="#000000" stroke-width="0.5" stroke-dasharray="8,8"/>`;
      
      // Zero reference line
      svgContent += `<line x1="${rightX}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 20}" x2="${rightX}" y2="${adjustedCenterY + (maxDiameter * scale / 2) + 60}" stroke="#000000" stroke-width="1"/>`;
      
      // Zero label
      svgContent += `<text x="${rightX + 8}" y="${adjustedCenterY + (maxDiameter * scale / 2) + 50}" font-size="16" fill="#000000">0</text>`;
      
      // Material diameter dimension for ferrules
      if ('diameter' in spec && spec.diameter) {
        svgContent += `
          <line x1="${leftX - 40}" y1="${adjustedCenterY - (maxDiameter * scale / 2)}" x2="${leftX - 40}" y2="${adjustedCenterY + (maxDiameter * scale / 2)}" stroke="#ff6b35" stroke-width="2"/>
          <line x1="${leftX - 48}" y1="${adjustedCenterY - (maxDiameter * scale / 2) + 8}" x2="${leftX - 40}" y2="${adjustedCenterY - (maxDiameter * scale / 2)}" stroke="#ff6b35" stroke-width="2"/>
          <line x1="${leftX - 32}" y1="${adjustedCenterY - (maxDiameter * scale / 2) + 8}" x2="${leftX - 40}" y2="${adjustedCenterY - (maxDiameter * scale / 2)}" stroke="#ff6b35" stroke-width="2"/>
          <line x1="${leftX - 48}" y1="${adjustedCenterY + (maxDiameter * scale / 2) - 8}" x2="${leftX - 40}" y2="${adjustedCenterY + (maxDiameter * scale / 2)}" stroke="#ff6b35" stroke-width="2"/>
          <line x1="${leftX - 32}" y1="${adjustedCenterY + (maxDiameter * scale / 2) - 8}" x2="${leftX - 40}" y2="${adjustedCenterY + (maxDiameter * scale / 2)}" stroke="#ff6b35" stroke-width="2"/>
          <text x="${leftX - 60}" y="${adjustedCenterY + 5}" text-anchor="middle" font-size="16" font-weight="bold" fill="#ff6b35" transform="rotate(-90, ${leftX - 60}, ${adjustedCenterY + 5})">⌀${formatDimension(parseDimensionWithUnit(spec.diameter))}</text>
        `;
      }
      
      // Overall length dimension for components with stock length
      if ('length' in spec && (spec as any).length) {
        const lengthValue = (spec as any).length as string;
        svgContent += `
          <line x1="${leftX}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" x2="${rightX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" stroke="#2563eb" stroke-width="2"/>
          <line x1="${leftX + 8}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 48}" x2="${leftX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" stroke="#2563eb" stroke-width="2"/>
          <line x1="${leftX + 8}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 32}" x2="${leftX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" stroke="#2563eb" stroke-width="2"/>
          <line x1="${rightX - 8}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 48}" x2="${rightX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" stroke="#2563eb" stroke-width="2"/>
          <line x1="${rightX - 8}" y1="${adjustedCenterY - (maxDiameter * scale / 2) - 32}" x2="${rightX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 40}" stroke="#2563eb" stroke-width="2"/>
          <line x1="${leftX}" y1="${adjustedCenterY - (maxDiameter * scale / 2)}" x2="${leftX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 50}" stroke="#2563eb" stroke-width="1" stroke-dasharray="3,3"/>
          <line x1="${rightX}" y1="${adjustedCenterY - (maxDiameter * scale / 2)}" x2="${rightX}" y2="${adjustedCenterY - (maxDiameter * scale / 2) - 50}" stroke="#2563eb" stroke-width="1" stroke-dasharray="3,3"/>
          <text x="${(leftX + rightX) / 2}" y="${adjustedCenterY - (maxDiameter * scale / 2) - 50}" text-anchor="middle" font-size="16" font-weight="bold" fill="#2563eb">${formatDimension(parseDimensionWithUnit(lengthValue))}</text>
        `;
      }
      
      // Operation depth dimensions
      const drillOps = spec.machiningSteps
        .filter(step => step.depth && step.size && (step.process === 'Drill' || step.process === 'Bore'))
        .map(step => {
          const depthDimension = parseDimensionWithUnit(step.depth || '0');
          const sizeDimension = parseDimensionWithUnit(step.size || '0');
          return {
            depth: convertToInches(depthDimension),
            size: convertToInches(sizeDimension),
            process: step.process,
            depthFormatted: formatDimension(depthDimension),
            sizeFormatted: formatDimension(sizeDimension)
          };
        })
        .sort((a, b) => a.depth - b.depth);
      
      drillOps.forEach((op, index) => {
        const depthX = rightX - (op.depth * scale);
        const yPos = adjustedCenterY + (maxDiameter * scale / 2) + 30 + (index * 25);
        
        svgContent += `
          <line x1="${rightX}" y1="${yPos}" x2="${depthX}" y2="${yPos}" stroke="#666666" stroke-width="1"/>
          <line x1="${depthX}" y1="${adjustedCenterY + (maxDiameter * scale / 2) + 15}" x2="${depthX}" y2="${yPos + 5}" stroke="#666666" stroke-width="0.5" stroke-dasharray="3,3"/>
          <line x1="${rightX - 5}" y1="${yPos - 3}" x2="${rightX}" y2="${yPos}" stroke="#666666" stroke-width="1"/>
          <line x1="${rightX - 5}" y1="${yPos + 3}" x2="${rightX}" y2="${yPos}" stroke="#666666" stroke-width="1"/>
          <line x1="${depthX + 5}" y1="${yPos - 3}" x2="${depthX}" y2="${yPos}" stroke="#666666" stroke-width="1"/>
          <line x1="${depthX + 5}" y1="${yPos + 3}" x2="${depthX}" y2="${yPos}" stroke="#666666" stroke-width="1"/>
          <text x="${(rightX + depthX) / 2}" y="${yPos - 8}" text-anchor="middle" font-size="12" fill="#666666">⌀${op.sizeFormatted} × ${op.depthFormatted}</text>
        `;
      });
      
      // Hole diameter callouts
      const sortedBySize = [...drillOps].sort((a, b) => b.size - a.size);
      sortedBySize.forEach((op, index) => {
        const holeRadius = op.size / 2 * scale;
        const calloutX = rightX - (op.depth * scale * 0.3);
        const calloutY = adjustedCenterY - holeRadius - 20 - (index * 25);
        
        svgContent += `
          <line x1="${rightX - (op.depth * scale * 0.7)}" y1="${adjustedCenterY - holeRadius}" x2="${calloutX}" y2="${calloutY + 15}" stroke="#2563eb" stroke-width="1"/>
          <text x="${calloutX}" y="${calloutY}" text-anchor="middle" font-size="12" fill="#2563eb" font-weight="bold">⌀${op.sizeFormatted}</text>
        `;
      });
      
      svgContent += '</svg>';
      return svgContent;
    };

    // Open a new window/tab for printing instead of a modal
    const newWindow = window.open('', '_blank', 'width=1000,height=700');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Technical Drawing - ${spec.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: white;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 20px; 
              border-bottom: 1px solid #ccc; 
              padding-bottom: 10px;
            }
            .drawing-container { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .specs-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 15px; 
              margin-bottom: 30px; 
            }
            .spec-item { 
              padding: 10px; 
              background: #f5f5f5; 
              border: 1px solid #ddd; 
              border-radius: 4px; 
            }
            .spec-label { 
              font-weight: bold; 
              color: #666; 
            }
            .material-diameter { 
              background: #fff3e0; 
              border-color: #ff6b35; 
            }
            .material-diameter .spec-label { 
              color: #ff6b35; 
            }
            .machining-steps { 
              margin-top: 20px; 
            }
            .step-item { 
              display: flex; 
              align-items: center; 
              gap: 15px; 
              padding: 10px; 
              background: #f5f5f5; 
              border: 1px solid #ddd; 
              border-radius: 4px; 
              margin-bottom: 8px; 
            }
            .step-number { 
              font-weight: bold; 
              color: #666; 
              width: 25px; 
            }
            .step-process { 
              font-weight: bold; 
              color: #333; 
            }
            .step-detail { 
              color: #666; 
            }
            .assembly-notes {
              margin-top: 20px;
            }
            .notes-content {
              background: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 15px;
              line-height: 1.6;
            }
            .notes-content p {
              margin: 0 0 10px 0;
              color: #333;
            }
            .notes-content p:last-child {
              margin-bottom: 0;
            }
            @media print {
              .header button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Technical Drawing - ${spec.name}</h1>
            <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
          </div>
          
          <div class="drawing-container">
            ${generateSVGString()}
          </div>
          
          <div>
            <h2>Component Specifications</h2>
            <div class="specs-grid">
              <div class="spec-item">
                <span class="spec-label">Name:</span> ${spec.name}
              </div>
              <div class="spec-item">
                <span class="spec-label">Manufacture:</span> ${spec.manufacture}
              </div>
              ${spec.diameter ? `
                <div class="spec-item material-diameter">
                  <span class="spec-label">${'length' in spec && 'material' in spec ? 'Diameter' : 'Finished Joint Diameter'}:</span> ⌀${formatDimension(parseDimensionWithUnit(spec.diameter))}
                </div>
              ` : ''}
              ${(spec as any).length ? `
                <div class="spec-item">
                  <span class="spec-label">Length:</span> ${formatDimension(parseDimensionWithUnit((spec as any).length))}
                </div>
              ` : ''}
              ${(spec as any).material ? `
                <div class="spec-item">
                  <span class="spec-label">Material:</span> ${(spec as any).material}
                </div>
              ` : ''}
              ${spec.exposedLength ? `
                <div class="spec-item">
                  <span class="spec-label">Exposed Length:</span> ${spec.exposedLength}"
                </div>
              ` : ''}
              ${(spec as any).hasInsert !== undefined ? `
                <div class="spec-item">
                  <span class="spec-label">Has Insert:</span> ${(spec as any).hasInsert ? 'Yes' : 'No'}
                </div>
              ` : ''}
              ${(spec as any).insertMaterial ? `
                <div class="spec-item">
                  <span class="spec-label">Insert Material:</span> ${(spec as any).insertMaterial}
                </div>
              ` : ''}
              ${(spec as any).category ? `
                <div class="spec-item">
                  <span class="spec-label">Category:</span> ${(spec as any).category}
                </div>
              ` : ''}
              ${(spec as any).difficulty ? `
                <div class="spec-item">
                  <span class="spec-label">Difficulty:</span> ${(spec as any).difficulty}
                </div>
              ` : ''}
              ${(spec as any).timeEstimate ? `
                <div class="spec-item">
                  <span class="spec-label">Time Estimate:</span> ${(spec as any).timeEstimate}
                </div>
              ` : ''}
            </div>
            
            <div class="machining-steps">
              <h2>Machining Steps</h2>
              ${spec.machiningSteps.length > 0 ? 
                spec.machiningSteps.map((step, index) => `
                  <div class="step-item">
                    <span class="step-number">${index + 1}.</span>
                    <span class="step-process">${step.process === 'Tap' && step.threadSize ? `${step.process} Thread: ${step.threadSize}` : step.process}</span>
                    ${step.size ? `<span class="step-detail">⌀${formatDimension(parseDimensionWithUnit(step.size))}</span>` : ''}
                    ${step.depth ? `<span class="step-detail">× ${formatDimension(parseDimensionWithUnit(step.depth))}</span>` : ''}
                    ${step.finalDiameter ? `<span class="step-detail">Final ⌀${formatDimension(parseDimensionWithUnit(step.finalDiameter))}</span>` : ''}
                  </div>
                `).join('') : 
                '<p style="color: #666; font-style: italic;">No machining steps defined.</p>'
              }
            </div>
            
            ${(spec as any).assemblyNotes ? `
              <div class="assembly-notes">
                <h2>${(spec as any).category ? 'Procedure Notes' : 'Assembly Notes'}</h2>
                <div class="notes-content">
                  ${(spec as any).assemblyNotes.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                </div>
              </div>
            ` : ''}
            
            ${(spec as any).toolsRequired ? `
              <div class="assembly-notes">
                <h2>Tools Required</h2>
                <div class="notes-content">
                  ${(spec as any).toolsRequired.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                </div>
              </div>
            ` : ''}
            
            ${(spec as any).materialsNeeded ? `
              <div class="assembly-notes">
                <h2>Materials Needed</h2>
                <div class="notes-content">
                  ${(spec as any).materialsNeeded.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </body>
        </html>
      `);
      
      newWindow.document.close();
      newWindow.focus();
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Technical Drawing</h3>
      <div 
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 transition-colors" 
        onClick={openTechnicalDrawingWindow}
      >
        {/* Thumbnail SVG */}
        <TechnicalDrawingSVG spec={spec} isModal={false} />
        <p className="text-xs text-slate-600 mt-1 text-center">Click to open printable drawing</p>
      </div>
    </div>
  );
}