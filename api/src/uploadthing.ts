import { createUploadthing, type FileRouter } from "uploadthing/express";
import z from "zod";

const f = createUploadthing();

export const uploadRouter: FileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({
        itemId: z.uuid(),
      }),
    )
    .middleware(async ({ input }) => {
      return input;
    })
    .onUploadComplete((data) => {
      console.log("upload completed", data);
    }),
};

