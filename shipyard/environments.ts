export const geoserverUrl = process.env.GEOSERVER_URL || "";
export const geoserverUser = process.env.GEOSERVER_USER || "";
export const geoserverPassword = process.env.GEOSERVER_PASSWORD || "";
export const bearerToken = `Basic ${Buffer.from(
  `${geoserverUser}:${geoserverPassword}`
).toString("base64")}`;
