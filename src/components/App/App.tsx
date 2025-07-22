import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const AVAILABLE_COLUMNS: ColumnKey[] = ["id", "iccid", "iccid_with_luhn"];
const API_BASE_URL = "https://cdn.emnify.net";
const APP_KEY = import.meta.env.VITE_APP_KEY;
const SIM_STATUS_LABELS: Record<number, string> = {
  0: "Issued",
  1: "Activated",
  2: "Suspended",
  3: "Deleted",
  4: "Factory Test",
};

type ColumnKey = keyof Sim;

interface AuthResponse {
  auth_token: string;
}

interface Sim {
  id: string;
  iccid?: string;
  iccid_with_luhn?: string;
  status?: number;
  // add other fields you need
}

const fetchToken = async (): Promise<string> => {
  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/api/v1/authenticate`,
    {
      application_token: APP_KEY,
    }
  );
  return response.data.auth_token;
};

const fetchFilteredSIMs = async (
  auth_token: string,
  status: number
): Promise<Sim[]> => {
  let page = 1;
  const per_page = 2500;
  let allSIMs: Sim[] = [];
  let hasMore = true;

  while (hasMore) {
    const res = await axios.get(`${API_BASE_URL}/api/v1/sim`, {
      headers: {
        Authorization: `Bearer ${auth_token}`,
      },
      params: {
        page,
        per_page,
        q: `status:${status}`,
      },
    });

    const data = res.data as Sim[];

    if (data.length > 0) {
      allSIMs = allSIMs.concat(data);
      page += 1;
    } else {
      hasMore = false;
    }
  }

  return allSIMs;
};

function App() {
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<number>(1);
  const [authStatus, setAuthStatus] = useState("Auth error");
  const [simStatus, setSimStatus] = useState("");
  const [sims, setSims] = useState<Sim[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([
    "id",
    "iccid",
  ]);

  const authMutation = useMutation({
    mutationFn: fetchToken,
    onSuccess: (token) => {
      queryClient.setQueryData(["authToken"], token);
      setAuthStatus("Auth OK");
    },
    onError: () => {
      setAuthStatus("Auth error");
    },
  });

  const simMutation = useMutation({
    mutationFn: async () => {
      const token = queryClient.getQueryData<string>(["authToken"]);
      if (!token) throw new Error("Not authenticated");
      // const statusToFilter = 1; // Activated SIMs
      return await fetchFilteredSIMs(token, selectedStatus);
    },
    onSuccess: (data) => {
      setSims(data);
      setSimStatus(
        `Found ${data.length} SIMs with status "${SIM_STATUS_LABELS[selectedStatus]}"`
      );
    },
    onError: (err: Error) => {
      setSimStatus(`SIMs fetch error: ${err.message}`);
    },
  });
  const { mutate, isPending } = simMutation;

  const downloadCSV = () => {
    if (!sims.length || selectedColumns.length === 0) return;

    const header = selectedColumns.map((col) => `"${col}"`).join(",");
    const rows = sims.map((sim) =>
      selectedColumns.map((col) => `"${sim[col] ?? ""}"`).join(",")
    );
    const csvContent = [header, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sims_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 10 }}>
      <h1>SIM Management</h1>
      <button onClick={() => authMutation.mutate()}>Authenticate</button>
      <p>Status: {authStatus}</p>

      <fieldset style={{ marginTop: "10px" }}>
        <legend>Select SIM status to fetch:</legend>
        {Object.entries(SIM_STATUS_LABELS).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              value={value}
              checked={selectedStatus === Number(value)}
              onChange={() => setSelectedStatus(Number(value))}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <button
        onClick={() => mutate()}
        disabled={!queryClient.getQueryData(["authToken"]) || isPending}
      >
        {isPending ? "Fetching..." : "Fetch SIMs"} (status {selectedStatus})
      </button>
      <p>{simStatus}</p>

      <fieldset style={{ display: "flex", marginTop: "10px" }}>
        <legend>Select columns to display and download:</legend>
        {AVAILABLE_COLUMNS.map((col) => (
          <label key={col}>
            <input
              type="checkbox"
              checked={selectedColumns.includes(col)}
              onChange={() =>
                setSelectedColumns((prev) =>
                  prev.includes(col)
                    ? prev.filter((c) => c !== col)
                    : [...prev, col]
                )
              }
            />
            {col}
          </label>
        ))}
      </fieldset>
      <button onClick={downloadCSV}>Download CSV</button>
      {simStatus && sims.length > 0 && selectedColumns.length > 0 && (
        <>
          <h3 style={{ marginTop: "10px" }}>Preview (first 5 rows)</h3>
          <table border={1} cellPadding={1} style={{ marginTop: "10px" }}>
            <thead>
              <tr>
                {selectedColumns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sims.slice(0, 5).map((sim) => (
                <tr key={sim.id}>
                  {selectedColumns.map((col) => (
                    <td key={col}>{sim[col] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default App;
