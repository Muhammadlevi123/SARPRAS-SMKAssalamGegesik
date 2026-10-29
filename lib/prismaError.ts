// true jika error karena data unik bentrok (misal nama lokasi sudah ada)
export function isUniqueError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}