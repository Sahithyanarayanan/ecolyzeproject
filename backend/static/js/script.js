// ================= GLOBAL =================
let resultChartInstance = null;
let analyticsChartInstance = null;
let currentPage = 1;
const rowsPerPage = 5;

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {

  // ===== FILE INPUT =====
  const fileInput = document.querySelector('input[name="dna_file"]');
  if (fileInput) {
    fileInput.addEventListener("change", () => showFileName(fileInput));
  }

  // ===== FORM (PREDICT AJAX) =====
  const form = document.getElementById("predictForm");
  if (form) setupPrediction(form);

  // ===== TABLE FILTER EVENTS =====
  const searchInput = document.getElementById("searchInput");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");

  if (searchInput) searchInput.addEventListener("input", filterTable);
  if (fromDate) fromDate.addEventListener("change", filterTable);
  if (toDate) toDate.addEventListener("change", filterTable);

  // ===== PAGINATION BUTTONS =====
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => showPage(currentPage - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => showPage(currentPage + 1));
  }

  // ===== INIT TABLE =====
  const rows = document.querySelectorAll("#predictionTable tbody tr");
  if (rows.length) {
    rows.forEach(row => {
      if (row.id !== "noResultsRow") {
        row.dataset.visible = "true";
      }
    });

    const savedPage = localStorage.getItem("currentPage");
    showPage(savedPage ? parseInt(savedPage) : 1);
  }

  // ===== MODAL CLEANUP =====
  const modalEl = document.getElementById("analysisModal");
  if (modalEl) {
    modalEl.addEventListener("hidden.bs.modal", () => {
      if (resultChartInstance) {
        resultChartInstance.destroy();
        resultChartInstance = null;
      }
    });
  }

});


// ================= FILE NAME =================
function showFileName(input) {
  const fileNameText = document.getElementById("fileName");
  if (fileNameText) {
    fileNameText.innerText =
      input.files.length ? input.files[0].name : "No file selected";
  }
}


// ================= SIDEBAR =================
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("main");

  if (sidebar) sidebar.classList.toggle("collapsed");
  if (main) main.classList.toggle("full");
}


// ================= ANALYTICS CHART =================
function initAnalyticsChart(type) {
  const chartInput = document.getElementById("chartData");
  const ctx = document.getElementById("analyticsChart");

  if (!chartInput || !chartInput.value || !ctx) return;

  const fullData = JSON.parse(chartInput.value);
  const data = fullData[type] || {};

  const labels = Object.keys(data).map(key => {

  // ✅ DAILY (YYYY-MM-DD)
  if (key.includes("-") && !key.includes("W")) {
    const d = new Date(key);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  // ✅ WEEKLY (YYYY-Wxx)
  if (key.includes("W")) {
    const [year, week] = key.split("-W");
    return `Week ${week} (${year})`;
  }

  return key;
});
  const values = Object.values(data);

  if (analyticsChartInstance) analyticsChartInstance.destroy();

  analyticsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [{
        label: type === "daily" ? "Daily Uploads" : "Weekly Uploads",
        data: values.length ? values : [0],
        backgroundColor: "rgba(26,86,219,0.75)",
        borderRadius: 8
      }]
    }
  });
}

function switchChart(type) {
  const btnDaily = document.getElementById("btnDaily");
  const btnWeekly = document.getElementById("btnWeekly");

  if (btnDaily) btnDaily.classList.toggle("active", type === "daily");
  if (btnWeekly) btnWeekly.classList.toggle("active", type === "weekly");

  initAnalyticsChart(type);
}


// ================= PREDICTION =================
// function setupPrediction(form) {
//   form.addEventListener("submit", async function (e) {
//     e.preventDefault();

//     const fileInput = form.querySelector('input[name="dna_file"]');
//     if (!fileInput || !fileInput.files.length) {
//       alert("Please select file");
//       return;
//     }

//     const modalEl = document.getElementById("analysisModal");
//     const modal = new bootstrap.Modal(modalEl);
//     modal.show();

//     const loader = document.getElementById("modalLoader");
//     const resultDiv = document.getElementById("modalResult");

//     if (loader) loader.style.display = "block";
//     if (resultDiv) resultDiv.style.display = "none";

//     const progressBar = document.getElementById("progressBar");
//     const step1 = document.getElementById("step1");
//     const step2 = document.getElementById("step2");
//     const step3 = document.getElementById("step3");

//     // RESET STEPS
//     [step1, step2, step3].forEach(s => {
//       if (s) {
//         s.classList.remove("active", "done");
//         s.classList.add("text-muted");
//       }
//     });

//     if (progressBar) progressBar.style.width = "0%";

//     // STEP 1
//     step1?.classList.add("active");
//     await delay(800);
//     if (progressBar) progressBar.style.width = "30%";
//     step1?.classList.replace("active", "done");

//     // STEP 2
//     step2?.classList.remove("text-muted");
//     step2?.classList.add("active");
//     await delay(1000);
//     if (progressBar) progressBar.style.width = "60%";
//     step2?.classList.replace("active", "done");

//     // STEP 3
//     step3?.classList.remove("text-muted");
//     step3?.classList.add("active");
//     await delay(1200);
//     if (progressBar) progressBar.style.width = "85%";

//     try {
//       const res = await fetch("/predict", {
//         method: "POST",
//         body: new FormData(form),
//         headers: { "X-Requested-With": "XMLHttpRequest" }
//       });

//       if (!res.ok) throw new Error("Server error");

//       const data = await res.json();

//       if (progressBar) progressBar.style.width = "100%";
//       step3?.classList.replace("active", "done");

//       await delay(400);

//       if (loader) loader.style.display = "none";
//       if (resultDiv) resultDiv.style.display = "block";

//       const resultText = document.getElementById("resultText");
//       if (resultText) {
//         resultText.innerHTML =
//           data.label === "Disease"
//             ? `<span class="text-danger">${data.result}</span>`
//             : `<span class="text-success">${data.result}</span>`;
//       }

//       // CHART
//       if (resultChartInstance) resultChartInstance.destroy();

//       const ctx = document.getElementById("modalResultChart");
//       if (ctx) {
//         resultChartInstance = new Chart(ctx, {
//           type: "doughnut",
//           data: {
//             labels: ["Disease", "Normal"],
//             datasets: [{
//               data: data.label === "Disease" ? [80, 20] : [20, 80],
//               backgroundColor: ["#fa8526", "#2abfbd"]
//             }]
//           },
//           options: {
//             responsive: true,
//             maintainAspectRatio: false
//           }
//         });
//       }

//     } catch (err) {
//       alert("Prediction failed");
//       console.error(err);
//     }
//   });
// }
function setupPrediction(form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fileInput = form.querySelector('input[name="dna_file"]');
    if (!fileInput || !fileInput.files.length) {
      alert("Please select file");
      return;
    }

    const modalEl = document.getElementById("analysisModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const loader = document.getElementById("modalLoader");
    const resultDiv = document.getElementById("modalResult");

    if (loader) loader.style.display = "block";
    if (resultDiv) resultDiv.style.display = "none";

    const progressBar = document.getElementById("progressBar");
    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");
    const step3 = document.getElementById("step3");

    // RESET
    [step1, step2, step3].forEach(s => {
      if (s) {
        s.classList.remove("active", "done");
        s.classList.add("text-muted");
      }
    });

    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.style.transition = "width 0.6s ease"; // smooth animation
    }

    // ===== STEP FLOW =====

    // STEP 1
   // STEP 1
step1?.classList.add("active");
await delay(800);

if (progressBar) progressBar.style.width = "25%";

if (step1) {
  step1.classList.remove("active");
  step1.classList.add("done");
  step1.innerHTML = `<i class="fa fa-check text-success me-2"></i>Reading DNA`;
}

    // STEP 2
    // STEP 2
step2?.classList.remove("text-muted");
step2?.classList.add("active");

await delay(1000);

if (progressBar) progressBar.style.width = "50%";

if (step2) {
  step2.classList.remove("active");
  step2.classList.add("done");
  step2.innerHTML = `<i class="fa fa-check text-success me-2"></i>Extracting features`;
}

    // STEP 3
  // STEP 3
step3?.classList.remove("text-muted");
step3?.classList.add("active");

await delay(1200);

if (progressBar) progressBar.style.width = "75%";

    try {
      const res = await fetch("/predict", {
        method: "POST",
        body: new FormData(form),
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      // FINAL COMPLETE
      if (progressBar) progressBar.style.width = "100%";
      if (step3) {
  step3.classList.remove("active");
  step3.classList.add("done");
  step3.innerHTML = `<i class="fa fa-check text-success me-2"></i>Running model`;
}

      await delay(400);

      if (loader) loader.style.display = "none";
      if (resultDiv) resultDiv.style.display = "block";

      const resultText = document.getElementById("resultText");
      if (resultText) {
        resultText.innerHTML =
          data.label === "Disease"
            ? `<span class="text-danger">${data.result.replace(/&/g, "").trim()}</span>`
            : `<span class="text-success">${data.result.replace(/&/g, "").trim()}</span>`;
      }
      // ================= SAME DESCRIPTION LOGIC =================
let description = "";

if (data.label.toLowerCase().includes("disease")) {
  description = `
The analyzed gene sequence shows patterns associated with disease-related conditions.
Advanced AI-based trimer frequency analysis indicates a higher probability of abnormal genetic behavior.
Further clinical validation is recommended.`;
} else {
  description = `
The analyzed gene sequence appears to be within normal biological parameters.
AI-based trimer frequency analysis did not detect any significant abnormalities.
No immediate concerns are indicated from this analysis.`;
}

// ================= UPDATE HTML SUMMARY =================
const summaryList = document.getElementById("analysisSummary");

if (summaryList) {
  summaryList.innerHTML = `
    <li>Prediction is generated using a trained AI model.</li>
    <li>${data.result.replace(/&/g, "").trim()}</li>
    <li>${description}</li>
  `;
}
      // CHART
      if (resultChartInstance) resultChartInstance.destroy();

      const ctx = document.getElementById("modalResultChart");
      if (ctx) {
        resultChartInstance = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Disease", "Normal"],
            datasets: [{
              data: data.label === "Disease" ? [100, 0] : [0, 100],
              backgroundColor: ["#fa8526", "#2abfbd"]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }

    } catch (err) {
      alert("Prediction failed");
      console.error(err);
    }
  });
}

// ================= TABLE FILTER =================
function filterTable() {
  const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const from = document.getElementById("fromDate")?.value;
  const to = document.getElementById("toDate")?.value;

  const rows = document.querySelectorAll("#predictionTable tbody tr");
  const noRow = document.getElementById("noResultsRow");

  let visible = 0;

  rows.forEach(row => {
    if (row.id === "noResultsRow") return;

    const text = row.innerText.toLowerCase();
    const date = row.querySelector("td[data-date]")?.dataset.date || "";

    let show = true;

    if (search && !text.includes(search)) show = false;
    if (from && date < from) show = false;
    if (to && date > to) show = false;

    row.dataset.visible = show ? "true" : "false";
    if (show) visible++;
  });

  if (noRow) noRow.style.display = visible ? "none" : "";

  showPage(1);
}


// ================= PAGINATION =================
function getFilteredRows() {
  return Array.from(document.querySelectorAll("#predictionTable tbody tr"))
    .filter(row =>
      row.id !== "noResultsRow" &&
      row.dataset.visible !== "false"
    );
}

function showPage(page) {
  const allRows = document.querySelectorAll("#predictionTable tbody tr");
  const filteredRows = getFilteredRows();

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  currentPage = page;
  localStorage.setItem("currentPage", currentPage);

  allRows.forEach(row => {
    if (row.id !== "noResultsRow") row.style.display = "none";
  });

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  filteredRows.slice(start, end).forEach(row => {
    row.style.display = "";
  });

  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
  }

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}


// ================= RESET FILTER =================
function resetFilters() {
  const search = document.getElementById("searchInput");
  const from = document.getElementById("fromDate");
  const to = document.getElementById("toDate");

  if (search) search.value = "";
  if (from) from.value = "";
  if (to) to.value = "";

  filterTable();
}


// ================= DELETE =================
function openDeleteModal(id) {
  const form = document.getElementById("deleteForm");
  if (form) form.action = "/delete/" + id;

  const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
  modal.show();
}


// ================= EDIT PREDICTION =================
function openEditPrediction(btn) {
  const id = btn.getAttribute("data-pred-id");
  const gene = btn.getAttribute("data-gene");

  document.getElementById("editGeneName").value = gene;
  document.getElementById("editPredForm").action = "/edit_prediction/" + id;

  new bootstrap.Modal(document.getElementById("editPredModal")).show();
}


// ================= EDIT USER =================
function openEditUser(btn) {
  const id = btn.getAttribute("data-user-id");
  const name = btn.getAttribute("data-name");
  const email = btn.getAttribute("data-email");

  document.getElementById("editUserName").value = name;
  document.getElementById("editUserEmail").value = email;

  document.getElementById("editUserForm").action = "/edit_user/" + id;

  new bootstrap.Modal(document.getElementById("editUserModal")).show();
}


// ================= DOWNLOAD REPORT =================
// function downloadReport() {
//   const resultEl = document.getElementById("resultText");
//   const resultText = resultEl ? resultEl.innerText : "No result";

//   const geneInput = document.querySelector('input[name="gene"]');
//   const geneName = geneInput ? geneInput.value : "Unknown Gene";

//   const date = new Date().toLocaleString();

//   const content = `
// Ecolyze DNA Analysis Report
// ----------------------------

// Gene Name : ${geneName}
// Result    : ${resultText}
// Date      : ${date}

// ----------------------------
// Generated by Ecolyze System
// `;

//   const blob = new Blob([content], { type: "text/plain" });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "DNA_Report.txt";
//   document.body.appendChild(a);
//   a.click();

//   document.body.removeChild(a);
// }
// function downloadReport() {

//   const resultText = document.getElementById("resultText").innerText;

//   const geneInput = document.querySelector('input[name="gene"]');
//   const geneName = geneInput ? geneInput.value : "Unknown Gene";

//   // 🔥 GET USERNAME
//   const userNameInput = document.getElementById("loggedUserName");
//   const userName = userNameInput ? userNameInput.value : "Unknown User";

//   const date = new Date().toLocaleString();

//   const content = `
// Ecolyze DNA Analysis Report
// ----------------------------

// User      : ${userName}
// Gene Name : ${geneName}
// Result    : ${resultText}
// Date      : ${date}

// ----------------------------
// Generated by Ecolyze System
// `;

//   const blob = new Blob([content], { type: "text/plain" });
//   const url = window.URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "DNA_Report.txt";
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
// }
// 2function downloadReport() {

//   const resultText = document.getElementById("resultText").innerText;

//   const geneInput = document.querySelector('input[name="gene"]');
//   const geneName = geneInput ? geneInput.value : "Unknown Gene";

//   const userNameInput = document.getElementById("loggedUserName");
//   const userName = userNameInput ? userNameInput.value : "Unknown User";

//   const date = new Date().toLocaleString();

//   // ================= DYNAMIC DESCRIPTION =================
//   let description = "";

//   if (resultText.toLowerCase().includes("disease")) {
//     description = `The analyzed gene sequence shows patterns associated with disease-related conditions. 
// Advanced AI-based trimer frequency analysis indicates a higher probability of abnormal genetic behavior. 
// Further clinical validation is recommended.`;
//   } else {
//     description = `The analyzed gene sequence appears to be within normal biological parameters. 
// AI-based trimer frequency analysis did not detect any significant abnormalities. 
// No immediate concerns are indicated from this analysis.`;
//   }

//   // ================= GET CHART =================
//   const chartCanvas = document.getElementById("modalResultChart");

//   html2canvas(chartCanvas).then(canvas => {
//     const chartImage = canvas.toDataURL("image/png");

//     const { jsPDF } = window.jspdf;
//     const pdf = new jsPDF();

//     // ================= HEADER =================
//     pdf.setFontSize(20);
//     pdf.setFont("helvetica", "bold");
//     pdf.text("ECOLYZE LABS", 105, 20, null, null, "center");

//     pdf.setFontSize(12);
//     pdf.setFont("helvetica", "normal");
//     pdf.text("AI-Based Genetic Analysis Report", 105, 28, null, null, "center");

//     pdf.setLineWidth(0.5);
//     pdf.line(20, 32, 190, 32); // horizontal line

//     // ================= PATIENT INFO =================
//     pdf.setFontSize(14);
//     pdf.setFont("helvetica", "bold");
//     pdf.text("Patient Details", 20, 45);

//     pdf.setFontSize(11);
//     pdf.setFont("helvetica", "normal");
//     pdf.text(`Name        : ${userName}`, 20, 55);
//     pdf.text(`Gene Tested : ${geneName}`, 20, 63);
//     pdf.text(`Report Date : ${date}`, 20, 71);

//     // ================= RESULT SECTION =================
//     pdf.setFontSize(14);
//     pdf.setFont("helvetica", "bold");
//     pdf.text("Test Result", 20, 90);

//     pdf.setFontSize(12);

//     // Result Highlight
//     if (resultText.toLowerCase().includes("disease")) {
//       pdf.setTextColor(200, 0, 0); // red
//     } else {
//       pdf.setTextColor(0, 128, 0); // green
//     }

//     pdf.text(resultText, 20, 100);
//     pdf.setTextColor(0, 0, 0); // reset

//     // ================= DESCRIPTION =================
//     pdf.setFontSize(14);
//     pdf.setFont("helvetica", "bold");
//     pdf.text("Clinical Interpretation", 20, 120);

//     pdf.setFontSize(11);
//     pdf.setFont("helvetica", "normal");

//     const splitDesc = pdf.splitTextToSize(description, 170);
//     pdf.text(splitDesc, 20, 130);

//     // ================= CHART =================
//     pdf.setFontSize(14);
//     pdf.setFont("helvetica", "bold");
//     pdf.text("Analysis Visualization", 20, 170);

//     pdf.addImage(chartImage, "PNG", 35, 175, 140, 70);

//     // ================= FOOTER =================
//     pdf.setLineWidth(0.5);
//     pdf.line(20, 260, 190, 260);

//     pdf.setFontSize(10);
//     pdf.setFont("helvetica", "italic");
//     pdf.text(
//       "This report is generated using AI-based analysis and should be used for informational purposes only.",
//       20,
//       268
//     );

//     pdf.text("Authorized by Ecolyze AI System", 20, 275);

//     // ================= DOWNLOAD =================
//     pdf.save("Ecolyze_DNA_Report.pdf");
//   });
// }
function downloadReport() {

  // ================= CLEAN TEXT =================
  function cleanText(text) {
    const temp = document.createElement("div");
    temp.innerHTML = text;
    return temp.innerText.replace(/[&;]/g, ""); // remove unwanted chars
  }

  const resultTextRaw = document.getElementById("resultText").innerText;
  const resultText = cleanText(resultTextRaw);

  const geneInput = document.querySelector('input[name="gene"]');
  const geneName = geneInput ? geneInput.value : "Unknown Gene";

  const userNameInput = document.getElementById("loggedUserName");
  const userName = userNameInput ? userNameInput.value : "Unknown User";

  const date = new Date().toLocaleString();

  // ================= DYNAMIC DESCRIPTION =================
  let description = "";

  if (resultText.toLowerCase().includes("disease")) {
    description = `The analyzed gene sequence shows patterns associated with disease-related conditions. 
Advanced AI-based trimer frequency analysis indicates a higher probability of abnormal genetic behavior. 
Further clinical validation is recommended.`;
  } else {
    description = `The analyzed gene sequence appears to be within normal biological parameters. 
AI-based trimer frequency analysis did not detect any significant abnormalities. 
No immediate concerns are indicated from this analysis.`;
  }

  // ================= GET CHART =================
  const chartCanvas = document.getElementById("modalResultChart");

  html2canvas(chartCanvas).then(canvas => {
    const chartImage = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const logo = new Image();
    logo.src = "/static/img/health/Ecolyzelogodesign-removebg.png"; // your logo path

    let y = 20; // dynamic Y position
    // Wait for logo to load
logo.onload = function () {

  // Watermark (light transparent)
  pdf.setGState(new pdf.GState({ opacity: 0.08 }));

  pdf.addImage(
    logo,
    "PNG",
    40,   // X
    80,   // Y
    130,  // Width
    130   // Height
  );

  // Reset opacity
  pdf.setGState(new pdf.GState({ opacity: 1 }));

  // ================= CONTINUE YOUR EXISTING CODE =================
    // ================= HEADER =================
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(23, 92, 221);
    pdf.text("ECOLYZE LABS", 105, y, null, null, "center");

    y += 8;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text("AI-Based Genetic Analysis Report", 105, y, null, null, "center");

    y += 5;

    pdf.setDrawColor(23, 92, 221);
    pdf.line(20, y, 190, y);

    y += 12;

    // ================= PATIENT INFO =================
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(23, 92, 221);
    pdf.text("Patient Details", 20, y);

    y += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Name        : ${userName}`, 20, y);

    y += 8;
    pdf.text(`Gene Tested : ${geneName}`, 20, y);

    y += 8;
    pdf.text(`Report Date : ${date}`, 20, y);

    y += 15;

    // ================= RESULT =================
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(23, 92, 221);
    pdf.text("Test Result", 20, y);

    y += 10;

    pdf.setFontSize(12);

    if (resultText.toLowerCase().includes("disease")) {
      pdf.setTextColor(200, 0, 0);
    } else {
      pdf.setTextColor(0, 128, 0);
    }

    const splitResult = pdf.splitTextToSize(resultText, 170);
    pdf.text(splitResult, 20, y);

    y += splitResult.length * 6 + 10;
    pdf.setTextColor(0, 0, 0);

    // ================= DESCRIPTION =================
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(23, 92, 221);
    pdf.text("Clinical Interpretation", 20, y);

    y += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    const splitDesc = pdf.splitTextToSize(description, 170);
    pdf.text(splitDesc, 20, y);

    y += splitDesc.length * 6 + 10;

    // ================= CHART =================
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 92, 221);
    pdf.text("Analysis Visualization", 20, y);

    y += 10;

    pdf.addImage(chartImage, "PNG", 30, y, 70, 70);

    y += 80;

    // ================= FOOTER =================
    pdf.setDrawColor(23, 92, 221);
    pdf.line(20, y, 190, y);

    y += 8;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(0, 0, 0);

    pdf.text(
      "This report is generated using AI-based analysis and should be used for informational purposes only.",
      20,
      y
    );

    y += 7;
    pdf.text("Authorized by Ecolyze AI System", 20, y);

    // ================= DOWNLOAD =================
    // pdf.save("Ecolyze_DNA_Report.pdf");
    const now = new Date();
const formatted = now.toLocaleDateString().replace(/\//g, "-") + "_" + now.getTime();

pdf.save(`Ecolyze_Report_${formatted}.pdf`);
  };
  });
}


// ================= HELPER =================
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function openEditUserFromTopbar(id, name, email) {

  // set values
  document.getElementById("editUserName").value = name;
  document.getElementById("editUserEmail").value = email;

  // set form action
  document.getElementById("editUserForm").action = "/edit_user/" + id;

  // open modal
  const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
  modal.show();
}
document.addEventListener("DOMContentLoaded", function () {

  console.log("Chart script running...");

  // ===== GET VALUES =====
  const trendInput = document.getElementById("trendData");
  const diseaseInput = document.getElementById("diseaseCount");
  const normalInput = document.getElementById("normalCount");

  if (!trendInput) {
    console.error("trendData not found");
    return;
  }

  const trend = JSON.parse(trendInput.value || "{}");

  console.log("Trend Data:", trend);

  const disease = parseInt(diseaseInput?.value || 0);
  const normal = parseInt(normalInput?.value || 0);

  // ===== PIE CHART =====
  const pieCanvas = document.getElementById("resultChart");

  if (pieCanvas) {
    new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: ["Disease", "Normal"],
        datasets: [{
          data: [disease, normal],
          backgroundColor: ["#fa8526", "#2abfbd"]
        }]
      }
    });
  } else {
    console.warn("resultChart canvas not found");
  }

  // ===== TREND CHART =====
  const trendCanvas = document.getElementById("trendChart");

  if (trendCanvas) {

    const labels = Object.keys(trend).map(d => {
      const date = new Date(d);
      return date.toLocaleDateString("en-GB");
    });

    const values = Object.values(trend);

    console.log("Labels:", labels);
    console.log("Values:", values);

    new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["No Data"],
        datasets: [{
          label: "Uploads",
          data: values.length ? values : [0],
          fill: true,
          tension: 0.4
        }]
      }
    });

  } else {
    console.error("trendChart canvas not found");
  }

});
// Create DNA animation inside loader
const container = document.getElementById("dnaContainer");

if (container) {
  for (let i = 0; i < 15; i++) {
    let parentEl = document.createElement("div");
    parentEl.classList.add("strand");

    parentEl.innerHTML = `
      <div class="top" style="animation-delay:${i * -0.2}s"></div>
      <div class="bottom" style="animation-delay:${-1.5 - (i * 0.2)}s"></div>
    `;

    container.appendChild(parentEl);
  }
}
// Hide loader after page load
window.addEventListener("load", function () {
  setTimeout(() => {
    document.getElementById("pageLoader").style.display = "none";
  }, 2000); // 2 seconds delay
});

// Show loader on page navigation
document.addEventListener("click", function (e) {
  const link = e.target.closest("a");

  if (!link) return;

  const href = link.getAttribute("href");

  if (!href || href.startsWith("#")) return;

  const loader = document.getElementById("pageLoader");
  if (loader) {
    loader.style.display = "flex";
  }
});