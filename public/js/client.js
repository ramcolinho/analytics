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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Template yükleme hatası:", error);
    return "";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("sessionId")) {
    sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("sessionId", sessionId);
  } else {
    sessionId = localStorage.getItem("sessionId");
  }

  activeTab ??= "Form";
  const contentPanel = document.getElementById("content-panel");
  const contentMap = {
    Form: async () => await loadTemplate("form"),
    Widgets: () => widgets.map((widget) => createWidgetHTML(widget)).join(""),
    Tooltip: async () => await loadTemplate("tooltip"),
    Feedback: async () => await loadTemplate("feedback"),
    Settings: async () => await loadTemplate("settings"),
  };
  const content = await contentMap[activeTab]();
  contentPanel.innerHTML = content;
  formChart();
});

const pieCtx = document.getElementById("pieChart").getContext("2d");
const barCtx = document.getElementById("barChart").getContext("2d");

// Tab mapping'i güncellendi
const tabs = {
  1: "Form",
  2: "Widgets",
  3: "Tooltip",
  4: "Feedback",
  5: "Settings",
};

// Content map'i güncellendi
const contentMap = {
  Form: async () => await loadTemplate("form"),
  Widgets: () => widgets.map((widget) => createWidgetHTML(widget)).join(""),
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
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  if (activeTab == "Widgets") {
    fovoriatesChart();
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
  const html = data
    .map(
      (item) => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
              item.additionalData.sessionId
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
              item.eventType
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${type}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  status === "success"
                    ? "bg-green-100 text-green-800"
                    : status === "error"
                    ? "bg-red-100 text-red-800"
                    : status === "warning"
                    ? "bg-yellow-100 text-yellow-800"
                    : status === "info"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }">
                    ${status || "pending"}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(item.timestamp || Date.now()).toLocaleString()}
            </td>
        </tr>
    `
    )
    .join("");

  tableBody.innerHTML = html;
}

socket.on("tabChanged", async (data) => {
  activeTab = tabs[data];
  const content = await contentMap[activeTab]();
  const contentPanel = document.getElementById("content-panel");
  contentPanel.innerHTML = content;
});

socket.on("dataUpdated", () => {
  socket.emit("getData");
});

function feedbackChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  const verySad = feedbackData.filter((item) => item.additionalData.feedback === "verySad");
  const sad = feedbackData.filter((item) => item.additionalData.feedback === "sad");
  const neutral = feedbackData.filter((item) => item.additionalData.feedback === "neutral");
  const happy = feedbackData.filter((item) => item.additionalData.feedback === "happy");
  const veryHappy = feedbackData.filter((item) => item.additionalData.feedback === "veryHappy");

  pieChart.data.datasets[0].label = "Feedback";
  pieChart.data.labels = ["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"];
  pieChart.data.datasets[0].data = [verySad.length, sad.length, neutral.length, happy.length, veryHappy.length];
  updateTable(feedbackData, "Feedback", "success");
}

function fovoriatesChart() {
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

  if (isCalendarWidgetFavorite) {
    document.getElementById("calendar-widget").classList.add("active", "text-yellow-400");
    document.getElementById("calendar-widget").querySelector("svg").setAttribute("fill", "currentColor");
  }
  if (isTableWidgetFavorite) {
    document.getElementById("table-widget").classList.add("active", "text-yellow-400");
    document.getElementById("table-widget").querySelector("svg").setAttribute("fill", "currentColor");
  }
  if (isChartdWidgetFavorite) {
    document.getElementById("chart-widget").classList.add("active", "text-yellow-400");
    document.getElementById("chart-widget").querySelector("svg").setAttribute("fill", "currentColor");
  }
  if (isNotificationWidgetFavorite) {
    document.getElementById("notification-widget").classList.add("active", "text-yellow-400");
    document.getElementById("notification-widget").querySelector("svg").setAttribute("fill", "currentColor");
  }
  barChart.data.datasets[0].label = "User Favorites";
  barChart.data.labels = ["Calendar", "Table", "Chart", "Notification"];

  barChart.data.datasets[0].data = [totalCalendarWidgetFavorites, totalTableWidgetFavorites, totalCardWidgetFavorites, totalNotificationWidgetFavorites];
  updateTable(favoriteData, "Widgets", "success");
}

function formChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
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
  updateTable(formData, "Form", "error");
}

function stepperChart() {
  chart.data.datasets[0].label = "User Registration Stepper Completed Total";
  chart.data.labels = ["User Registration Stepper"];
  chart.data.datasets[0].data = [stepperData.length];
  updateTable(stepperData, "Stepper", "info");
}

function tooltipChart() {
  barChart.canvas.style.display = "none";
  pieChart.canvas.style.display = "block";
  const reportTitle = tooltipData.filter((item) => item.additionalData.message === "Report Title");
  const reportDescription = tooltipData.filter((item) => item.additionalData.message === "Report Description");
  const folderName = tooltipData.filter((item) => item.additionalData.message === "Folder Name");

  const accessPermissions = tooltipData.filter((item) => item.additionalData.message === "Access Permissions");

  pieChart.data.datasets[0].label = "Tooltip Opened";
  pieChart.data.labels = ["Report Title Tooltip", "Report Description Tooltip", "Folder Name Tooltip", "Access Permissions Tooltip"];
  pieChart.data.datasets[0].data = [reportTitle.length, reportDescription.length, folderName.length, accessPermissions.length];
  updateTable(tooltipData, "Tooltip", "success");
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

function toggleFavorite(button, type) {
  button.classList.toggle("active");
  const svg = button.querySelector("svg");

  if (button.classList.contains("active")) {
    button.classList.add("text-yellow-400");
    svg.setAttribute("fill", "currentColor");
  } else {
    button.classList.remove("text-yellow-400");
    svg.setAttribute("fill", "none");
  }
  window.bcm.track(window.userName + "-" + type, "favorites", {
    cardType: type,
    id: type,
    sessionId: localStorage.getItem("sessionId"),
    selected: button.classList.contains("active"),
  });
}

function selectEmoji(value, element) {
  debugger;
  const allEmojis = document.querySelectorAll(".far");
  allEmojis.forEach((emoji) => {
    emoji.classList.remove("text-yellow-400");
    emoji.classList.add("text-gray-500");
  });

  element.classList.remove("text-gray-500");
  element.classList.add("text-yellow-400");
  selectedEmoji = value;
  const feedbackSubmit = document.getElementById("feedbackSubmit");
  feedbackSubmit.disabled = false;
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
  } else if (activeTab == "Widgets") {
    fovoriatesChart();
  } else if (activeTab == "Tooltip") {
    tooltipChart();
  } else if (activeTab == "Feedback") {
    feedbackChart();
  } else if (activeTab == "Settings") {
    settingsChart();
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
  pieChart.data.datasets[0].label = "Settings";
  pieChart.data.labels = ["blue", "emerald", "amber", "red"];
  const blue = settingsData.filter((item) => item.additionalData.color === "blue");
  const emerald = settingsData.filter((item) => item.additionalData.color === "emerald");
  const amber = settingsData.filter((item) => item.additionalData.color === "amber");
  const red = settingsData.filter((item) => item.additionalData.color === "red");
  pieChart.data.datasets[0].data = [blue.length, emerald.length, amber.length, red.length];
  updateTable(settingsData, "Settings", "success");
}
