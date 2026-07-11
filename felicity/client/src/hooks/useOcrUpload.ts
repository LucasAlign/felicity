import { useMutation } from "@tanstack/react-query";

async function uploadImage(file: File): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/ocr-upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export function useOcrUpload() {
  return useMutation({ mutationFn: uploadImage });
}
