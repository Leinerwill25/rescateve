const MAX_MB = 5;
const MAX_PX = 1600;

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        const ratio = Math.min(MAX_PX / width, MAX_PX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Solo se permiten archivos de imagen (JPG, PNG, etc.).";
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return `La imagen supera los ${MAX_MB} MB.`;
  }
  return null;
}

export async function uploadEntregaImage(ticketId: string, file: File): Promise<string> {
  const { supabase } = await import("@/lib/supabase");

  let blob: Blob = file;
  try {
    blob = await compressImage(file);
  } catch {
    blob = file;
  }

  const path = `${ticketId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("entregas")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(`Error al subir foto: ${error.message}`);

  return supabase.storage.from("entregas").getPublicUrl(path).data.publicUrl;
}
