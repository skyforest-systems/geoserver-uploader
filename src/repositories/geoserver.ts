import axios from "axios";
import environments from "../environments";

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

export default geoserver;
