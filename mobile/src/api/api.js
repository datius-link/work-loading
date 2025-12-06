import axios from "axios";

export const API = axios.create({
  baseURL: "http://10.79.93.51:5000/api", 
  timeout: 10000,
});
