# 👨‍🍳 CodeChef Profiler

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=nodedotjs&logoColor=white)

A powerful full-stack web application designed to instantly scrape, process, and enrich CodeChef user profile data. Whether you're looking up a single user or processing thousands of rows in an Excel file, CodeChef Profiler delivers clean, organized data right to your browser.

---

## 🎯 Project Description

CodeChef Profiler is a web application that:
* **Scrapes CodeChef user profiles** for real-time statistics
* **Displays** rating, stars, division, global/country ranks, and top ratings
* **Supports bulk Excel upload** for processing hundreds of users at once
* **Processes and enriches data**, cleaning up inconsistent scraped values
* **Exports updated Excel files** neatly formatted with your findings
* **Provides a preview table UI** with robust sorting and filtering capabilities

---

## 🚀 Features

* **🔍 Fetch Single User Profile:** Search any CodeChef username to instantly view their stats in a beautiful UI.
* **📊 Bulk Excel Processing:** Upload an `.xlsx` file containing a column of usernames, and the backend handles the rest.
* **📥 Excel Export:** Download single-user or bulk processed data back into a clean Excel spreadsheet.
* **📋 Data Preview Table:** Interactively sort, filter, and review the processed data directly in your browser before downloading.
* **⚡ Fast Scraping System:** Optimized backend with automated rate-limiting, error handling, and robust retry logic.

---

## 🛠️ Tech Stack

### Frontend
* **React** + **Vite**
* **Lucide React** (Icons)
* **Axios** (API Requests)

### Backend
* **Node.js** + **Express**
* **Cheerio** (HTML Web Scraping)
* **Multer** (Multipart/Form-Data processing)
* **XLSX** (Excel file generation & parsing)

---

## 🌐 Live Demo

Check out the live deployment of the application:

* **Frontend (Vercel):** [https://codechef-scraper-jet.vercel.app/](https://codechef-scraper-jet.vercel.app/)
* **Backend (Render):** [https://codechef-scraper-api-1gz6.onrender.com](https://codechef-scraper-api-1gz6.onrender.com)

---

## 📦 Installation

To run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone <repo-url>
cd "codechef scraper"
```

### 2. Setup Backend Server
```bash
cd server
npm install
npm start
```
*The backend server will start on `http://localhost:5000`*

### 3. Setup Frontend Client
```bash
cd client
npm install
npm run dev
```
*The Vite development server will start on `http://localhost:5173`*

---

## 📊 Usage

1. Open the frontend URL in your browser.
2. **Single User:** Type a CodeChef username into the search bar and click **Fetch**.
3. **Bulk Processing:** 
    * Scroll to the **Bulk Excel Upload** section.
    * Select an `.xlsx` file containing CodeChef usernames.
    * Choose the specific sheet and column containing the usernames.
    * Click **Upload & Process**.
4. **Preview & Download:** 
    * View the results in the interactive data table.
    * Click **Download Excel** to save the enriched data to your computer.

---

## ⚠️ Notes

* This application relies on **web scraping** as CodeChef does not provide an official public API for these statistics.
* Bulk processing applies a built-in delay (500ms–1000ms per request) between profile scrapes to avoid triggering rate limits on the CodeChef servers. Extremely large files may take several minutes to process.
* If a profile is hidden, invalid, or deleted, the system will gracefully mark the fields as `N/A`.

---

## 👨‍💻 Author

**Dhanush Sai Pavan Battula** 
