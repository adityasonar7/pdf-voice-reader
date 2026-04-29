const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const fs = require("fs");

// ✅ DEFINE APP FIRST
const app = express();

app.use(cors());

// multer setup
const upload = multer({ dest: "uploads/" });

// route
app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        console.log("FILE:", req.file);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);

        fs.unlinkSync(req.file.path);

        res.json({ text: data.text });

    } catch (error) {
        console.error("ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});