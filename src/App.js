import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API = "http://localhost:5000/upload";

const STATUS_COLORS = {
  queued: "#f59e0b",
  processing: "#3b82f6",
  completed: "#10b981",
  failed: "#ef4444",
};

function App() {

  // ================= STATE =================
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= FILTERS =================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  // ================= INITIAL FETCH =================
  useEffect(() => {
    fetchDocuments();
  }, []);

  // ================= FETCH DOCUMENTS =================
  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents`);
      setResults(res.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  // ================= FILE UPLOAD =================
  const handleUpload = async () => {

    if (!files.length)
      return alert("Please select files");

    const formData = new FormData();

    Array.from(files).forEach((file) =>
      formData.append("files", file)
    );

    try {

      setLoading(true);

      // Upload Files
      const uploadRes = await axios.post(
        API,
        formData
      );

      const uploadedIds =
        uploadRes.data.uploadedDocumentIds;

      console.log("✅ Files Uploaded");

      // Start Polling
      const interval = setInterval(async () => {

        try {

          const res = await axios.get(
            `${API}/documents`
          );

          const docs = res.data || [];

          setResults(docs);

          // Pending Uploaded Docs
          const pendingDocs = docs.filter(
            (doc) =>
              uploadedIds.includes(doc._id) &&
              ["queued", "processing"]
                .includes(doc.status)
          );

          // Stop Polling
          if (!pendingDocs.length) {

            clearInterval(interval);

            setLoading(false);

            console.log(
              "✅ Processing Completed"
            );
          }

        } catch (error) {

          console.error(
            "Polling Error:",
            error
          );

          clearInterval(interval);

          setLoading(false);
        }

      }, 2000);

    } catch (error) {

      console.error(
        "Upload Error:",
        error
      );

      setLoading(false);

      alert("Upload failed");
    }
  };

  // ================= MEDICINE EXTRACTION =================
  const getMedicines = (item) => {

    if (
      item?.extractedData?.medicines?.length
    ) {
      return item.extractedData
        .medicines
        .join(", ");
    }

    return (
      item?.cleanText
        ?.match(/\b[A-Z]{5,}\b/g)

        ?.filter(
          (w) =>
            !["HOSP", "MED", "SOC"]
              .some((x) => w.includes(x)) &&
            w.length < 12
        )

        ?.slice(0, 3)

        ?.join(", ")

      || "N/A"
    );
  };

  // ================= GROUP PATIENTS =================
  const groupedPatients = useMemo(() => {

    return results.reduce((acc, item) => {

      const patient =
        item?.extractedData?.patientName?.trim()
        || "Unknown Patient";

      if (!acc[patient]) acc[patient] = [];

      acc[patient].push(item);

      return acc;

    }, {});

  }, [results]);

  // ================= FILTER PATIENTS =================
  const filteredPatients = useMemo(() => {

    return Object.entries(groupedPatients)
      .filter(([patient, docs]) => {

        const searchMatch =
          patient.toLowerCase()
            .includes(searchTerm.toLowerCase());

        const typeMatch =
          selectedType === "All"
            || docs.some((doc) =>
              doc.type?.includes(selectedType)
            );

        return searchMatch && typeMatch;
      });

  }, [groupedPatients, searchTerm, selectedType]);

  return (
    <div style={styles.container}>

      {/* ================= HEADER ================= */}
      <h1 style={styles.title}>
        🏥 Medical Document Analyzer
      </h1>

      {/* ================= UPLOAD ================= */}
      <div style={styles.uploadBox}>

        <input
          type="file"
          multiple
          onChange={(e) =>
            setFiles(e.target.files)
          }
        />

        <button
          style={styles.button}
          onClick={handleUpload}
        >
          {loading
            ? "⏳ Processing..."
            : "🚀 Upload & Analyze"}
        </button>

      </div>

      {/* ================= FILTERS ================= */}
      <div style={styles.filterBox}>

        <input
          type="text"
          placeholder="🔍 Search patient..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          style={styles.searchInput}
        />

        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value)
          }
          style={styles.select}
        >

          {[
            "All",
            "Prescription",
            "Bill",
            "Lab Report",
            "Receipt",
            "Discharge Summary",
          ].map((type) => (

            <option
              key={type}
              value={type}
            >
              {type}
            </option>

          ))}

        </select>

      </div>

      <h3>
        📄 Total Documents: {results.length}
      </h3>

      <hr />

      {/* ================= DOCUMENTS ================= */}
      {filteredPatients.map(
        ([patientName, docs]) => (

          <div
            key={patientName}
            style={styles.patientSection}
          >

            <h2 style={styles.patientTitle}>
              👤 {patientName}
            </h2>

            {docs.map((item, index) => (

              <div
                key={index}
                style={styles.card}
              >

                <h3>{item.fileName}</h3>

                {/* STATUS */}
                <p>
                  <b>Status:</b>{" "}

                  <span
                    style={{
                      ...styles.status,
                      backgroundColor:
                        STATUS_COLORS[item.status],
                    }}
                  >
                    {item.status}
                  </span>
                </p>

                <p>
                  <b>📂 Type:</b>{" "}
                  {item.type?.join(", ")}
                </p>

                <p>
                  <b>📅 Date:</b>{" "}
                  {item?.extractedData?.date || "N/A"}
                </p>

                <p>
                  <b>💰 Amount:</b> ₹
                  {item?.extractedData?.amount || "N/A"}
                </p>

                <p>
                  <b>💊 Medicines:</b>{" "}
                  {getMedicines(item)}
                </p>

              </div>

            ))}

          </div>

        )
      )}

    </div>
  );
}

// ================= STYLES =================
const styles = {

  container: {
    padding: 30,
    backgroundColor: "#f3f4f6",
    minHeight: "100vh",
    fontFamily: "Arial",
  },

  title: {
    textAlign: "center",
    marginBottom: 20,
  },

  uploadBox: {
    textAlign: "center",
    marginBottom: 20,
  },

  button: {
    marginTop: 10,
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  filterBox: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },

  searchInput: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  select: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },

  patientSection: {
    marginBottom: 40,
  },

  patientTitle: {
    color: "#2563eb",
    marginBottom: 15,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 5,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  },

  status: {
    padding: "4px 10px",
    borderRadius: 20,
    color: "#fff",
    fontWeight: "bold",
  },
};

export default App;