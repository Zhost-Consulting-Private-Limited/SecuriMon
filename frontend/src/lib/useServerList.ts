import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "./api";

export interface ServerOption {
  id: string;
  hostname: string;
}

export function useServerList() {
  const { token } = useAuth();
  const [servers, setServers] = useState<ServerOption[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get<ServerOption[]>("/v1/servers", token)
      .then((list) => {
        setServers(list);
        if (list.length > 0) setSelected(list[0].id);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load servers"));
  }, [token]);

  return { servers, selected, setSelected, error, token };
}
