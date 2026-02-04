import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type FileInput } from "@shared/routes";

// GET /api/files/:publicId
export function useFile(publicId: string) {
  return useQuery({
    queryKey: [api.files.getByPublicId.path, publicId],
    queryFn: async () => {
      const url = buildUrl(api.files.getByPublicId.path, { publicId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch file details');
      return api.files.getByPublicId.responses[200].parse(await res.json());
    },
    enabled: !!publicId, // Only fetch if publicId is provided
  });
}

// POST /api/files
export function useCreateFile() {
  return useMutation({
    mutationFn: async (data: FileInput) => {
      const validated = api.files.create.input.parse(data);
      const res = await fetch(api.files.create.path, {
        method: api.files.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.files.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to save file metadata');
      }
      return api.files.create.responses[201].parse(await res.json());
    },
  });
}

// GET /api/files/:fileId/messages
export function useMessages(fileId: number) {
  return useQuery({
    queryKey: [api.messages.list.path, fileId],
    queryFn: async () => {
      const url = buildUrl(api.messages.list.path, { fileId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return api.messages.list.responses[200].parse(await res.json());
    },
    enabled: !!fileId,
  });
}
