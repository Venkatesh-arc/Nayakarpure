export function toApi(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = (obj._id ?? obj.id)?.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}
