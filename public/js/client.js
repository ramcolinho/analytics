const socket = io({
  path: "/socket.io/",
  transports: ["polling", "websocket"],
  autoConnect: true,
  forceNew: true,
  withCredentials: false,
  reconnectionDelay: 1000, // Daha hızlı yeniden bağlantı
  timeout: 10000, // 10 saniye içinde bağlantı sağlanmazsa timeout
});

let sessionId;
let selectedEmoji = null;

// Template yükleme fonksiyonu
async function loadTemplate(templateName) {
  try {
    const response = await fetch(`/templates/${templateName}.html`);
    let html = await response.text();
    
    // Favorites sayfası için özel işlem
    if (templateName === 'favorites') {
      const sessionId = localStorage.getItem("sessionId");
      const widgetTypes = [
        'assessment-sheets',
        'fsm-reports',
        'sms-credits',
        'students-report',
        'my-diary',
        'absent-staff'
      ];
      
      // Her widget için favori durumunu kontrol et
      widgetTypes.forEach(type => {
        const isFavorite = favoriteData.some(item => 
          item.additionalData.cardType === type && 
          item.additionalData.sessionId === sessionId &&
          item.additionalData.selected === true
        );
        
        if (isFavorite) {
          // Favori olan widget'ların yıldızını seçili hale getir
          html = html.replace(
            `<button class="favorite-btn text-gray-400" onclick="toggleFavorite(this, '${type}')">`,
            `<button class="favorite-btn text-yellow-400 active" onclick="toggleFavorite(this, '${type}')">`,
          );
        }
      });
    }
    
    return html;
  } catch (error) {
    console.error("Error loading template:", error);
    return "";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("sessionId")) {
    sessionId = "s" + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-4);
    localStorage.setItem("sessionId", sessionId);
  } else {
    sessionId = localStorage.getItem("sessionId");
  }

  activeTab ??= "Form";
  const contentPanel = document.getElementById("content-panel");
  const contentMap = {
    Form: async () => await loadTemplate("form"),
    Favorites: async () => await loadTemplate("favorites"),
    Tooltip: async () => await loadTemplate("tooltip"),
    Feedback: async () => await loadTemplate("feedback"),
    Settings: async () => await loadTemplate("settings"),
  };
  const content = await contentMap[activeTab]();
  contentPanel.innerHTML = content;
  highlightActiveSession();
  formChart();
});

const pieCtx = document.getElementById("pieChart").getContext("2d");
const barCtx = document.getElementById("barChart").getContext("2d");

// Tab mapping'i güncellendi
const tabs = {
  1: "Form",
  2: "Favorites",
  3: "Tooltip",
  4: "Feedback",
  5: "Settings",
};

// Content map'i güncellendi
const contentMap = {
  Form: async () => await loadTemplate("form"),
  Favorites: async () => await loadTemplate("favorites"),
  Tooltip: async () => await loadTemplate("tooltip"),
  Feedback: async () => await loadTemplate("feedback"),
  Settings: async () => await loadTemplate("settings"),
};

let activeTab;

let formData = [];
let stepperData = [];
let tooltipData = [];
let favoriteData = [];
let feedbackData = [];
let settingsData = [];

let errorCounts = {
  schoolId: 0,
  userName: 0,
  password: 0,
};

let loadCount = 0;

const widgets = [
  {
    id: "calendar-widget",
    title: "Calendar",
    icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
    type: "calendar",
  },
  {
    id: "table-widget",
    title: "Table",
    icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>`,
    type: "table",
  },
  {
    id: "chart-widget",
    title: "Chart",
    icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
            </svg>`,
    type: "chart",
  },
  {
    id: "notification-widget",
    title: "Notification",
    icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <circle cx="12" cy="2" r="1"></circle>
            </svg>`,
    type: "notification",
  },
];

function createWidgetHTML(widget) {
  return `
    <div class="border rounded-lg shadow-sm mb-4">
        <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
            <div class="flex items-center gap-2">
                ${widget.icon}
                <span class="text-lg font-semibold">${widget.title}</span>
            </div>
            <button id="${widget.id}" class="favorite-btn text-gray-400 hover:text-yellow-400 transition-colors" onclick="toggleFavorite(this, '${widget.id}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z">
                    </path>
                </svg>
            </button>
        </div>
    </div>`;
}

const pieChart = new Chart(pieCtx, {
  type: "pie",
  data: {
    labels: [],
    datasets: [
      {
        label: "Real-time Analitik",
        data: [],
        backgroundColor: ["rgba(147, 51, 234, 0.2)", "rgba(99, 102, 241, 0.2)", "rgba(34, 197, 94, 0.2)", "rgba(239, 68, 68, 0.2)", "rgba(124, 58, 237, 0.2)"],
        borderColor: ["rgba(147, 51, 234, 1)", "rgba(99, 102, 241, 1)", "rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)", "rgba(124, 58, 237, 1)"],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
  },
});

const barChart = new Chart(barCtx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [
      {
        label: "Real-time Analitik",
        data: [],
        backgroundColor: ["rgba(147, 51, 234, 0.2)", "rgba(99, 102, 241, 0.2)", "rgba(34, 197, 94, 0.2)", "rgba(239, 68, 68, 0.2)", "rgba(124, 58, 237, 0.2)"],
        borderColor: ["rgba(147, 51, 234, 1)", "rgba(99, 102, 241, 1)", "rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)", "rgba(124, 58, 237, 1)"],
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
  },
});

socket.on("initialData", (data) => {
  formData = data.filter((item) => item.eventType == "submit");
  stepperData = data.filter((item) => item.eventType == "PROCESS_END");
  tooltipData = data.filter((item) => item.eventType == "TOOLTIP");
  favoriteData = data.filter((item) => item.eventType == "favorites");
  feedbackData = data.filter((item) => item.eventType == "feedback");
  settingsData = data.filter((item) => item.eventType == "settings");

  activeTab ??= "Form";
  console.log("Update Edildi");

  // const contentPanel = document.getElementById("content-panel");
  // contentPanel.innerHTML = contentMap[activeTab];

  if (activeTab == "Form") {
    formChart();
  }

  if (activeTab == "Tooltip") {
    tooltipChart();
  }

  if (activeTab == "Feedback") {
    feedbackChart();
  }

  if (activeTab == "Settings") {
    settingsChart();
  }

  if (activeTab == "Favorites") {
    favoritesChart();
  }

  // if (activeTab == "Custom") {
  //   updateTable([], "Custom", "success");
  // }

  pieChart.update();
  barChart.update();
});

function updateTable(data, type, status) {
  
  const tableBody = document.getElementById("analytics-table");
  if (!data) {
    tableBody.innerHTML = "";
    return;
  }
  const sortedData = data.sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()));
  const html = sortedData.map(
    (item) => `
        <tr class="hover:bg-gray-50" data-session-id="${item.sessionId || ''}">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.sessionId}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.type}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(item.timestamp || Date.now()).toLocaleString()}
            </td>
        </tr>
    `
  ).join("");

  tableBody.innerHTML = html;
  highlightActiveSession();
}

socket.on("tabChanged", async (data) => {
  activeTab = tabs[data];
  const content = await contentMap[activeTab]();
  const contentPanel = document.getElementById("content-panel");
  contentPanel.innerHTML = content;

  socket.emit("tabChanged", data);

  if (activeTab == "Form") {
    formChart();
  } else if (activeTab == "Tooltip") {
    tooltipChart();
  } else if (activeTab == "Feedback") {
    feedbackChart();
  } else if (activeTab == "Settings") {
    settingsChart();
  } else if (activeTab == "Favorites") {
    favoritesChart();
  }

  pieChart.update();
  barChart.update();
});

socket.on("dataUpdated", () => {
  socket.emit("getData");
});

function feedbackChart() {
  // Reset chart type and options
  barChart.config.type = 'bar';
  barChart.options = {};
  
  pieChart.canvas.style.display = "none";
  barChart.canvas.style.display = "block";
  
  const verySad = feedbackData.filter((item) => item.additionalData.feedback === "verySad");
  const sad = feedbackData.filter((item) => item.additionalData.feedback === "sad");
  const neutral = feedbackData.filter((item) => item.additionalData.feedback === "neutral");
  const happy = feedbackData.filter((item) => item.additionalData.feedback === "happy");
  const veryHappy = feedbackData.filter((item) => item.additionalData.feedback === "veryHappy");
  
  const totalFeedback = feedbackData.length || 1;
  const voteCounts = [
    verySad.length,
    sad.length,
    neutral.length,
    happy.length,
    veryHappy.length
  ];

  // Yüzdeleri sadece tooltip için hesapla
  const percentages = voteCounts.map(count => (count / totalFeedback) * 100);

  barChart.options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        titleFont: {
          size: 14,
          weight: 600
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            const labels = ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"];
            return labels[context[0].dataIndex];
          },
          label: function(context) {
            const index = context.dataIndex;
            const votes = voteCounts[index];
            const percentage = percentages[index].toFixed(1);
            return [
              `Number of Votes: ${votes}`,
              `Percentage: ${percentage}%`,
              `Total Votes: ${totalFeedback}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: Math.max(...voteCounts) + 1, // En yüksek oy sayısına göre ayarla
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#374151',
          font: {
            size: 14,
            weight: 500
          },
          callback: function(value, index) {
            const labels = ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"];
            return labels[index];
          }
        },
        border: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        right: 10
      }
    },
    maintainAspectRatio: false
  };

  // Dataset ayarları
  barChart.data.labels = ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"];
  barChart.data.datasets = [{
    data: voteCounts, // Yüzde yerine direkt oy sayılarını kullan
    backgroundColor: [
      '#B91C1C', // Very Dissatisfied - kırmızı
      '#C2410C', // Dissatisfied - turuncu
      '#B45309', // Neutral - kahverengi
      '#047857', // Satisfied - yeşil
      '#047857'  // Very Satisfied - yeşil
    ],
    borderWidth: 0,
    borderRadius: 4,
    barThickness: 20,
    barPercentage: 0.95,
    categoryPercentage: 0.95
  }];

  // Chart yüksekliğini ve genişliğini ayarla
  barChart.canvas.parentNode.style.height = '250px';
  barChart.canvas.style.width = '100%';
  
  barChart.update();

  const feedbackDataTable = feedbackData.map((item) => ({
    sessionId: item.additionalData.sessionId,
    type: item.additionalData.feedback,
    timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
  }));
  updateTable(feedbackDataTable);
}

function fovoriatesChart() {
  // Reset chart type and options
  barChart.config.type = 'bar';
  barChart.options = {};

  pieChart.canvas.style.display = "none";
  barChart.canvas.style.display = "block";

  const getActiveUserNameFavorites = favoriteData.filter((item) => item.additionalData.sessionId === sessionId);
  const isCalendarWidgetFavorite = getActiveUserNameFavorites.find((item) => item.additionalData.cardType == "calendar-widget" && item.additionalData.selected === true);
  const isTableWidgetFavorite = getActiveUserNameFavorites.find((item) => item.additionalData.cardType == "table-widget" && item.additionalData.selected === true);
  const isChartdWidgetFavorite = getActiveUserNameFavorites.find((item) => item.additionalData.cardType == "chart-widget" && item.additionalData.selected === true);
  const isNotificationWidgetFavorite = getActiveUserNameFavorites.find((item) => item.additionalData.cardType == "notification-widget" && item.additionalData.selected === true);

  const totalCalendarWidgetFavorites = favoriteData.filter((item) => item.additionalData.cardType === "calendar-widget" && item.additionalData.selected === true).length;
  const totalTableWidgetFavorites = favoriteData.filter((item) => item.additionalData.cardType === "table-widget" && item.additionalData.selected === true).length;
  const totalCardWidgetFavorites = favoriteData.filter((item) => item.additionalData.cardType === "chart-widget" && item.additionalData.selected === true).length;
  const totalNotificationWidgetFavorites = favoriteData.filter((item) => item.additionalData.cardType === "notification-widget" && item.additionalData.selected === true).length;

  barChart.options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#374151',
        titleFont: {
          size: 14,
          weight: 600
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            const labels = ["Calendar", "Table", "Chart", "Notification"];
            return labels[context[0].dataIndex];
          },
          label: function(context) {
            const index = context.dataIndex;
            const votes = [totalCalendarWidgetFavorites, totalTableWidgetFavorites, totalCardWidgetFavorites, totalNotificationWidgetFavorites][index];
            return [
              `Number of Favorites: ${votes}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: Math.max(totalCalendarWidgetFavorites, totalTableWidgetFavorites, totalCardWidgetFavorites, totalNotificationWidgetFavorites) + 1,
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#374151',
          font: {
            size: 14,
            weight: 500
          },
          callback: function(value, index) {
            const labels = ["Calendar", "Table", "Chart", "Notification"];
            return labels[index];
          }
        },
        border: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        right: 10
      }
    },
    maintainAspectRatio: false
  };

  // Dataset ayarları
  barChart.data.labels = ["Calendar", "Table", "Chart", "Notification"];
  barChart.data.datasets = [{
    data: [totalCalendarWidgetFavorites, totalTableWidgetFavorites, totalCardWidgetFavorites, totalNotificationWidgetFavorites],
    backgroundColor: [
      '#3B82F6', // Calendar - blue
      '#10B981', // Table - green
      '#F59E0B', // Chart - yellow
      '#EF4444'  // Notification - red
    ],
    borderWidth: 0,
    borderRadius: 4,
    barThickness: 20,
    barPercentage: 0.95,
    categoryPercentage: 0.95
  }];

  barChart.canvas.parentNode.style.height = '250px';
  barChart.canvas.style.width = '100%';

  barChart.update();

  const favoriteDataTable = favoriteData.map((item) => ({
    sessionId: item.additionalData.sessionId,
    type: item.additionalData.cardType,
    timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
  }));
  updateTable(favoriteDataTable);
}

document.querySelector("bcm-tab-group").addEventListener("bcm-tab-change", async (event) => {
  const selectedValue = event.detail;
  activeTab = tabs[selectedValue];
  const content = await contentMap[activeTab]();
  const contentPanel = document.getElementById("content-panel");
  contentPanel.innerHTML = content;

  socket.emit("tabChanged", selectedValue);

  if (activeTab == "Form") {
    formChart();
  } else if (activeTab == "Tooltip") {
    tooltipChart();
  } else if (activeTab == "Feedback") {
    feedbackChart();
  } else if (activeTab == "Settings") {
    settingsChart();
  } else if (activeTab == "Favorites") {
    favoritesChart();
  }

  pieChart.update();
  barChart.update();
});

function submit() {
  const form = document.getElementById("user-form");
  form.submit();
}

function next() {
  const stepper = document.getElementById("stepperWithDom");
  stepper.next();
}

function shareFeedback() {
  window.bcm.track("feedback", "feedback", {
    feedback: selectedEmoji,
    sessionId
  });
}

function saveSettings() {
  const colorPicker = document.getElementById("color-picker");
  const color = colorPicker.value;

  window.bcm.track("settings", "settings", {
    color,
    sessionId
  });
}

function settingsChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  pieChart.config.type = 'doughnut';
  pieChart.options.plugins.legend.position = 'right';
  pieChart.data.datasets[0].label = "Settings";
  pieChart.data.labels = ["blue", "emerald", "amber", "red"];

  const blue = settingsData.filter((item) => item.additionalData.color === "blue");
  const emerald = settingsData.filter((item) => item.additionalData.color === "emerald");
  const amber = settingsData.filter((item) => item.additionalData.color === "amber");
  const red = settingsData.filter((item) => item.additionalData.color === "red");

  pieChart.data.datasets[0].data = [blue.length, emerald.length, amber.length, red.length];
  pieChart.data.datasets[0].backgroundColor = [
    "rgba(99, 102, 241, 0.2)",   // blue
    "rgba(34, 197, 94, 0.2)",    // emerald
    "rgba(245, 158, 11, 0.2)",   // amber
    "rgba(239, 68, 68, 0.2)"     // red
  ];
  pieChart.data.datasets[0].borderColor = [
    "rgba(99, 102, 241, 1)",     // blue
    "rgba(34, 197, 94, 1)",      // emerald
    "rgba(245, 158, 11, 1)",     // amber
    "rgba(239, 68, 68, 1)"       // red
  ];
  pieChart.update();

  const settingsDataTable = settingsData.map((item) => ({
    sessionId: item.additionalData.sessionId,
    type: item.additionalData.color,
    timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
  }));
  updateTable(settingsDataTable);
}

function toggleFavorite(button, type) {
  button.classList.toggle("active");
  const svg = button.querySelector("svg");

  if (button.classList.contains("active")) {
    svg.classList.add("text-yellow-400");
    svg.setAttribute("fill", "currentColor");
  } else {
    svg.classList.remove("text-yellow-400");
    svg.setAttribute("fill", "none");
  }
  window.bcm.track(window.userName + "-" + type, "favorites", {
    cardType: type,
    id: type,
    sessionId: localStorage.getItem("sessionId"),
    selected: button.classList.contains("active"),
  });

  // Chart'ı güncelle
  if (activeTab === "Favorites") {
    favoritesChart();
  }
}

function favoritesChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  pieChart.config.type = 'doughnut';
  pieChart.options.plugins.legend.position = 'right';
  pieChart.data.datasets[0].label = "Favorites";
  
  const widgetTypes = [
    'assessment-sheets',
    'fsm-reports',
    'sms-credits',
    'students-report',
    'my-diary',
    'absent-staff'
  ];

  const widgetLabels = [
    'Assessment Sheets',
    'FSM Reports',
    'SMS Credits',
    'Students on Report',
    'My Diary',
    'Absent Staff'
  ];

  pieChart.data.labels = widgetLabels;
  const data = widgetTypes.map(type => {
    return favoriteData.filter(item => 
      item.additionalData.cardType === type && 
      item.additionalData.selected === true
    ).length;
  });

  pieChart.data.datasets[0].data = data;
  pieChart.update();

  const favoritesDataTable = favoriteData
    .filter(item => item.additionalData.selected === true)
    .map((item) => ({
      sessionId: item.additionalData.sessionId,
      type: item.additionalData.cardType,
      timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
    }));
  
  updateTable(favoritesDataTable);
}

function getScoreText(index) {
  switch(index) {
    case 0: return 'Very Low (-2)';
    case 1: return 'Low (-1)';
    case 2: return 'Neutral (0)';
    case 3: return 'High (+1)';
    case 4: return 'Very High (+2)';
    default: return 'N/A';
  }
}

window.addEventListener("bcmAnalyticsEvent", (event) => {
  // seet sessionId
  event.detail.additionalData.sessionId = sessionId;
  if (event.detail.eventType === "favorites") {
    socket.emit("editData", event.detail);
  } else {
    const payload = event.detail;
    socket.emit("updateData", payload);
  }
});

function formChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  pieChart.config.type = 'doughnut';
  pieChart.options.plugins.legend.position = 'right';
  errorCounts = {
    schoolId: 0,
    userName: 0,
    password: 0,
  };
  pieChart.data.datasets[0].label = "User Form Field Errors";
  pieChart.data.labels = ["schoolID", "userName", "password"];
  formData.forEach((item) => {
    item.errors.errorDetails.forEach((error) => {
      if (error?.schoolId) errorCounts.schoolId++;
      if (error?.userName) errorCounts.userName++;
      if (error?.password) errorCounts.password++;
    });
  });
  pieChart.data.datasets[0].data = [errorCounts.schoolId, errorCounts.userName, errorCounts.password];
  const formDataTable = formData.map((item) => ({
    sessionId: item.additionalData.sessionId,
    type: item.eventType,
    timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
  }))
  updateTable(formDataTable);
}

function tooltipChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  pieChart.config.type = 'doughnut';
  pieChart.options.plugins.legend.position = 'right';
  const reportTitle = tooltipData.filter((item) => item.additionalData.message === "Report Title");
  const reportDescription = tooltipData.filter((item) => item.additionalData.message === "Report Description");
  const folderName = tooltipData.filter((item) => item.additionalData.message === "Folder Name");

  const accessPermissions = tooltipData.filter((item) => item.additionalData.message === "Access Permissions");

  pieChart.data.datasets[0].label = "Tooltip Opened";
  pieChart.data.labels = ["Report Title Tooltip", "Report Description Tooltip", "Folder Name Tooltip", "Access Permissions Tooltip"];
  pieChart.data.datasets[0].data = [reportTitle.length, reportDescription.length, folderName.length, accessPermissions.length];
  const tooltipDataTable = tooltipData.map((item) => ({
    sessionId: item.additionalData.sessionId,
    type: item.additionalData.message,
    timestamp: new Date(item.timestamp || Date.now()).toLocaleString(),
  }));
  updateTable(tooltipDataTable);
}

function highlightActiveSession() {
  const currentSessionId = localStorage.getItem("sessionId");
  document.querySelectorAll('[data-session-id]').forEach(element => {
    const elementSessionId = element.getAttribute('data-session-id');
    if (elementSessionId === currentSessionId) {
      element.classList.add('active-session-row');
    } else {
      element.classList.remove('active-session-row');
    }
    
    // Format session ID display
    const sessionIdElement = element.querySelector('.session-id');
    if (sessionIdElement) {
      sessionIdElement.setAttribute('title', elementSessionId); // Show full ID on hover
    }
  });
}
