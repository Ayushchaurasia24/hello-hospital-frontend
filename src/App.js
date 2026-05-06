import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 Search + Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  // 🚀 FETCH SAVED DOCUMENTS ON PAGE LOAD
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 📥 FETCH FROM MONGODB
  const fetchDocuments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/upload/documents"
      );

      setResults(res.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  // 📤 Upload
  const handleUpload = async () => {
    if (!files.length) {
      alert("Please select files");
      return;
    }

    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      setLoading(true);

      await axios.post(
        "http://localhost:5000/upload",
        formData
      );

      // 🚀 Refresh latest DB documents
      await fetchDocuments();

    } catch (err) {
      console.error(err);
      alert("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  // 💊 Medicines fallback
  const getMedicines = (item) => {
    if (item.extractedData?.medicines?.length) {
      return item.extractedData.medicines.join(", ");
    }

    const fallback = item.cleanText?.match(/\b[A-Z]{5,}\b/g) || [];

    return (
      fallback
        .filter(
          (w) =>
            !w.includes("HOSP") &&
            !w.includes("MED") &&
            !w.includes("SOC") &&
            w.length < 12
        )
        .slice(0, 3)
        .join(", ") || "N/A"
    );
  };

  // 👤 GROUP BY PATIENT
  const groupByPatient = () => {
    const grouped = {};

    results.forEach((item) => {
      const patient =
        item.extractedData?.patientName || "Unknown Patient";

      if (!grouped[patient]) {
        grouped[patient] = [];
      }

      grouped[patient].push(item);
    });

    return grouped;
  };

  const groupedPatients = groupByPatient();

  // 🔍 FILTER LOGIC
  const filteredPatients = Object.entries(groupedPatients).filter(
    ([patientName, docs]) => {

      // Search filter
      const matchesSearch = patientName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType =
        selectedType === "All"
          ? true
          : docs.some((doc) =>
              doc.type?.includes(selectedType)
            );

      return matchesSearch && matchesType;
    }
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        🏥 Medical Document Analyzer
      </h1>

      {/* Upload */}
      <div style={styles.uploadBox}>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />

        <button style={styles.button} onClick={handleUpload}>
          {loading ? "⏳ Processing..." : "🚀 Upload & Analyze"}
        </button>
      </div>

      {/* 🔍 SEARCH + FILTER */}
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
          <option value="All">All</option>
          <option value="Prescription">
            Prescription
          </option>
          <option value="Bill">
            Bill
          </option>
          <option value="Lab Report">
            Lab Report
          </option>
          <option value="Receipt">
            Receipt
          </option>
          <option value="Discharge Summary">
            Discharge Summary
          </option>
        </select>
      </div>

      <h3>Total Documents: {results.length}</h3>

      <hr />

      {loading && <p>Processing documents...</p>}

      {/* 👤 PATIENT GROUPS */}
      {filteredPatients.map(
        ([patientName, docs]) => (
          <div
            key={patientName}
            style={styles.patientSection}
          >
            {/* 👤 PATIENT HEADER */}
            <h2 style={styles.patientTitle}>
              👤 {patientName}
            </h2>

            {/* 📄 DOCUMENTS */}
            {docs.map((item, index) => (
              <div key={index} style={styles.card}>
                <h3>{item.fileName}</h3>

                <p>
                  <b>📂 Type:</b>{" "}
                  {item.type?.join(", ") || "Unknown"}
                </p>

                <p>
                  <b>📅 Date:</b>{" "}
                  {item.extractedData?.date || "N/A"}
                </p>

                <p>
                  <b>💰 Amount:</b> ₹
                  {item.extractedData?.amount || "N/A"}
                </p>

                <p>
                  <b>💊 Medicines:</b>{" "}
                  {getMedicines(item)}
                </p>

                {item.confidence && (
                  <p style={styles.confidence}>
                    Confidence:{" "}
                    {Object.entries(item.confidence)
                      .map(
                        ([k, v]) => `${k} (${v})`
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// 🎨 STYLES
const styles = {
  container: {
    padding: "30px",
    backgroundColor: "#f3f4f6",
    minHeight: "100vh",
    fontFamily: "Arial",
  },

  title: {
    textAlign: "center",
    marginBottom: "20px",
  },

  uploadBox: {
    textAlign: "center",
    marginBottom: "20px",
  },

  button: {
    marginTop: "10px",
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  // 🔍 FILTERS
  filterBox: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },

  searchInput: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  select: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },

  // 👤 PATIENT SECTION
  patientSection: {
    marginBottom: "40px",
  },

  patientTitle: {
    color: "#2563eb",
    marginBottom: "15px",
    borderBottom: "2px solid #2563eb",
    paddingBottom: "5px",
  },

  // 📄 CARD
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "15px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  },

  confidence: {
    fontSize: "12px",
    color: "gray",
  },
};

export default App;