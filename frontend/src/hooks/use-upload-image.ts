import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useUploadImage() {
  const trpc = useTRPC();

  const presignedUrlMutation = useMutation(
    trpc.photo.getPresignedUrl.mutationOptions(),
  );

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be less than 5MB");
      }

      const { uploadUrl, publicUrl } = await presignedUrlMutation.mutateAsync({
        contentType: file.type,
      });

      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      return publicUrl;
    },
  });

  return {
    uploadMutation,
    isPending: presignedUrlMutation.isPending || uploadMutation.isPending,
  };
}

