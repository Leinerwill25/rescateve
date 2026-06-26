import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// In-memory cache for Lovable API
let lovableCache: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getLovableData() {
  if (lovableCache && Date.now() - lastFetchTime < CACHE_TTL) {
    return lovableCache;
  }

  try {
    let allData: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`https://pacientesterremotovzla.lovable.app/api/public/v1/people?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': 'Bearer VeVdSa.5-E7-D-E'
        }
      });
      
      if (!res.ok) {
        console.error("Error fetching Lovable API", res.status);
        break; // Fail gracefully
      }
      
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        allData = [...allData, ...json.data];
        offset += limit;
        if (allData.length >= json.count) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    lovableCache = allData;
    lastFetchTime = Date.now();
    return lovableCache;
  } catch (error) {
    console.error("Lovable API Error:", error);
    return lovableCache || [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  if (mode === "cedula") {
    // 1. Fetch from Supabase via RPC
    const { data: supaData } = await supabase.rpc("verificar_paciente_cedula", {
      p_cedula: query
    });

    // 2. Filter from Lovable Cache
    const lovableData = await getLovableData();
    const lovableMatches = lovableData.filter(p => p.ci === query);

    // Merge logic for Cedula (Returns exactly one match if found)
    if (supaData && supaData.length > 0) {
      return NextResponse.json({ result: supaData[0] });
    } else if (lovableMatches.length > 0) {
      const l = lovableMatches[0];
      return NextResponse.json({
        result: {
          nombre: l.full_name,
          hospital: l.hospital?.name || "Desconocido",
          edad: null,
          estado: "Hospitalizado"
        }
      });
    }

    return NextResponse.json({ result: null });
  } 
  
  if (mode === "nombre") {
    // 1. Fetch from Supabase (ilike)
    const { data: supaData } = await supabase
      .from("pacientes_publico")
      .select("*")
      .ilike("nombre", `%${query}%`)
      .limit(50);

    // 2. Fetch from Lovable Cache and filter
    const lovableData = await getLovableData();
    const qUpper = query.toUpperCase();
    const lovableMatches = lovableData
      .filter(p => p.full_name && p.full_name.toUpperCase().includes(qUpper))
      .slice(0, 50);

    // 3. Deduplicate
    const finalResults: any[] = [];
    const seenNames = new Set<string>();

    // Add Supabase first (usually richer data)
    if (supaData) {
      for (const item of supaData) {
        finalResults.push(item);
        seenNames.add(item.nombre.toUpperCase());
      }
    }

    // Add Lovable matches if not duplicate
    for (const item of lovableMatches) {
      const nameUpper = item.full_name.toUpperCase();
      
      if (!seenNames.has(nameUpper)) {
        finalResults.push({
          id: item.id,
          nombre: item.full_name,
          hospital: item.hospital?.name || "Desconocido",
          edad: null,
          estado: "Hospitalizado"
        });
        seenNames.add(nameUpper);
      }
    }

    return NextResponse.json({ results: finalResults.slice(0, 50) });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
