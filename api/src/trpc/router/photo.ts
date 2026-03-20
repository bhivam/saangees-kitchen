import { randomUUID } from "crypto";
import z from "zod";
import { adminProcedure, createTRPCRouter } from "../index.js";
import { getUploadUrl } from "../../lib/s3-presigner.js";
import { env } from "../../env.js";

const contentTypeSchema = z.string().regex(/^image\/(jpeg|png|webp|gif)$/, "Invalid image type");

export const photoRouter = createTRPCRouter({
  getPresignedUrl: adminProcedure
    .input(z.object({ contentType: contentTypeSchema }))
    .mutation(async ({ input: { contentType } }) => {
      const ext = contentType.split("/")[1];
      const key = `menu-items/${randomUUID()}.${ext}`;
      const uploadUrl = await getUploadUrl(key, contentType);
      const publicUrl = `https://${env.BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
      return { uploadUrl, publicUrl };
    }),
});
