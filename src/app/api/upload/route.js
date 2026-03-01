import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const REQUIRED_R2_ENV = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];

const getEnv = (key) => String(process.env[key] || "").trim();

const normalizeEndpoint = (rawEndpoint) => {
  const candidate = String(rawEndpoint || "").trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
};

export async function POST(req) {
  const missingEnv = REQUIRED_R2_ENV.filter((key) => !getEnv(key));
  if (missingEnv.length > 0) {
    return NextResponse.json(
      { error: `Upload service is not configured. Missing: ${missingEnv.join(", ")}` },
      { status: 500 }
    );
  }

  const endpoint = normalizeEndpoint(getEnv("R2_ENDPOINT"));
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_BUCKET_NAME");
  const r2PublicUrl = getEnv("R2_PUBLIC_URL");

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 });
  }

  if (typeof file.size === "number" && file.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = String(file.name || "upload.jpg").replace(/[^\w.\-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );
  } catch (error) {
    console.error("R2 upload failed:", error?.message || error);
    const status = error?.$metadata?.httpStatusCode;
    const reason = error?.name || "UploadError";
    return NextResponse.json(
      { error: `Failed to upload image (${reason}${status ? ` ${status}` : ""}). Check R2 endpoint, key, secret, and bucket.` },
      { status: 500 }
    );
  }

  const publicBase =
    r2PublicUrl.replace(/\/$/, "") ||
    `${endpoint.replace(/\/$/, "")}/${bucket}`;
  const fileUrl = `${publicBase}/${fileName}`;

  return NextResponse.json({ url: fileUrl });
}
