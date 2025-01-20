import axios from "axios";
import environments from "../environments";
import curlirize from "axios-curlirize";

const geoserver = axios.create({
  baseURL: environments.geoserverUrl,
  headers: {
    Authorization:
      "Basic " +
      Buffer.from(
        `${environments.geoserverUsername}:${environments.geoserverPassword}`
      ).toString("base64"),
  },
});
curlirize(geoserver);

export default geoserver;
