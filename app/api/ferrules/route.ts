import { getFirestore, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
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
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      return NextResponse.json([], { status: 200 });
    }

    const db = getFirestore();
    if (!db) {
      return NextResponse.json([], { status: 200 });
    }

    const ferrulesRef = collection(db, 'ferrule_specs');
    const q = query(ferrulesRef, orderBy('created_at', 'desc'));
    const querySnapshot = await getDocs(q);

    const ferrules = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name,
        diameter: data.diameter,
        length: data.length,
        material: data.material,
        buildStyle: data.build_style,
        machiningSteps: data.machining_steps || [],
        assemblyNotes: data.assembly_notes,
        vaultPlate: data.vault_plate || false,
        vaultPlateMaterial: data.vault_plate_material,
        vaultPlateThickness: data.vault_plate_thickness,
        createdAt: data.created_at?.toDate() || new Date(),
        updatedAt: data.updated_at?.toDate() || new Date()
      };
    });

    return NextResponse.json(ferrules, { status: 200 });
  } catch (error) {
    console.error('Firebase GET Error:', error);
    // Return empty array instead of error to allow localStorage fallback
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Create new ferrule spec
export async function POST(request: NextRequest) {
  try {
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

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const db = getFirestore();
    if (!db) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const ferrulesRef = collection(db, 'ferrule_specs');
    const docRef = await addDoc(ferrulesRef, {
      name,
      diameter,
      length,
      material,
      build_style: buildStyle,
      machining_steps: machiningSteps || [],
      assembly_notes: assemblyNotes,
      vault_plate: vaultPlate || false,
      vault_plate_material: vaultPlateMaterial || null,
      vault_plate_thickness: vaultPlateThickness || null,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Ferrule spec created successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Firebase POST Error:', error);
    const body = await request.json();
    return NextResponse.json({ success: true, id: body.id, localStorage: true }, { status: 200 });
  }
}

// PUT - Update existing ferrule spec
export async function PUT(request: NextRequest) {
  try {
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

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const db = getFirestore();
    if (!db) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const docRef = doc(db, 'ferrule_specs', id);
    await updateDoc(docRef, {
      name,
      diameter,
      length,
      material,
      build_style: buildStyle,
      machining_steps: machiningSteps || [],
      assembly_notes: assemblyNotes,
      vault_plate: vaultPlate || false,
      vault_plate_material: vaultPlateMaterial || null,
      vault_plate_thickness: vaultPlateThickness || null,
      updated_at: Timestamp.now()
    });

    return NextResponse.json({ 
      success: true, 
      id,
      message: 'Ferrule spec updated successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Firebase PUT Error:', error);
    const body = await request.json();
    return NextResponse.json({ success: true, id: body.id, localStorage: true }, { status: 200 });
  }
}

// DELETE - Delete ferrule spec
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const db = getFirestore();
    if (!db) {
      return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
    }

    const docRef = doc(db, 'ferrule_specs', id);
    await deleteDoc(docRef);

    return NextResponse.json({ 
      success: true, 
      id,
      message: 'Ferrule spec deleted successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Firebase DELETE Error:', error);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    return NextResponse.json({ success: true, id, localStorage: true }, { status: 200 });
  }
}