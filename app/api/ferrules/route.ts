import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export interface FerruleSpec {
  id: string;
  name: string;
  diameter: string;
  length: string;
  material: string;
  build_style: string;
  machining_steps: string[];
  assembly_notes: string;
  vault_plate: boolean;
  vault_plate_material?: string;
  vault_plate_thickness?: string;
  created_at: string;
  updated_at: string;
}

// GET - Fetch all ferrule specs
export async function GET() {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json({ error: 'Database not configured. Please set up Supabase credentials.' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('ferrule_specs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase GET Error:', error);
      return NextResponse.json({ error: 'Failed to fetch ferrules', details: error.message }, { status: 500 });
    }

    // Transform data to match frontend interface
    const ferrules = data?.map(row => ({
      id: row.id,
      name: row.name,
      diameter: row.diameter,
      length: row.length,
      material: row.material,
      buildStyle: row.build_style,
      machiningSteps: row.machining_steps || [],
      assemblyNotes: row.assembly_notes,
      vaultPlate: row.vault_plate,
      vaultPlateMaterial: row.vault_plate_material,
      vaultPlateThickness: row.vault_plate_thickness,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    })) || [];

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
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json({ error: 'Database not configured. Please set up Supabase credentials.' }, { status: 503 });
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

    const { data, error } = await supabase
      .from('ferrule_specs')
      .insert({
        id,
        name,
        diameter,
        length,
        material,
        build_style: buildStyle,
        machining_steps: machiningSteps,
        assembly_notes: assemblyNotes,
        vault_plate: vaultPlate,
        vault_plate_material: vaultPlateMaterial || null,
        vault_plate_thickness: vaultPlateThickness || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase POST Error:', error);
      return NextResponse.json({ error: 'Failed to create ferrule', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create ferrule', details: errorMessage }, { status: 500 });
  }
}

// PUT - Update existing ferrule spec
export async function PUT(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json({ error: 'Database not configured. Please set up Supabase credentials.' }, { status: 503 });
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

    const { data, error } = await supabase
      .from('ferrule_specs')
      .update({
        name,
        diameter,
        length,
        material,
        build_style: buildStyle,
        machining_steps: machiningSteps,
        assembly_notes: assemblyNotes,
        vault_plate: vaultPlate,
        vault_plate_material: vaultPlateMaterial || null,
        vault_plate_thickness: vaultPlateThickness || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase PUT Error:', error);
      return NextResponse.json({ error: 'Failed to update ferrule', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('PUT Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update ferrule', details: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete ferrule spec
export async function DELETE(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      return NextResponse.json({ error: 'Database not configured. Please set up Supabase credentials.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ferrule_specs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE Error:', error);
      return NextResponse.json({ error: 'Failed to delete ferrule', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('DELETE Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete ferrule', details: errorMessage }, { status: 500 });
  }
}