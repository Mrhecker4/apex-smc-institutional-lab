if (typeof time === "string") {
  const parsed = Date.parse(time);
  return Number.isFinite(parsed) ? parsed : 0;
}
