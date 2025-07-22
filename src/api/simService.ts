import axios from "axios";
import type { ParsedSIM } from "../types";

axios.create({
  baseURL: "https://cdn.emnify.net",
  timeout: 10,
});

export const getAuthToken = async (appkey: string): Promise<string> => {
  try {
    const response = await axios(
      "/api/v1/authenticate",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.token;
  } catch (error) {
    console.error("Error fetching auth token:", error);
    throw error;
  }
};
