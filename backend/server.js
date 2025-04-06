const express = require("express");
const cors = require("cors");
const multer = require("multer");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Firebase Admin SDK Safely
let serviceAccount;
try {
  serviceAccount = require("./firebaseConfig.json");
} catch (error) {
  console.error(" Missing firebaseConfig.json. Ensure it exists.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "mess-feedback-d5e23.firebasestorage.app", 
});

const bucket = admin.storage().bucket();

// Multer Setup (Temp File Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

// MySQL Connection Pool

const mysql = require("mysql2");

const db = mysql.createPool({
  connectionLimit: 10,
  host: "br2tgy3uljk3uvddqxzg-mysql.services.clever-cloud.com", // Use the resolved IP instead of hostname
  user: "ukd2kpv7daakfzgk",
  password: "x9FUImnXbBNq6HTJnn9X",
  database: "br2tgy3uljk3uvddqxzg",
  port: 3306,
  ssl: {
    rejectUnauthorized: false,  // Ignore SSL errors
  }
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to Clever Cloud MySQL database");
  connection.release();
});



//  Ensure 'reports' folder exists
const reportsDir = "./reports";
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

//  API: Submit Feedback with Firebase Storage
app.post("/submit-feedback", upload.single("proof"), async (req, res) => {
  try {
    const { regNo, name, blockRoom, messName, messType, category, suggestions, comments } = req.body;
    let proofUrl = null;

    if (req.file) {
      const fileName = `proofs/${Date.now()}_${req.file.originalname}`;
      const fileRef = bucket.file(fileName);

      await fileRef.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      await fileRef.makePublic();
      proofUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const query = `INSERT INTO feedbacks (regNo, name, blockRoom, messName, messType, category, suggestions, comments, proof) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [regNo, name, blockRoom, messName, messType, category, suggestions, comments, proofUrl], (err) => {
      if (err) {
        console.error(" Database Error:", err);
        return res.status(500).json({ message: "Error submitting feedback" });
      }
      res.status(200).json({ message: " Feedback submitted successfully", proofUrl });
    });
  } catch (error) {
    console.error(" Server Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//  API: Fetch All Feedbacks
app.get("/feedbacks", (req, res) => {
  db.query("SELECT * FROM feedbacks", (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching feedbacks" });
    res.status(200).json(result);
  });
});

//  API: Generate Excel Report with Proof URLs
app.get("/generate-excel-report", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mess Feedback Report");

    worksheet.columns = [
      { header: "Reg No", key: "regNo", width: 15 },
      { header: "Name", key: "name", width: 20 },
      { header: "Block & Room", key: "blockRoom", width: 20 },
      { header: "Mess Name", key: "messName", width: 20 },
      { header: "Mess Type", key: "messType", width: 15 },
      { header: "Category", key: "category", width: 15 },
      { header: "Suggestions", key: "suggestions", width: 30 },
      { header: "Comments", key: "comments", width: 30 },
      { header: "Proof URL", key: "proof", width: 50 },
    ];

    db.query("SELECT * FROM feedbacks", async (err, feedbacks) => {
      if (err) return res.status(500).json({ message: "Error fetching data" });

      feedbacks.forEach((feedback) => worksheet.addRow(feedback));

      const filePath = `${reportsDir}/mess_feedback_report.xlsx`;
      await workbook.xlsx.writeFile(filePath);

      res.download(filePath, "mess_feedback_report.xlsx", () => {
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error(" Excel Report Error:", error);
    res.status(500).json({ message: "Error generating Excel report" });
  }
});

//  API: Generate PDF Report with Proof URLs
app.get("/generate-pdf-report", (req, res) => {
  try {
    const filePath = `${reportsDir}/mess_feedback_report.pdf`;
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text("Mess Feedback Report", { align: "center" }).moveDown();

    db.query("SELECT * FROM feedbacks", (err, feedbacks) => {
      if (err) {
        doc.fontSize(14).text("Error fetching data", { align: "center" });
        doc.end();
        return res.status(500).json({ message: "Error fetching data" });
      }

      if (feedbacks.length === 0) {
        doc.fontSize(14).text("No feedbacks found.", { align: "center" });
      } else {
        feedbacks.forEach((feedback, index) => {
          doc.fontSize(12).text(`${index + 1}. ${feedback.name} - ${feedback.messName}`);
          doc.fontSize(10).text(`Reg No: ${feedback.regNo}`);
          doc.fontSize(10).text(`Block & Room: ${feedback.blockRoom}`);
          doc.fontSize(10).text(`Category: ${feedback.category}`);
          doc.fontSize(10).text(`Suggestions: ${feedback.suggestions}`);
          doc.fontSize(10).text(`Comments: ${feedback.comments}`);
          if (feedback.proof) {
            doc.fontSize(10).fillColor("blue").text(`Proof: ${feedback.proof}`, { link: feedback.proof, underline: true });
            doc.fillColor("black");
          }
          doc.moveDown();
        });
      }

      doc.end();
      stream.on("finish", () => {
        res.download(filePath, "mess_feedback_report.pdf", () => {
          fs.unlinkSync(filePath);
        });
      });
    });
  } catch (error) {
    console.error(" PDF Report Error:", error);
    res.status(500).json({ message: "Error generating PDF report" });
  }
});

//  Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
