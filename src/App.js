import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  // 🚀 Initial Fetch
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 📥 Fetch Docs
  const fetchDocuments = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/upload/documents"
      );

      setResults(res.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
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

      // 📤 Upload files
      await axios.post(
        "http://localhost:5000/upload",
        formData
      );

      // 🔄 Poll DB every 3 sec
      const oldCount = results.length;

      const interval = setInterval(async () => {

        try {

          const res = await axios.get(
            "http://localhost:5000/upload/documents"
          );

          const newDocs = res.data || [];

          setResults(newDocs);

          console.log(
            "Polling...",
            newDocs.length
          );

          // ✅ Stop immediately when new doc appears
          if (newDocs.length > oldCount) {

            clearInterval(interval);

            setLoading(false);

            console.log(
              "✅ New documents received"
            );
          }

        } catch (error) {

          console.error(
            "Polling error:",
            error
          );

          clearInterval(interval);

          setLoading(false);
        }

      }, 3000);

    } catch (error) {

      console.error(error);

      alert("Upload failed");

      setLoading(false);
    }
  };

  // 💊 Medicine Fallback
  const getMedicines = (item) => {
    if (item?.extractedData?.medicines?.length) {
      return item.extractedData.medicines.join(", ");
    }

    const fallback =
      item?.cleanText?.match(/\b[A-Z]{5,}\b/g) || [];

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

  // 👤 Group By Patient
  const groupedPatients = useMemo(() => {
    const grouped = {};

    results.forEach((item) => {
      const patient =
        item?.extractedData?.patientName?.trim() ||
        "Unknown Patient";

      if (!grouped[patient]) {
        grouped[patient] = [];
      }

      grouped[patient].push(item);
    });

    return grouped;
  }, [results]);

  // 🔍 Filtered Patients
  const filteredPatients = useMemo(() => {
    return Object.entries(groupedPatients).filter(
      ([patientName, docs]) => {

        const matchesSearch =
          patientName
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesType =
          selectedType === "All"
            ? true
            : docs.some((doc) =>
                doc.type?.includes(selectedType)
              );

        return matchesSearch && matchesType;
      }
    );
  }, [groupedPatients, searchTerm, selectedType]);

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

        <button
          style={styles.button}
          onClick={handleUpload}
        >
          {loading
            ? "⏳ Processing..."
            : "🚀 Upload & Analyze"}
        </button>
      </div>

      {/* Filters */}
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

      <h3>
        Total Documents: {results.length}
      </h3>

      <hr />

      {/* 👤 Patients */}
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

                <p>
                  <b>Status:</b>{" "}

                  <span
                    style={{

                      padding: "4px 10px",

                      borderRadius: "20px",

                      color: "white",

                      fontWeight: "bold",

                      backgroundColor:

                        item.status === "queued"
                          ? "#f59e0b"

                        : item.status === "processing"
                          ? "#3b82f6"

                        : item.status === "completed"
                          ? "#10b981"

                        : "#ef4444",
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

  patientSection: {
    marginBottom: "40px",
  },

  patientTitle: {
    color: "#2563eb",
    marginBottom: "15px",
    borderBottom: "2px solid #2563eb",
    paddingBottom: "5px",
  },

  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "15px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
  },
};

export default App;