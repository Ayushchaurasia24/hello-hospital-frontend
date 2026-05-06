import React, { useState } from "react";
import axios from "axios";

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All"); // 🔥 NEW

  // 📤 Upload
  const handleUpload = async () => {
    if (!files.length) {
      alert("Please select files");
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/upload",
        formData
      );

      setResults(res.data.results || []);
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

    return fallback
      .filter(
        (w) =>
          !w.includes("HOSP") &&
          !w.includes("MED") &&
          !w.includes("SOC") &&
          w.length < 12
      )
      .slice(0, 3)
      .join(", ") || "N/A";
  };

  // 📂 Group by primary type (NO DUPLICATES)
  const groupByType = () => {
    const grouped = {};

    results.forEach((item) => {
      const mainType = item.type?.[0] || "Unknown";

      if (!grouped[mainType]) grouped[mainType] = [];
      grouped[mainType].push(item);
    });

    return grouped;
  };

  const groupedResults = groupByType();

  // 🎯 Filtered groups
  const filteredGroups =
    filter === "All"
      ? groupedResults
      : { [filter]: groupedResults[filter] || [] };

  // 🧠 Extract available types dynamically
  const availableTypes = Object.keys(groupedResults).filter(
    (t) => t !== "Unknown"
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏥 Medical Document Analyzer</h1>

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

      <h3>Total Documents: {results.length}</h3>

      {/* 🔥 FILTER BUTTONS */}
      <div style={styles.filterContainer}>
        <button
          style={filter === "All" ? styles.activeBtn : styles.filterBtn}
          onClick={() => setFilter("All")}
        >
          All
        </button>

        {availableTypes.map((type) => (
          <button
            key={type}
            style={filter === type ? styles.activeBtn : styles.filterBtn}
            onClick={() => setFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <hr />

      {loading && <p>Processing documents...</p>}

      {/* RESULTS */}
      {Object.entries(filteredGroups)
        .filter(([type]) => type !== "Unknown")
        .map(([type, docs]) => (
          <div key={type} style={{ marginBottom: "25px" }}>
            <h2 style={styles.sectionTitle}>
              {type === "Prescription" && "💊 Prescriptions"}
              {type === "Bill" && "💰 Bills"}
              {type === "Lab Report" && "🧪 Lab Reports"}
              {type === "Receipt" && "🧾 Receipts"}
            </h2>

            {docs.map((item, index) => (
              <div key={index} style={styles.card}>
                <h3>{item.fileName}</h3>

                <p><b>👤 Patient:</b> {item.extractedData?.patientName || "N/A"}</p>
                <p><b>📅 Date:</b> {item.extractedData?.date || "N/A"}</p>
                <p><b>💰 Amount:</b> ₹{item.extractedData?.amount || "N/A"}</p>
                <p><b>💊 Medicines:</b> {getMedicines(item)}</p>

                {item.confidence && (
                  <p style={styles.confidence}>
                    Confidence:{" "}
                    {Object.entries(item.confidence)
                      .map(([k, v]) => `${k} (${v})`)
                      .join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
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

  // 🔥 FILTER BUTTONS
  filterContainer: {
    marginTop: "15px",
    textAlign: "center",
  },
  filterBtn: {
    margin: "5px",
    padding: "8px 16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "white",
  },
  activeBtn: {
    margin: "5px",
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "#2563eb",
    color: "white",
  },

  sectionTitle: {
    color: "#2563eb",
  },

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