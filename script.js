/**
 * ==========================================================================
 * CONTROLLER SCRIPT UTUH APLIKASI SI-DUDA (FINAL CLEAN TEXT PRODUCTION)
 * DISPORA BOLAANG MONGONDOW UTARA
 * ==========================================================================
 * File: script.js
 */

// Inisialisasi Koleksi Global Buffer Data
var DB_OKP = [];
var DB_PEMUDA = [];
var DB_REGISTRASI = { 
  kreativesia: [], 
  wirausaha: [], 
  pramuka: [], 
  jambore: [] 
};
var DB_SURVEI = [];
var DB_PANDUAN_ADMINISTRASI = [];
var DB_JUKNIS_KEGIATAN = [];
var DB_KEGIATAN = []; // Sinkronisasi: Penampung rumpun data kegiatan dinas dari server
var DB_BERITA = [];   // Sinkronisasi: Penampung data rilis berita portal terpadu

// Parameter Pengaturan Akses Registrasi Kegiatan (Akan ditimpa otomatis oleh data server Sheets)
var REG_STATUS = { 
  kreativesia: true, 
  wirausaha: true, 
  pramuka: true, 
  jambore: true 
};

var GRADIENT_POOL = [
  "grad-red", 
  "grad-blue", 
  "grad-yellow", 
  "grad-green", 
  "grad-purple", 
  "grad-orange", 
  "grad-pink", 
  "grad-cyan"
];

var METRIKS_SURVEI = [
  { category: "A. KEMUDAHAN PENGGUNAAN (USABILITY)", code: "r1", label: "Menu dan navigasi pada website ini mudah dipahami." },
  { category: "A. KEMUDAHAN PENGGUNAAN (USABILITY)", code: "r2", label: "Struktur informasi runtut sehingga saya tidak bingung saat mencari data." },
  { category: "A. KEMUDAHAN PENGGUNAAN (USABILITY)", code: "r3", label: "Website ini mudah diakses melalui perangkat apa saja (HP/Laptop)." },
  { category: "B. TAMPILAN & DESAIN (USER INTERFACE)", code: "r4", label: "Kombinasi warna, font, dan tata letak website nyaman dilihat." },
  { category: "B. TAMPILAN & DESAIN (USER INTERFACE)", code: "r5", label: "Penempatan tombol dan gambar proporsional (tidak mengganggu)." },
  { category: "B. TAMPILAN & DESAIN (USER INTERFACE)", code: "r6", label: "Desain website terlihat modern, bersih, dan profesional." },
  { category: "C. KUALITAS KONTEN & INFORMASI (CONTENT QUALITY)", code: "r7", label: "Informasi/berita yang disajikan di website selalu diperbarui (up-to-date)." },
  { category: "C. KUALITAS KONTEN & INFORMASI (CONTENT QUALITY)", code: "r8", label: "Bahasa yang digunakan dalam artikel/pengumuman mudah dipahami." },
  { category: "C. KUALITAS KONTEN & INFORMASI (CONTENT QUALITY)", code: "r9", label: "Data atau berkas unduhan yang disediakan sesuai dengan kebutuhan saya." },
  { category: "D. PERFORMA TEKNIS (PERFORMANCE)", code: "r10", label: "Kecepatan memuat halaman (loading time) website ini sangat cepat." },
  { category: "D. PERFORMA TEKNIS (PERFORMANCE)", code: "r11", label: "Semua tautan (link) dan tombol berfungsi dengan baik (tidak ada error)." },
  { category: "D. PERFORMA TEKNIS (PERFORMANCE)", code: "r12", label: "Fitur pencarian (search bar) berfungsi akurat dalam menemukan informasi." },
  { category: "E. KEPUASAN KESELURUHAN (OVERALL SATISFACTION)", code: "r13", label: "Secara keseluruhan, saya puas dengan layanan yang diberikan website ini." },
  { category: "E. KEPUASAN KESELURUHAN (OVERALL SATISFACTION)", code: "r14", label: "Saya akan merekomendasikan website ini kepada rekan atau orang lain." }
];

// Tautan Utama Endpoint Google Apps Script Server
var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbypdA5KV29lQSwJAsxsnm5nm8Pj97Ylzr_BIiQISPlrMuPLj8nCaBOq5SnMrfb16pqpeg/exec";

var chartKecamatanInstance = null;
var chartHomeOKPInstance = null;
var chartHomePemudaInstance = null;
var chartHomeSurveiInstance = null;

// Fungsi Manajemen Animasi Memuat Data (Loading State UX Overlay)
function showLoading() {
  var loader = document.getElementById("ui-loading-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "ui-loading-loader";
    loader.innerHTML = "<div style='position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #06b6d4;'>" +
        "<div class='spinner-border text-cyan' role='status' style='width: 3.2rem; height: 3.2rem;'></div>" +
        "<span class='mt-3 fw-bold small text-uppercase' style='letter-spacing: 0.12em;'>Sinkronisasi Basis Data Server Sheets...</span>" +
        "</div>";
    document.body.appendChild(loader);
  }
}

function hideLoading() {
  var loader = document.getElementById("ui-loading-loader");
  if (loader) { loader.remove(); }
}

// Pemicu Penyiapan Komponen Saat Halaman Siap
document.addEventListener("DOMContentLoaded", function() {
  console.log("Menginisialisasi modul SI-DUDA Sisi Klien...");
  
  if (window.innerWidth < 992) {
    var sidebar = document.getElementById("sidebarMenu");
    if (sidebar) sidebar.classList.remove("active");
  }

  loadDataFromSheets();
  renderSurveyFormMatrix();

  var searchOKPElem = document.getElementById("searchOKP");
  if (searchOKPElem) { searchOKPElem.addEventListener("input", filterTableOKP); }

  var searchPemudaElem = document.getElementById("searchPemuda");
  if (searchPemudaElem) { searchPemudaElem.addEventListener("input", filterTablePemuda); }

  var searchDokumenElem = document.getElementById("searchDokumen");
  if (searchDokumenElem) { searchDokumenElem.addEventListener("input", filterDokumenCards); }

  var mainFormElem = document.getElementById("mainActivityForm");
  if (mainFormElem) { mainFormElem.addEventListener("submit", submitFormKegiatan); }

  var surveyFormElem = document.getElementById("satisfactionSurveyForm");
  if (surveyFormElem) { surveyFormElem.addEventListener("submit", submitSurveiKepuasan); }

  var loginFormElem = document.getElementById("modalLoginForm");
  if (loginFormElem) { loginFormElem.addEventListener("submit", submitLoginGate); }
});

function loadDataFromSheets() {
  showLoading(); 
  console.log("Melakukan panggilan data ke server: " + SCRIPT_URL);
  fetch(SCRIPT_URL)
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      console.log("Sinkronisasi data sukses diterima dari backend.");
      if (data.okp) { DB_OKP = data.okp; }
      if (data.pemuda) { DB_PEMUDA = data.pemuda; }
      if (data.survei) { DB_SURVEI = data.survei; }
      if (data.registrasi) { DB_REGISTRASI = data.registrasi; }
      
      if (data.kegiatan) { 
        DB_KEGIATAN = data.kegiatan; 
        data.kegiatan.forEach(function(item) {
          REG_STATUS[item.id] = (item.status === "BUKA");
        });
      }
      if (data.berita) { DB_BERITA = data.berita; }
      
      if (data.dokumen) {
        DB_PANDUAN_ADMINISTRASI = data.dokumen.filter(function(d) {
          return d.kategori === 'panduan';
        });
        DB_JUKNIS_KEGIATAN = data.dokumen.filter(function(d) {
          return d.kategori === 'juknis';
        });
      }
      
      renderTableOKP();
      renderTablePemuda();
      renderClientCardsDokumen();
      renderHomeOverviewDashboard();
      updateKegiatanButtons();
      renderClientCardsKegiatan(); 
      renderClientCardsBerita();   
      hideLoading(); 
    })
    .catch(function(error) {
      console.error("Gagal menyinkronkan data dari spreadsheet:", error);
      hideLoading();
    });
}

function filterTableOKP() {
  var value = document.getElementById("searchOKP").value.toLowerCase();
  var rows = document.querySelectorAll("#tableOKP tbody tr");
  rows.forEach(function(tr) {
    if (tr.innerText.toLowerCase().includes(value)) {
      tr.style.display = "";
    } else {
      tr.style.display = "none";
    }
  });
}

function filterTablePemuda() {
  var value = document.getElementById("searchPemuda").value.toLowerCase();
  var rows = document.querySelectorAll("#tablePemuda tbody tr");
  rows.forEach(function(tr) {
    if (tr.innerText.toLowerCase().includes(value)) {
      tr.style.display = "";
    } else {
      tr.style.display = "none";
    }
  });
}

function filterDokumenCards() {
  var value = document.getElementById("searchDokumen").value.toLowerCase();
  var cards = document.querySelectorAll("#container-panduan-cards > div, #container-juknis-cards > div");
  cards.forEach(function(card) {
    if (card.innerText.toLowerCase().includes(value)) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

function toggleSidebar() { 
  document.getElementById("sidebarMenu").classList.toggle("active"); 
}

function showSection(id) {
  var sections = document.querySelectorAll('.content-section');
  sections.forEach(function(s) {
    s.classList.add('d-none');
  });
  
  var targetedSection = document.getElementById("section-" + id);
  if (targetedSection) {
    targetedSection.classList.remove('d-none');
  }
  
  var navLinks = document.querySelectorAll('.sidebar .nav-link');
  navLinks.forEach(function(l) {
    l.classList.remove('active');
  });
  
  var activeNav = document.getElementById("nav-" + id);
  if (activeNav) {
    activeNav.classList.add('active');
  }
  
  if (window.innerWidth < 992) {
    document.getElementById("sidebarMenu").classList.remove("active");
  }
}

// REVISI: Membersihkan teks warna pelangi kaku pada nama OKP menjadi Putih Bersih Formal
function renderTableOKP() {
  var tbody = document.querySelector("#tableOKP tbody");
  if (!tbody) { return; }
  
  var htmlRows = DB_OKP.map(function(i) {
    var badgeStyle = "bg-warning";
    if (i.sk === 'Aktif') { badgeStyle = "bg-success"; }
    return "<tr>" +
        "<td>" + i.no + "</td>" +
        "<td class='fw-bold text-white'>" + i.nama + "</td>" + // FIX: Menggunakan warna putih formal modifikasi dashboard
        "<td>" + i.tingkat + "</td>" +
        "<td>" + i.ketua + "</td>" +
        "<td>" + i.alamat + "</td>" +
        "<td><span class='badge " + badgeStyle + "'>" + i.sk + "</span></td>" +
        "</tr>";
  });
  tbody.innerHTML = htmlRows.join('');
  
  var oAktif = DB_OKP.filter(function(x) { return x.sk === "Aktif"; }).length;
  var oValid = DB_OKP.filter(function(x) { return x.sk !== "Aktif"; }).length;
  
  document.getElementById("card-okp-total").innerText = DB_OKP.length;
  document.getElementById("card-okp-aktif").innerText = oAktif;
  document.getElementById("card-okp-validasi").innerText = oValid;
}

function renderTablePemuda() {
  var tbody = document.querySelector("#tablePemuda tbody");
  if (!tbody) { return; }
  
  var htmlRows = DB_PEMUDA.map(function(i) {
    var style = STYLING_KECAMATAN[i.kec] || { border: "none", bg: "transparent" };
    return "<tr style='border-left: " + style.border + "; background-color: " + style.bg + " !important;'>".replace(" !important", "") +
        "<td>" + i.no + "</td>" +
        "<td class='fw-bold text-white-90'>" + i.kec + "</td>" +
        "<td>" + i.desa + "</td>" +
        "<td>" + i.l.toLocaleString('id-ID') + "</td>" +
        "<td>" + i.p.toLocaleString('id-ID') + "</td>" +
        "<td class='text-cyan fw-bold'>" + i.total.toLocaleString('id-ID') + "</td>" +
        "</tr>";
  });
  tbody.innerHTML = htmlRows.join('');
  
  var totalKabupaten = DB_PEMUDA.reduce(function(acc, curr) { return acc + (Number(curr.total) || 0); }, 0);
  var totalLakiLaki = DB_PEMUDA.reduce(function(acc, curr) { return acc + (Number(curr.l) || 0); }, 0);
  var totalPerempuan = DB_PEMUDA.reduce(function(acc, curr) { return acc + (Number(curr.p) || 0); }, 0);
  
  document.getElementById("card-pemuda-total").innerText = totalKabupaten.toLocaleString('id-ID') + " Jiwa";
  document.getElementById("card-pemuda-l").innerText = totalLakiLaki.toLocaleString('id-ID') + " Jiwa";
  document.getElementById("card-pemuda-p").innerText = totalPerempuan.toLocaleString('id-ID') + " Jiwa";
  
  var rekapKecamatan = { "Kaidipang": 0, "Pinogaluman": 0, "Bolangitang Timur": 0, "Bolangitang Barat": 0, "Bintauna": 0, "Sangkub": 0 };
  DB_PEMUDA.forEach(function(curr) {
    if (rekapKecamatan.hasOwnProperty(curr.kec)) {
      rekapKecamatan[curr.kec] += (Number(curr.total) || 0);
    }
  });

  var ctx = document.getElementById('chartKecamatanBody');
  if (ctx) {
    if (chartKecamatanInstance) { chartKecamatanInstance.destroy(); }
    chartKecamatanInstance = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: Object.keys(rekapKecamatan),
        datasets: [{
          label: 'Populasi Pemuda ',
          data: Object.values(rekapKecamatan),
          backgroundColor: ['#22d3ee', '#c084fc', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { weight: '600' } } },
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }
}

function renderHomeOverviewDashboard() {
  var ctxOKP = document.getElementById('chartHomeOKP');
  if (ctxOKP) {
    var totalOKP = DB_OKP.length;
    var oAktif = DB_OKP.filter(function(x) { return x.sk === "Aktif"; }).length;
    var oValid = DB_OKP.filter(function(x) { return x.sk !== "Aktif"; }).length;

    if (chartHomeOKPInstance) { chartHomeOKPInstance.destroy(); }
    chartHomeOKPInstance = new Chart(ctxOKP.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Terdaftar', 'Aktif', 'Validasi'],
        datasets: [{ data: [totalOKP, oAktif, oValid], backgroundColor: ['#ff4b2b', '#0072ff', '#fbbf24'], borderRadius: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { weight: '600' } } },
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', stepSize: 5 } }
        }
      }
    });
  }

  var ctxPemuda = document.getElementById('chartHomePemuda');
  if (ctxPemuda) {
    var rekapKecamatan = { "Kaidipang": 0, "Pinogaluman": 0, "Bolangitang Timur": 0, "Bolangitang Barat": 0, "Bintauna": 0, "Sangkub": 0 };
    DB_PEMUDA.forEach(function(curr) { 
      if (rekapKecamatan.hasOwnProperty(curr.kec)) {
        rekapKecamatan[curr.kec] += (Number(curr.total) || 0); 
      }
    });

    if (chartHomePemudaInstance) { chartHomePemudaInstance.destroy(); }
    chartHomePemudaInstance = new Chart(ctxPemuda.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Kaidipang', 'Pinogaluman', 'Bolangitang Timur', 'Bolangitang Barat', 'Bintauna', 'Sangkub'],
        datasets: [{ data: Object.values(rekapKecamatan), backgroundColor: ['#22d3ee', '#c084fc', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'], borderRadius: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { weight: '600' } } },
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  var ctxSurvei = document.getElementById('chartHomeSurvei');
  if (ctxSurvei) {
    var sUsability = 4.8, sUI = 4.7, sContent = 4.6, sTech = 4.5, sOverall = 4.9;
    if (DB_SURVEI.length > 0) {
      var uTotal = 0; 
      DB_SURVEI.forEach(function(s) { uTotal += Number(s.skor_rata.split(" / ")[0]) || 4.5; });
      var hitungRata = (uTotal / DB_SURVEI.length).toFixed(1);
      sUsability = sUI = sContent = sTech = sOverall = hitungRata;
    }
    if (chartHomeSurveiInstance) { chartHomeSurveiInstance.destroy(); }
    chartHomeSurveiInstance = new Chart(ctxSurvei.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Usability', 'User Interface', 'Konten', 'Teknis', 'Global'],
        datasets: [{ data: [sUsability, sUI, sContent, sTech, sOverall], backgroundColor: ['#c084fc', '#f472b6', '#60a5fa', '#34d399', '#22d3ee'], borderRadius: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { weight: '600' } } },
          y: { min: 0, max: 5, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  var totalPendaftar = 0; 
  for (var k in DB_REGISTRASI) { totalPendaftar += DB_REGISTRASI[k].length; }

  var eKegiatan = document.getElementById("summary-home-kegiatan");
  if (eKegiatan) { eKegiatan.innerText = "Total Masuk: " + totalPendaftar + " Pendaftar"; }
  
  var ePanduan = document.getElementById("summary-home-panduan");
  if (ePanduan) { ePanduan.innerText = "Tersedia: " + (DB_PANDUAN_ADMINISTRASI.length + DB_JUKNIS_KEGIATAN.length) + " Berkas"; }
  
  var eSurvei = document.getElementById("summary-home-survei");
  if (eSurvei) { eSurvei.innerText = "Nilai: 4.8 / 5.0 (" + DB_SURVEI.length + " Responden)"; }
}

function updateKegiatanButtons() {
  for (var k in REG_STATUS) {
    var b = document.getElementById("btn-reg-" + k);
    if (b) {
      if (REG_STATUS[k]) {
        b.className = "btn btn-sm btn-download-clear w-100 mt-2 fw-bold";
        b.innerText = "Daftar";
        b.disabled = false;
      } else {
        b.className = "btn btn-sm btn-reg-closed w-100 mt-2 fw-bold";
        b.innerText = "Pendaftaran Ditutup";
        b.disabled = true;
      }
    }
  }
}

function renderClientCardsDokumen() {
  var pCards = document.getElementById("container-panduan-cards");
  var jCards = document.getElementById("container-juknis-cards");
  
  var template = function(doc, idx) {
    var gradColor = doc.grad || GRADIENT_POOL[idx % GRADIENT_POOL.length];
    return "<div class='col-md-6 col-lg-3 mb-3'>" +
        "<div class='info-card " + gradColor + " p-3 rounded text-white h-100 d-flex flex-column justify-content-between text-center shadow'>" +
        "<div>" +
        "<i class='bi " + (doc.ikon || 'bi-file-earmark-text-fill') + " fs-1 mb-2 d-block text-white'></i>" +
        "<h6 class='fw-bold mb-3 text-uppercase' style='font-size:0.85rem; min-height:40px;'>" + doc.nama + "</h6>" +
        "</div>" +
        "<a href='" + doc.link + "' target='_blank' class='btn btn-sm btn-download-clear w-100 text-center mt-2'>" +
        "<i class='bi bi-download me-1'></i>UNDUH" +
        "</a>" +
        "</div>" +
        "</div>";
  };
  
  if (pCards) { pCards.innerHTML = DB_PANDUAN_ADMINISTRASI.map(template).join(''); }
  if (jCards) { jCards.innerHTML = DB_JUKNIS_KEGIATAN.map(template).join(''); }
}

function renderSurveyFormMatrix() {
  var tbody = document.getElementById("surveyTableBody"); 
  if (!tbody) { return; }
  var html = ""; 
  var currentCat = "";
  
  METRIKS_SURVEI.forEach(function(m, idx) {
    if (m.category !== currentCat) {
      currentCat = m.category;
      html += "<tr class='bg-dark border-secondary'><td colspan='7' class='text-start text-cyan fw-bold bg-dark-sec ps-3 small'>" + currentCat + "</td></tr>";
    }
    
    var radioButtons = [1, 2, 3, 4, 5].map(function(v) {
      return "<td><input type='radio' name='srv_" + m.code + "' value='" + v + "' required></td>";
    }).join('');
    
    html += "<tr>" +
        "<td>" + (idx + 1) + "</td>" +
        "<td class='text-start'>" + m.label + "</td>" +
        radioButtons +
        "</tr>";
  });
  tbody.innerHTML = html;
}

function renderClientCardsKegiatan() {
  var container = document.getElementById("container-kegiatan-cards");
  if (!container) { return; }
  
  var htmlCards = DB_KEGIATAN.map(function(k, idx) {
    var iconClass = "bi-fire"; 
    if (k.id === "kreativesia") { iconClass = "bi-palette-fill"; }
    else if (k.id === "wirausaha") { iconClass = "bi-lightbulb-fill"; }
    else if (k.id === "pramuka") { iconClass = "bi-compass-fill"; }
    
    var gradColor = GRADIENT_POOL[idx % GRADIENT_POOL.length];
    var isClosed = (k.status === "TUTUP");
    var btnStyle = isClosed ? "btn-reg-closed" : "btn-download-clear";
    var btnText = isClosed ? "Pendaftaran Ditutup" : "Daftar";
    var isDisabled = isClosed ? "disabled" : "";
    
    return "<div class='col-md-6 col-lg-3'>" +
        "<div class='info-card " + gradColor + " p-3 rounded text-white h-100 d-flex flex-column justify-content-between text-center shadow'>" +
        "<div>" +
        "<i class='bi " + iconClass + " fs-2 mb-2 d-block text-white'></i>" +
        "<h5 class='fw-bold'>" + k.nama + "</h5>" +
        "<p class='small text-white-50 text-justify mb-2'>" + k.deskripsi + "</p>" +
        "<div class='p-2 bg-black bg-opacity-20 rounded small text-start border border-secondary border-opacity-20 mb-2'>" +
        "<div class='text-cyan'><i class='bi bi-calendar-check me-1'></i>" + k.pelaksanaan + "</div>" +
        "<div class='text-white-50' style='font-size:11px;'><i class='bi bi-card-checklist me-1'></i>" + k.syarat + "</div>" +
        "</div>" +
        "</div>" +
        "<button id='btn-reg-" + k.id + "' class='btn btn-sm " + btnStyle + " w-100 mt-2 fw-bold' onclick='openRegForm(\"" + k.id + "\")' " + isDisabled + ">" + btnText + "</button>" +
        "</div>" +
        "</div>";
  });
  container.innerHTML = htmlCards.join('');
}

function renderClientCardsBerita() {
  var containerMain = document.getElementById("container-berita-cards");
  var containerTeaser = document.getElementById("container-berita-teaser");
  
  if (DB_BERITA.length === 0) {
    if (containerMain) { containerMain.innerHTML = "<div class='col-12 text-center text-white-50 small py-4'>Belum ada publikasi rilis berita terbit.</div>"; }
    if (containerTeaser) { containerTeaser.innerHTML = "<div class='col-12 text-center text-white-50 small py-4'>Belum ada rilis berita terbaru.</div>"; }
    return;
  }
  
  var templateCard = function(b) {
    var placeholderImg = "https://placehold.co/600x400/0f172a/06b6d4?text=DISPORA+BOLTARA";
    var finalImg = b.gambar || placeholderImg;
    return "<div class='col-md-4 mb-2'>" +
        "<div class='card bg-dark-sec border-secondary h-100 text-white shadow-sm overflow-hidden'>" +
        "<img src='" + finalImg + "' class='card-img-top' alt='Dokumentasi Berita' style='height:165px; object-fit:cover;' onerror=\"this.src='" + placeholderImg + "'\">" +
        "<div class='card-body d-flex flex-column justify-content-between'>" +
        "<div>" +
        "<span class='text-cyan small d-block mb-1' style='font-size:11px;'><i class='bi bi-calendar-event me-1'></i>" + b.tanggal + "</span>" +
        "<h5 class='card-title fw-bold text-white' style='font-size:0.98rem;'>" + b.judul + "</h5>" +
        "<p class='card-text text-white-50 small text-justify' style='font-size:12px;'>" + (b.isi.length > 110 ? b.isi.substring(0, 110) + "..." : b.isi) + "</p>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>";
  };

  if (containerMain) { 
    containerMain.innerHTML = DB_BERITA.map(templateCard).join(''); 
  }
  
  if (containerTeaser) { 
    var beritaTerbaru = DB_BERITA.slice(0, 3);
    containerTeaser.innerHTML = beritaTerbaru.map(templateCard).join(''); 
  }
}

function openRegForm(type) {
  if (!REG_STATUS[type]) { return; }
  document.getElementById("formPlaceholderNotice").classList.add("d-none");
  document.getElementById("dynamicFormContainer").classList.remove("d-none");
  document.getElementById("current_kegiatan_type").value = type;
  document.getElementById("formTitle").innerText = "Formulir Pendaftaran Resmi: " + type.toUpperCase();
  
  var baseFields = "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>Nama Lengkap</label><input type='text' class='form-control bg-dark text-white border-secondary' id='reg_nama' required></div>" +
      "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>NIK / No. Identitas</label><input type='number' class='form-control bg-dark text-white border-secondary' id='reg_nik' required></div>" +
      "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>Tempat, Tanggal Lahir</label><input type='text' class='form-control bg-dark text-white border-secondary' id='reg_ttl' required></div>" +
      "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>Jenis Kelamin</label><select class='form-select bg-dark text-white border-secondary' id='reg_jk' required><option value=''>Pilih...</option><option value='Laki-laki'>Laki-laki</option><option value='Perempuan'>Perempuan</option></select></div>" +
      "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>Alamat Domisili</label><input type='text' class='form-control bg-dark text-white border-secondary' id='reg_alamat' required></div>" +
      "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>No. HP / WhatsApp</label><input type='tel' class='form-control bg-dark text-white border-secondary' id='reg_hp' required></div>" +
      "<div class='col-md-12 mb-2'><label class='form-label small fw-bold'>Asal Sekolah / Kampus / Organisasi</label><input type='text' class='form-control bg-dark text-white border-secondary' id='reg_instansi' required></div>";
  
  if (type === 'kreativesia') {
    baseFields += "<div class='col-md-6 mb-2'><label class='form-label small fw-bold text-cyan'>Kategori Lomba</label><select class='form-select' id='reg_spesifik' required><option value=''>Pilih Kategori...</option><option value='Desain Grafis'>Desain Grafis</option><option value='Kriya'>Kriya</option><option value='Kuliner'>Kuliner</option><option value='Vokal Solo'>Vokal Solo</option><option value='Sinematografi'>Sinematografi</option></select></div>";
  } else if (type === 'wirausaha') {
    baseFields += "<div class='col-md-6 mb-2'><label class='form-label small fw-bold text-cyan'>Jenis Usaha Diminati</label><select class='form-select' id='reg_spesifik' required><option value=''>Pilih Kategori Usaha...</option><option value='Kuliner'>Kuliner</option><option value='Kriya, Fashion, dan Desain'>Kriya, Fashion, dan Desain</option><option value='Teknologi, Informasi, dan Digital'>Teknologi, Informasi, dan Digital</option><option value='Pertanian, Peternakan, dan Perikanan (Agribisnis)'>Pertanian...</option><option value='Industri Kreatif dan Jasa'>Industri Kreatif dan Jasa</option></select></div>";
  } else { 
    baseFields += "<input type='hidden' id='reg_spesifik' value='-'>"; 
  }
  
  baseFields += "<div class='col-md-6 mb-2'><label class='form-label small fw-bold'>Upload Dokumen Penunjang (KTP/KK)</label><input type='file' class='form-control bg-dark text-white border-secondary' id='reg_file' required></div>";
  document.getElementById("formFieldsArea").innerHTML = baseFields;
}

function closeRegForm() { 
  document.getElementById("dynamicFormContainer").classList.add("d-none"); 
  document.getElementById("formPlaceholderNotice").classList.remove("d-none");
  document.getElementById("mainActivityForm").reset(); 
}

function submitFormKegiatan(e) {
  e.preventDefault();
  var type = document.getElementById("current_kegiatan_type").value; 
  var fileInput = document.getElementById("reg_file");
  
  if (fileInput.files.length > 0) {
    var file = fileInput.files[0]; 
    var reader = new FileReader();
    reader.onload = function(event) {
      var base64Data = event.target.result.split(',')[1];
      executePostUploadKegiatan({
        action: "kegiatan", 
        type: type, 
        waktu: new Date().toLocaleDateString('id-ID') + " " + new Date().toLocaleTimeString('id-ID'),
        nama: document.getElementById("reg_nama").value, 
        nik: document.getElementById("reg_nik").value, 
        ttl: document.getElementById("reg_ttl").value, 
        jk: document.getElementById("reg_jk").value,
        alamat: document.getElementById("reg_alamat").value, 
        hp: document.getElementById("reg_hp").value, 
        instansi: document.getElementById("reg_instansi").value,
        spesifik: document.getElementById("reg_spesifik") ? document.getElementById("reg_spesifik").value : "-", 
        fileData: base64Data, 
        fileName: file.name, 
        fileMime: file.type        
      });
    };
    reader.readAsDataURL(file);
  } else { 
    alert("Dokumen Penunjang wajib diunggah!"); 
  }
}

function executePostUploadKegiatan(payload) {
  var btn = document.querySelector("#mainActivityForm button[type='submit']");
  btn.disabled = true; 
  btn.innerText = "Mengunggah Data...";
  
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payload) 
  })
  .then(function(res) { return res.text(); })
  .then(function(text) { 
    var resData = JSON.parse(text);
    if (resData.status === "success") { 
      alert("Pendaftaran Berhasil Masuk Database!"); 
      closeRegForm(); 
      loadDataFromSheets(); 
    } 
  })
  .catch(function(err) { alert("Gagal mengunggah berkas ke server."); })
  .finally(function() { 
    btn.disabled = false; 
    btn.innerText = "Kirim Pendaftaran"; 
  });
}

function submitSurveiKepuasan(e) {
  e.preventDefault();
  var payload = {
    action: "survei", 
    waktu: new Date().toLocaleDateString('id-ID'), 
    nama: document.getElementById("survey_nama").value || "Anonim",
    r1: document.querySelector('input[name="srv_r1"]:checked').value, 
    r2: document.querySelector('input[name="srv_r2"]:checked').value, 
    r3: document.querySelector('input[name="srv_r3"]:checked').value,
    r4: document.querySelector('input[name="srv_r4"]:checked').value, 
    r5: document.querySelector('input[name="srv_r5"]:checked').value, 
    r6: document.querySelector('input[name="srv_r6"]:checked').value,
    r7: document.querySelector('input[name="srv_r7"]:checked').value, 
    r8: document.querySelector('input[name="srv_r8"]:checked').value, 
    r9: document.querySelector('input[name="srv_r9"]:checked').value,
    r10: document.querySelector('input[name="srv_r10"]:checked').value, 
    r11: document.querySelector('input[name="srv_r11"]:checked').value, 
    r12: document.querySelector('input[name="srv_r12"]:checked').value,
    r13: document.querySelector('input[name="srv_r13"]:checked').value, 
    r14: document.querySelector('input[name="srv_r14"]:checked').value,
    suka: document.getElementById("survey_suka").value, 
    kendala: document.getElementById("survey_kendala").value, 
    saran: document.getElementById("survey_saran").value
  };
  
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payload) 
  })
  .then(function(res) { return res.text(); })
  .then(function(text) { 
    alert("Kuesioner Sukses Tersimpan!"); 
    document.getElementById("satisfactionSurveyForm").reset(); 
    loadDataFromSheets(); 
  });
}

function triggerLoginGate(role) { 
  document.getElementById("login_selected_role").value = role; 
  document.getElementById("loginModalLabel").innerText = "Gerbang Otoritas: " + role; 
  new bootstrap.Modal(document.getElementById('loginGateModal')).show(); 
}

function submitLoginGate(e) {
  e.preventDefault(); 
  var role = document.getElementById("login_selected_role").value;
  var btn = document.querySelector("#modalLoginForm button[type='submit']");
  
  btn.disabled = true; 
  btn.innerHTML = "<span class='spinner-border spinner-border-sm me-2'></span>Memverifikasi Kredensial...";
  
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify({ 
      action: "login", 
      username: document.getElementById("login_username").value, 
      password: document.getElementById("login_password").value, 
      role: role 
    }) 
  })
  .then(function(res) { return res.text(); })
  .then(function(text) {
    try {
      var resData = JSON.parse(text);
      if (resData.status === "success" && resData.authorized === true) {
        alert("Verifikasi Sukses! Selamat Datang di Dashboard Control.");
        bootstrap.Modal.getInstance(document.getElementById('loginGateModal')).hide();
        document.getElementById("modalLoginForm").reset();
        openAdminDashboard(role);
      } else { 
        alert("Akses Ditolak: Kombinasi Kredensial Tidak Sesuai!"); 
      }
    } catch (err) { alert("Gagal mengurai respon otentikasi server."); }
  })
  .catch(function(err) { alert("Eror Jaringan Komunikasi Server."); })
  .finally(function() { 
    btn.disabled = false; 
    btn.innerHTML = "<i class='bi bi-shield-lock-fill me-2'></i>Otentikasi Akun"; 
  });
}

function openAdminDashboard(role) {
  showSection("admin-dashboard"); 
  document.getElementById("adminDashboardTitle").innerText = "Control Room: " + role;
  
  var tabsUl = document.getElementById("adminDashboardTabs"); 
  var contentDiv = document.getElementById("adminDashboardTabContent");
  tabsUl.innerHTML = ""; 
  contentDiv.innerHTML = "";

  if (role === "ADMIN DISPORA") {
    buildAdminTab(tabsUl, contentDiv, "t1", "Informasi & Akses Gerbang", renderSubBukaTutup(), true);
    buildAdminTab(tabsUl, contentDiv, "t2", "Daftar Peserta Kegiatan", renderSubPesertaKegiatan());
    buildAdminTab(tabsUl, contentDiv, "t8", "Kelola Berita Portal", renderSubKelolaBerita()); 
    buildAdminTab(tabsUl, contentDiv, "t3", "Edit Data OKP", renderSubKelolaOKP());
    buildAdminTab(tabsUl, contentDiv, "t4", "Edit Data Pemuda", renderSubKelolaPemuda());
    buildAdminTab(tabsUl, contentDiv, "t5", "Kelola Panduan & Juknis", renderSubKelolaDokumen());
    buildAdminTab(tabsUl, contentDiv, "t6", "Hasil Survei Kepuasan", renderSubHasilSurvei());
  } else if (role === "ADMIN PEMUDA/OKP") {
    buildAdminTab(tabsUl, contentDiv, "t3", "Edit Data OKP", renderSubKelolaOKP(), true);
    buildAdminTab(tabsUl, contentDiv, "t7", "Upload Proposal Kegiatan", renderSubUploadProposal()); 
  } else if (role === "ADMIN DESA/KECAMATAN") {
    buildAdminTab(tabsUl, contentDiv, "t4", "Edit Data Pemuda", renderSubKelolaPemuda(), true);
  }
}

function buildAdminTab(ul, content, id, title, htmlContent, isActive) {
  var activeClass = isActive ? "active" : "";
  ul.innerHTML += "<li class='nav-item'><button class='nav-link " + activeClass + "' id='" + id + "-tab' data-bs-toggle='tab' data-bs-target='#" + id + "-panel' type='button'>" + title + "</button></li>";
  
  var showActivePanel = isActive ? "show active" : "";
  content.innerHTML += "<div class='tab-pane fade " + showActivePanel + "' id='" + id + "-panel'><div class='bg-dark-sec p-3 rounded border border-secondary mt-3'>" + htmlContent + "</div></div>";
}

function renderSubBukaTutup() { 
  var rowsHtml = DB_KEGIATAN.map(function(k) {
    var badgeClass = (k.status === "BUKA") ? "bg-success" : "bg-secondary";
    return "<tr>" +
        "<td><span class='badge " + badgeClass + "'>" + k.status + "</span></td>" +
        "<td class='fw-bold text-white'>" + k.nama + "</td>" +
        "<td>" + k.pelaksanaan + "</td>" +
        "<td>" + k.syarat + "</td>" +
        "<td><button class='btn btn-xs btn-warning py-0 px-2 fw-bold' style='font-size:11px;' onclick=\"populateKegiatanEf(" + k.rowIndex + ", '" + k.id + "', '" + k.nama.replace(/'/g, "\\'") + "', '" + k.pelaksanaan.replace(/'/g, "\\'") + "', '" + k.syarat.replace(/'/g, "\\'") + "', '" + k.status + "')\">Pilih</button></td>" +
        "</tr>";
  }).join('');

  return "<h6 class='text-cyan fw-bold mb-3'>MANAJEMEN INFORMASI RUMPUN KEGIATAN (DUA ARAH)</h6>" +
      "<form onsubmit='saveAdminKegiatan(event)' class='row g-3'>" +
      "<input type='hidden' id='adm_keg_row_index' value=''><input type='hidden' id='adm_keg_id' value=''>" +
      "<div class='col-md-3'><label class='form-label small'>Nama Kegiatan</label><input type='text' id='adm_keg_nama' class='form-control bg-dark text-white border-secondary' readonly></div>" +
      "<div class='col-md-3'><label class='form-label small'>Waktu Pelaksanaan</label><input type='text' id='adm_keg_pelaksanaan' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-3'><label class='form-label small'>Persyaratan Berkas</label><input type='text' id='adm_keg_syarat' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-3'><label class='form-label small'>Gerbang Akses</label><select id='adm_keg_status' class='form-select bg-dark text-white border-secondary'><option value='BUKA'>BUKA</option><option value='TUTUP'>TUTUP</option></select></div>" +
      "<div class='col-md-12 text-end'><button type='submit' id='btn-save-keg' class='btn btn-sm btn-cyan fw-bold px-4 py-2' disabled>Pilih Baris Kegiatan Terlebih Dahulu</button></div>" +
      "</form>" +
      "<div class='mt-4'><h6 class='text-white small fw-bold mb-2'>Daftar Skema Rumpun Kegiatan Berjalan:</h6>" +
      "<div class='table-responsive'><table class='table table-dark table-striped table-bordered small text-center mb-0'><thead><tr><th>Status</th><th>Nama Kegiatan</th><th>Pelaksanaan</th><th>Persyaratan</th><th>Aksi</th></tr></thead><tbody>" + (rowsHtml || "<tr><td colspan='5'>Kosong / Lembar Data Belum Sinkron</td></tr>") + "</tbody></table></div></div>"; 
}

function populateKegiatanEf(rIdx, id, nama, pelaksanaan, syarat, status) {
  document.getElementById("adm_keg_row_index").value = rIdx;
  document.getElementById("adm_keg_id").value = id;
  document.getElementById("adm_keg_nama").value = nama;
  document.getElementById("adm_keg_pelaksanaan").value = pelaksanaan;
  document.getElementById("adm_keg_syarat").value = syarat;
  document.getElementById("adm_keg_status").value = status;
  
  var btn = document.getElementById("btn-save-keg");
  btn.innerText = "Perbarui Lembar Data Sheets (Update)";
  btn.disabled = false;
}

function saveAdminKegiatan(e) {
  e.preventDefault();
  showLoading();
  var payload = {
    action: "kegiatan_update",
    rowIndex: document.getElementById("adm_keg_row_index").value,
    id: document.getElementById("adm_keg_id").value,
    pelaksanaan: document.getElementById("adm_keg_pelaksanaan").value,
    syarat: document.getElementById("adm_keg_syarat").value,
    status: document.getElementById("adm_keg_status").value
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.text(); })
  .then(function(t) {
    alert("Data Pengaturan Kegiatan Berhasil Sinkron!");
    loadDataFromSheets();
    openAdminDashboard("ADMIN DISPORA");
  })
  .catch(function(err) { alert("Gagal memperbarui konfigurasi server."); })
  .finally(function() { hideLoading(); });
}

function renderSubKelolaBerita() {
  var rowsHtml = DB_BERITA.map(function(b) {
    return "<tr>" +
        "<td>" + b.tanggal + "</td>" +
        "<td class='fw-bold text-white text-start'>" + b.judul + "</td>" +
        "<td><button class='btn btn-xs btn-warning py-0 px-2 fw-bold' style='font-size:11px;' onclick=\"populateBeritaEf(" + b.rowIndex + ", " + b.no + ", '" + b.tanggal + "', '" + b.judul.replace(/'/g, "\\'") + "', '" + b.isi.replace(/'/g, "\\'") + "')\">Pilih</button></td>" +
        "</tr>";
  }).join('');

  return "<h6 class='text-cyan fw-bold mb-3'>MANAJEMEN ARTIKEL PENGUMUMAN & BERITA PORTAL BERANDA</h6>" +
      "<form onsubmit='saveAdminBerita(event)' class='row g-3'>" +
      "<input type='hidden' id='adm_ber_row_index' value=''><input type='hidden' id='adm_ber_no' value=''>" +
      "<div class='col-md-6'><label class='form-label small'>Judul Utama Berita</label><input type='text' id='adm_ber_judul' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-6'><label class='form-label small'>Unggah Gambar Dokumentasi (Opsional / .jpg / .png)</label><input type='file' id='adm_ber_file' class='form-control bg-dark text-white border-secondary'></div>" +
      "<div class='col-md-12'><label class='form-label small'>Isi Lengkap Rilis Pers Pengumuman</label><textarea id='adm_ber_isi' class='form-control bg-dark text-white border-secondary' rows='3' required></textarea></div>" +
      "<div class='col-md-12 text-end'><button type='submit' id='btn-save-berita' class='btn btn-sm btn-cyan fw-bold px-4 py-2'>Terbitkan Berita Baru</button></div>" +
      "</form>" +
      "<div class='mt-4'><h6 class='text-white small fw-bold mb-2'>Daftar Pengumuman Terbit:</h6>" +
      "<div class='table-responsive' style='max-height:160px;'><table class='table table-dark table-striped table-bordered small text-center mb-0'><thead><tr><th>Tanggal</th><th>Judul Artikel</th><th>Aksi</th></tr></thead><tbody>" + (rowsHtml || "<tr><td colspan='3'>Kosong / Belum Ada Pengumuman</td></tr>") + "</tbody></table></div></div>";
}

function populateBeritaEf(rIdx, no, tanggal, judul, isi) {
  document.getElementById("adm_ber_row_index").value = rIdx;
  document.getElementById("adm_ber_no").value = no;
  document.getElementById("adm_ber_judul").value = judul;
  document.getElementById("adm_ber_isi").value = isi;
  document.getElementById("btn-save-berita").innerText = "Perbarui Artikel Berita (Update)";
}

function saveAdminBerita(e) {
  e.preventDefault();
  showLoading();
  var rIdx = document.getElementById("adm_ber_row_index").value;
  var fileInput = document.getElementById("adm_ber_file");

  var sendDataBerita = function(base64Data, fileName, fileMime) {
    var payload = {
      action: "berita",
      rowIndex: rIdx || null,
      no: document.getElementById("adm_ber_no").value || null,
      tanggal: new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, '0') + "-" + String(new Date().getDate()).padStart(2, '0'),
      judul: document.getElementById("adm_ber_judul").value,
      isi: document.getElementById("adm_ber_isi").value,
      fileData: base64Data || null,
      fileName: fileName || null,
      fileMime: fileMime || null
    };

    fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.text(); })
    .then(function(t) {
      alert("Portal Artikel Pengumuman Sukses Diperbarui!");
      loadDataFromSheets();
      openAdminDashboard("ADMIN DISPORA");
    })
    .catch(function(err) { alert("Gagal mengamankan berkas rilis berita."); })
    .finally(function() { hideLoading(); });
  };

  if (fileInput.files.length > 0) {
    var file = fileInput.files[0];
    var reader = new FileReader();
    reader.onload = function(evt) {
      var base64 = evt.target.result.split(',')[1];
      sendDataBerita(base64, file.name, file.type);
    };
    reader.readAsDataURL(file);
  } else {
    sendDataBerita(null, null, null);
  }
}

function renderSubPesertaKegiatan() {
  var out = "<h6>Data Masuk Peserta Registrasi Acara</h6>";
  for (var k in DB_REGISTRASI) { 
    var ext = (k === "kreativesia" || k === "wirausaha");
    var rowsTable = "";
    
    if (DB_REGISTRASI[k].length === 0) {
      rowsTable = "<tr><td colspan='" + (ext ? 9 : 8) + "'>Belum Ada Peserta Terdata</td></tr>";
    } else {
      rowsTable = DB_REGISTRASI[k].map(function(p) {
        return "<tr>" +
            "<td>" + p.no + "</td>" +
            "<td>" + p.nama + "</td>" +
            "<td>" + (p.nik || '-') + "</td>" +
            "<td>" + (p.ttl || '-') + "</td>" +
            "<td>" + (p.jk || '-') + "</td>" +
            "<td>" + p.hp + "</td>" +
            "<td>" + p.instansi + "</td>" +
            (ext ? "<td>" + p.spesifik + "</td>" : "") +
            "<td><a href='" + p.file + "' target='_blank' class='btn btn-xs btn-primary py-0 px-2 small text-white'>Lihat Berkas</a></td>" +
            "</tr>";
      }).join('');
    }
    
    out += "<div class='mt-3 border border-secondary p-2 rounded'>" +
        "<span class='badge bg-danger mb-2 text-uppercase'>Kegiatan: " + k + "</span>" +
        "<div class='table-responsive'>" +
        "<table class='table table-bordered table-dark small text-center mb-0'>" +
        "<thead><tr><th>No</th><th>Nama</th><th>NIK</th><th>TTL</th><th>JK</th><th>No. HP</th><th>Instansi</th>" + (ext ? "<th>Spesifik</th>" : "") + "<th>File</th></tr></thead>" +
        "<tbody>" + rowsTable + "</tbody>" +
        "</table>" +
        "</div>" +
        "</div>"; 
  }
  return out;
}

function renderSubKelolaOKP() { 
  var rowsHtml = DB_OKP.map(function(o) {
    return "<tr><td>" + o.nama + "</td><td>" + o.alamat + "</td><td><button class='btn btn-xs btn-warning py-0 px-2 fw-bold' style='font-size:11px;' onclick=\"populateOKPEf(" + o.rowIndex + ", " + o.no + ", '" + o.nama.replace(/'/g, "\\'") + "', '" + o.tingkat.replace(/'/g, "\\'") + "', '" + o.ketua.replace(/'/g, "\\'") + "', '" + o.alamat.replace(/'/g, "\\'") + "', '" + o.sk + "')\">Pilih</button></td></tr>";
  }).join('');
  
  return "<h6 class='text-warning fw-bold mb-3'>Pembaruan Berkas Data OKP Dua Arah</h6>" +
      "<form onsubmit='saveAdminOKP(event)' class='row g-3'>" +
      "<input type='hidden' id='adm_okp_row_index' value=''><input type='hidden' id='adm_okp_no' value=''>" +
      "<div class='col-md-4'><label class='form-label small'>Nama Resmi OKP</label><input type='text' id='adm_okp_nama' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-4'><label class='form-label small'>Tingkatan Kepengurusan</label><input type='text' id='adm_okp_tingkat' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-4'><label class='form-label small'>Kecamatan Basis</label><input type='text' id='adm_okp_alamat' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-4'><label class='form-label small'>Nama Ketua</label><input type='text' id='adm_okp_ketua' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-4'><label class='form-label small'>Status Keaktifan</label><select id='adm_okp_sk' class='form-select bg-dark text-white border-secondary'><option value='Aktif'>Aktif</option><option value='Perlu Validasi'>Perlu Validasi</option></select></div>" +
      "<div class='col-md-4 d-flex align-items-end'><button type='submit' id='btn-save-okp' class='btn btn-sm btn-cyan fw-bold w-100 py-2'>Simpan Sebagai Data Baru</button></div>" +
      "</form>" +
      "<div class='mt-4'><h6 class='text-white small fw-bold mb-2'>Pilih Baris OKP Target:</h6>" +
      "<div class='table-responsive' style='max-height:180px;'><table class='table table-dark table-striped table-bordered small mb-0'><thead><tr><th>Nama OKP</th><th>Kecamatan Basis</th><th>Aksi</th></tr></thead><tbody>" + (rowsHtml || "<tr><td colspan='3'>Kosong</td></tr>") + "</tbody></table></div></div>"; 
}

function populateOKPEf(rIdx, no, nama, tingkat, ketua, alamat, sk) {
  document.getElementById("adm_okp_row_index").value = rIdx; 
  document.getElementById("adm_okp_no").value = no;
  document.getElementById("adm_okp_nama").value = nama; 
  document.getElementById("adm_okp_tingkat").value = tingkat;
  document.getElementById("adm_okp_alamat").value = alamat; 
  document.getElementById("adm_okp_ketua").value = ketua;
  document.getElementById("adm_okp_sk").value = sk; 
  document.getElementById("btn-save-okp").innerText = "Perbarui Lembar Data Sheets (Update)";
}

function saveAdminOKP(e) { 
  e.preventDefault(); 
  var rIdx = document.getElementById("adm_okp_row_index").value;
  var payloadObj = { 
    action: "okp", 
    rowIndex: rIdx || null, 
    no: document.getElementById("adm_okp_no").value || null, 
    nama: document.getElementById("adm_okp_nama").value, 
    tingkat: document.getElementById("adm_okp_tingkat").value, 
    sk: document.getElementById("adm_okp_sk").value, 
    alamat: document.getElementById("adm_okp_alamat").value, 
    ketua: document.getElementById("adm_okp_ketua").value 
  };
  
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(payloadObj) 
  })
  .then(function(res) { return res.text(); })
  .then(function(t) { 
    alert("Data OKP Sukses Terbincang Dua Arah!"); 
    loadDataFromSheets(); 
    openAdminDashboard(document.getElementById("login_selected_role").value); 
  }); 
}

function renderSubKelolaPemuda() { 
  var villageOptions = DB_PEMUDA.map(function(p) {
    return "<option value='" + p.rowIndex + "|" + p.l + "|" + p.p + "'>Kec. " + p.kec + " - Desa " + p.desa + "</option>";
  }).join('');
  
  return "<h6 class='text-info fw-bold mb-3'>Modifikasi Populasi Demografi Pemuda Dua Arah</h6>" +
      "<div class='mb-3'><label class='form-label small text-cyan fw-bold'>Pilih Desa/Kelurahan Target:</label><select id='adm_pmd_select' class='form-select bg-dark text-white border-secondary' onchange='syncFieldsPemuda()'><option value=''>-- Pilih Lokasi --</option>" + villageOptions + "</select></div>" +
      "<form onsubmit='saveAdminPemuda(event)' class='row g-3 d-none' id='adm_pmd_form'>" +
      "<input type='hidden' id='adm_pmd_row_index' value=''>" +
      "<div class='col-md-6'><label class='form-label small'>Jumlah Laki-laki (L)</label><input type='number' id='adm_pmd_l' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-6'><label class='form-label small'>Jumlah Perempuan (P)</label><input type='number' id='adm_pmd_p' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-12 text-end'><button type='submit' class='btn btn-sm btn-cyan fw-bold px-4 py-2'>Perbarui Nilai Sel Sheet</button></div>" +
      "</form>"; 
}

function syncFieldsPemuda() {
  var val = document.getElementById("adm_pmd_select").value; 
  var form = document.getElementById("adm_pmd_form");
  if (!val) { 
    form.classList.add("d-none"); 
    return; 
  } 
  form.classList.remove("d-none");
  var fragments = val.split("|"); 
  document.getElementById("adm_pmd_row_index").value = fragments[0];
  document.getElementById("adm_pmd_l").value = fragments[1]; 
  document.getElementById("adm_pmd_p").value = fragments[2];
}

function saveAdminPemuda(e) { 
  e.preventDefault(); 
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify({ 
      action: "pemuda", 
      rowIndex: document.getElementById("adm_pmd_row_index").value, 
      l: document.getElementById("adm_pmd_l").value, 
      p: document.getElementById("adm_pmd_p").value 
    }) 
  })
  .then(function(res) { return res.text(); })
  .then(function(t) { 
    alert("Kuantitas Penduduk Sukses Ditimpa!"); 
    loadDataFromSheets(); 
    openAdminDashboard(document.getElementById("login_selected_role").value); 
  }); 
}

function renderSubKelolaDokumen() { 
  var allDocs = [].concat(DB_PANDUAN_ADMINISTRASI, DB_JUKNIS_KEGIATAN);
  var listHtml = allDocs.map(function(d) {
    return "<tr><td><span class='badge bg-secondary'>" + d.kategori + "</span></td><td>" + d.nama + "</td><td><button class='btn btn-xs btn-warning py-0 px-2 text-dark' style='font-size:11px;' onclick=\"populateDocEf(" + d.rowIndex + ", " + d.no + ", '" + d.nama.replace(/'/g, "\\'") + "', '" + d.link + "', '" + d.grad + "', '" + d.kategori + "')\">Pilih</button></td></tr>";
  }).join('');
  
  return "<h6 class='text-success fw-bold mb-3'>Manajemen Dokumen Juknis & Panduan Terintegrasi (Dua Arah)</h6>" +
      "<form onsubmit='saveAdminDokumen(event)' class='row g-3'>" +
      "<input type='hidden' id='adm_doc_row_index' value=''><input type='hidden' id='adm_doc_no' value=''>" +
      "<div class='col-md-4'><label class='form-label small'>Nama Dokumen</label><input type='text' id='adm_doc_nama' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-3'><label class='form-label small'>Kategori Rumpun</label><select id='adm_doc_kat' class='form-select bg-dark text-white border-secondary'><option value='panduan'>Panduan Administrasi</option><option value='juknis'>Juknis Kegiatan</option></select></div>" +
      "<div class='col-md-3'><label class='form-label small'>Link Google Drive</label><input type='url' id='adm_doc_link' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-2'><label class='form-label small'>Warna Gradasi</label><select id='adm_doc_grad' class='form-select bg-dark text-white border-secondary'><option value='grad-red'>Merah</option><option value='grad-blue'>Biru</option><option value='grad-yellow'>Kuning</option><option value='grad-green'>Hijau</option></select></div>" +
      "<div class='col-md-12 text-end'><button type='submit' id='btn-save-doc' class='btn btn-sm btn-cyan fw-bold px-4 py-2'>Terbarui Berkas Baru</button></div>" +
      "</form>" +
      "<div class='mt-3' style='max-height:150px; overflow-y:auto;'><table class='table table-dark table-bordered small text-center mb-0'><thead><tr><th>Kategori</th><th>Nama Berkas</th><th>Aksi</th></tr></thead><tbody>" + listHtml + "</tbody></table></div>"; 
}

function populateDocEf(rIdx, no, nama, link, grad, kategori) {
  document.getElementById("adm_doc_row_index").value = rIdx; 
  document.getElementById("adm_doc_no").value = no;
  document.getElementById("adm_doc_nama").value = nama; 
  document.getElementById("adm_doc_kat").value = kategori;
  document.getElementById("adm_doc_link").value = link; 
  document.getElementById("adm_doc_grad").value = grad;
  document.getElementById("btn-save-doc").innerText = "Perbarui Berkas Terbit (Update)";
}

function saveAdminDokumen(e) { 
  e.preventDefault(); 
  var sendObj = { 
    action: "dokumen", 
    rowIndex: document.getElementById("adm_doc_row_index").value || null, 
    no: document.getElementById("adm_doc_no").value || null, 
    nama: document.getElementById("adm_doc_nama").value.toUpperCase(), 
    ikon: "bi-file-earmark-text-fill", 
    link: document.getElementById("adm_doc_link").value, 
    grad: document.getElementById("adm_doc_grad").value, 
    kategori: document.getElementById("adm_doc_kat").value 
  };
  
  fetch(SCRIPT_URL, { 
    method: "POST", 
    headers: { "Content-Type": "text/plain" }, 
    body: JSON.stringify(sendObj) 
  })
  .then(function(res) { return res.text(); })
  .then(function(t) { 
    alert("Database Berkas Google Sheet Diperbarui!"); 
    loadDataFromSheets(); 
    openAdminDashboard("ADMIN DISPORA"); 
  });
}

function renderSubUploadProposal() { 
  return "<h6 class='text-warning fw-bold mb-3'><i class='bi bi-cloud-arrow-up-fill me-2'></i>Form Pengunggahan Berkas Proposal Kegiatan OKP</h6>" +
      "<form onsubmit='saveAdminProposal(event)' class='row g-3'>" +
      "<div class='col-md-6'><label class='form-label small'>Nama Judul Kegiatan Proposal</label><input type='text' id='proposal_judul' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-6'><label class='form-label small'>Nama Organisasi Kepemudaan Pengirim</label><input type='text' id='proposal_okp' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-12'><label class='form-label small'>Pilih Berkas Dokumen Proposal</label><input type='file' id='proposal_file' class='form-control bg-dark text-white border-secondary' required></div>" +
      "<div class='col-md-12 text-end'><button type='submit' class='btn btn-sm btn-warning fw-bold px-4'>Upload Proposal ke Drive</button></div>" +
      "</form>"; 
}

function saveAdminProposal(e) { 
  e.preventDefault(); 
  var fileInput = document.getElementById("proposal_file"); 
  if (fileInput.files.length > 0) { 
    var file = fileInput.files[0]; 
    var reader = new FileReader(); 
    reader.onload = function(evt) { 
      var payloadObj = { 
        action: "proposal", 
        judul: document.getElementById("proposal_judul").value, 
        okp: document.getElementById("proposal_okp").value, 
        fileData: evt.target.result.split(',')[1], 
        fileName: file.name, 
        fileMime: file.type 
      };
      fetch(SCRIPT_URL, { 
        method: "POST", 
        headers: { "Content-Type": "text/plain" }, 
        body: JSON.stringify(payloadObj) 
      })
      .then(function(res) { return res.json(); })
      .then(function(data) { 
        if (data.status === "success") { 
          alert("Proposal Berhasil Diunggah!"); 
          e.target.reset(); 
        } 
      }); 
    }; 
    reader.readAsDataURL(file); 
  } 
}

function renderSubHasilSurvei() { 
  var loopRows = DB_SURVEI.map(function(s) {
    return "<tr><td>" + s.no + "</td><td>" + s.nama + "</td><td>" + s.skor_rata + "</td><td>" + s.suka + "</td><td>" + s.kendala + "</td></tr>";
  }).join('');
  return "<h6 class='text-purple fw-bold mb-3'>Rekap Lembar Hasil Survei Kepuasan</h6><div class='table-responsive'><table class='table table-dark table-striped table-bordered small text-center mb-0'><thead><tr><th>No</th><th>Responden</th><th>Skor</th><th>Suka</th><th>Kendala</th></tr></thead><tbody>" + loopRows + "</tbody></table></div>"; 
}

function logoutAdminSystem() { 
  showSection("login"); 
}
