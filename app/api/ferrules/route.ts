import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export interface FerruleSpec {
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
  createdAt: Date;
  updatedAt: Date;
}

// Check if database is available
function isDatabaseAvailable() {
  return process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
}

// Initialize database table
async function initDatabase() {
  if (!isDatabaseAvailable()) {
    console.log('Database not available, skipping initialization');
    return false;
  }
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ferrule_specs (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        diameter VARCHAR(100),
        length VARCHAR(100),
        material VARCHAR(255),
        build_style VARCHAR(255),
        machining_steps TEXT,
        assembly_notes TEXT,
        vault_plate BOOLEAN DEFAULT FALSE,
        vault_plate_material VARCHAR(255),
        vault_plate_thickness VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// GET - Fetch all ferrule specs
export async function GET() {
  try {
    const dbAvailable = await initDatabase();
    
    if (!dbAvailable) {
      // Return empty array if database not available
      return NextResponse.json([]);
    }
    
    const { rows } = await sql`
      SELECT * FROM ferrule_specs 
      ORDER BY created_at DESC
    `;

    const ferrules: FerruleSpec[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      diameter: row.diameter,
      length: row.length,
      material: row.material,
      buildStyle: row.build_style,
      machiningSteps: row.machining_steps ? JSON.parse(row.machining_steps) : [],
      assemblyNotes: row.assembly_notes,
      vaultPlate: row.vault_plate,
      vaultPlateMaterial: row.vault_plate_material,
      vaultPlateThickness: row.vault_plate_thickness,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    return NextResponse.json(ferrules);
  } catch (error) {
    console.error('GET Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch ferrules', details: errorMessage }, { status: 500 });
  }
}

// POST - Create new ferrule spec
export async function POST(request: NextRequest) {
  try {
    const dbAvailable = await initDatabase();
    
    if (!dbAvailable) {
      return NextResponse.json({ error: 'Database not available. Please set up Vercel Postgres first.' }, { status: 503 });
    }
    
    const body = await request.json();
    const {
      id,
      name,
      diameter,
      length,
      material,
      buildStyle,
      machiningSteps,
      assemblyNotes,
      vaultPlate,
      vaultPlateMaterial,
      vaultPlateThickness
    } = body;

    await sql`
      INSERT INTO ferrule_specs (
        id, name, diameter, length, material, build_style,
        machining_steps, assembly_notes, vault_plate,
        vault_plate_material, vault_plate_thickness
      ) VALUES (
        ${id}, ${name}, ${diameter}, ${length}, ${material}, ${buildStyle},
        ${JSON.stringify(machiningSteps)}, ${assemblyNotes}, ${vaultPlate},
        ${vaultPlateMaterial || null}, ${vaultPlateThickness || null}
      )
    `;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create ferrule', details: errorMessage }, { status: 500 });
  }
}

// PUT - Update existing ferrule spec
export async function PUT(request: NextRequest) {
  try {
    const dbAvailable = isDatabaseAvailable();
    
    if (!dbAvailable) {
      return NextResponse.json({ error: 'Database not available. Please set up Vercel Postgres first.' }, { status: 503 });
    }
    
    const body = await request.json();
    const {
      id,
      name,
      diameter,
      length,
      material,
      buildStyle,
      machiningSteps,
      assemblyNotes,
      vaultPlate,
      vaultPlateMaterial,
      vaultPlateThickness
    } = body;

    await sql`
      UPDATE ferrule_specs SET
        name = ${name},
        diameter = ${diameter},
        length = ${length},
        material = ${material},
        build_style = ${buildStyle},
        machining_steps = ${JSON.stringify(machiningSteps)},
        assembly_notes = ${assemblyNotes},
        vault_plate = ${vaultPlate},
        vault_plate_material = ${vaultPlateMaterial || null},
        vault_plate_thickness = ${vaultPlateThickness || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('PUT Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update ferrule', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete ferrule spec
export async function DELETE(request: NextRequest) {
  try {
    const dbAvailable = isDatabaseAvailable();
    
    if (!dbAvailable) {
      return NextResponse.json({ error: 'Database not available. Please set up Vercel Postgres first.' }, { status: 503 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM ferrule_specs WHERE id = ${id}`;

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete ferrule', details: errorMessage }, { status: 500 });
  }
}