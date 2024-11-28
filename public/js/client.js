
const socket = io({
    path: '/socket.io/',
    transports: ['polling','websocket'],
    autoConnect: true,
    forceNew: true,
    withCredentials: false,
    reconnectionDelay: 1000,   // Daha hızlı yeniden bağlantı
    timeout: 10000,            // 10 saniye içinde bağlantı sağlanmazsa timeout
});

let sessionId;

document.addEventListener('DOMContentLoaded', () => {
    if(!localStorage.getItem('sessionId')) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', sessionId);
    } else {
        sessionId = localStorage.getItem('sessionId');
    }
});

const pieCtx = document.getElementById('pieChart').getContext('2d');
const barCtx = document.getElementById('barChart').getContext('2d');
const tabs = {
    1: "Form",
    2: "Widgets",
    3: "Tooltip",
    4: "Feedback",
    5: "Custom"
}
let activeTab;


let formData = [];
let stepperData = [];
let tooltipData = [];
let favoriteData = [];

let errorCounts = {
    name: 0,
    surname: 0
};

let loadCount = 0;

const widgets = [
    {
        id: 'calendar-widget',
        title: 'Calendar',
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
        type: 'calendar'
    },
    {
        id: 'table-widget',
        title: 'Table',
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>`,
        type: 'table'
    },
    {
        id: 'chart-widget',
        title: 'Chart',
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"></path>
                <path d="M18 17V9"></path>
                <path d="M13 17V5"></path>
                <path d="M8 17v-3"></path>
            </svg>`,
        type: 'chart'
    },
    {
        id: 'notification-widget',
        title: 'Notification',
        icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                <circle cx="12" cy="2" r="1"></circle>
            </svg>`,
        type: 'notification'
    }
];

const contents = {
    1: `<bcm-form id="user-form" validation name="user-form">
          <div class="space-y-4">
              <bcm-input full-width name="name" label="Name" required></bcm-input>
              <bcm-input full-width name="surname" label="Surname" required></bcm-input>
              <bcm-input type="tel" full-width name="tel" label="Tel" required></bcm-input>
          </div>
          <div class="mt-4">
              <bcm-button id="prev-button" onclick="submit()">Submit</bcm-button>
               <bcm-button id="prev-button" onclick="test()">Custom Event</bcm-button>
          </div>
       </bcm-form>`,
    
    2: `${ widgets.map(widget => createWidgetHTML(widget)).join('') }`,
    3: ` <div class="flex flex-row items-center justify-center gap-3">
                            <bcm-tooltip message="Register Form Info" trigger="hover" id="register">
                                <bcm-button>Register Info</bcm-button>
                            </bcm-tooltip>
                            <bcm-tooltip message="Teacher Dashboard  Info" trigger="hover" id="teacher">
                                <bcm-button>Teacher Dashboard Info</bcm-button>
                            </bcm-tooltip>
                            <bcm-tooltip message="Time Table Info" trigger="hover" id="time-table">
                                <bcm-button>TimeTable Info</bcm-button>
                            </bcm-tooltip>
                        </div>`,
    4: `<div>Feedback Content</div>`,
    5: `<div>Customization Form Content</div>`
};


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


const contentMap = {
    "Form": contents[1],
    "Widgets": contents[2],
    "Tooltip": contents[3],
    "Feedback": contents[4],
    "Custom": contents[5]
};

const pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
        labels: [],
        datasets: [{
            label: 'Real-time Analitik',
            data: [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 1
        }],
    },
    options: {
        responsive: true,
    }
});

const barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Real-time Analitik',
            data: [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 1
        }],
    },
    options: {
        responsive: true,
    }
});


socket.on('initialData', (data) => {
    formData = data.filter(item => item.eventType == 'submit');
    stepperData = data.filter(item => item.eventType == 'PROCESS_END');
    tooltipData = data.filter(item => item.eventType == 'TOOLTIP');
    favoriteData = data.filter(item => item.eventType == 'favorites');
    activeTab ??= "Form";

    const contentPanel = document.getElementById('content-panel');
    contentPanel.innerHTML = contentMap[activeTab];

    if(activeTab == "Form") {
       formChart(); 
    }

    if(activeTab == "Widgets") {
        fovoriatesChart();
    }

    if(activeTab == "Tooltip") {
        tooltipChart();
    }

    if(activeTab == "Feedback") {
        updateTable([], 'Feedback', 'success');
    }

    if(activeTab == "Custom") {
        updateTable([], 'Custom', 'success');
    }

    
    pieChart.update();
    barChart.update();
});

function updateTable(data, type, status) {
    const tableBody = document.getElementById('analytics-table');
    if (!data) {
        tableBody.innerHTML = '';
        return;
    }
    const html = data.map(item => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.userInfo.userName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.eventType}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${type}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    status === 'success' ? 'bg-green-100 text-green-800' :
                    status === 'error' ? 'bg-red-100 text-red-800' :
                    status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                    status === 'info' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                }">
                    ${status || 'pending'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(item.timestamp || Date.now()).toLocaleString()}
            </td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = html;
}

socket.on("tabChanged", (data) => {
    activeTab = tabs[data];
    socket.emit("getData");

});

socket.on('dataUpdated', () => {
    socket.emit("getData");
});

function fovoriatesChart() {
    pieChart.canvas.style.display = 'none';
    barChart.canvas.style.display = 'block';
    const getActiveUserNameFavorites = favoriteData.filter(item => item.additionalData.sessionId === sessionId);
    const isCalendarWidgetFavorite = getActiveUserNameFavorites.find(item => item.additionalData.cardType=='calendar-widget' && item.additionalData.selected === true);
    const isTableWidgetFavorite = getActiveUserNameFavorites.find(item => item.additionalData.cardType == 'table-widget' && item.additionalData.selected === true);
    const isChartdWidgetFavorite = getActiveUserNameFavorites.find(item => item.additionalData.cardType == 'chart-widget' && item.additionalData.selected === true);
    const isNotificationWidgetFavorite = getActiveUserNameFavorites.find(item => item.additionalData.cardType == 'notification-widget' && item.additionalData.selected === true);

    const totalCalendarWidgetFavorites = favoriteData.filter(item => item.additionalData.cardType === 'calendar-widget' && item.additionalData.selected === true).length;
    const totalTableWidgetFavorites = favoriteData.filter(item => item.additionalData.cardType === 'table-widget' && item.additionalData.selected === true).length;
    const totalCardWidgetFavorites = favoriteData.filter(item => item.additionalData.cardType === 'chart-widget' && item.additionalData.selected === true).length;
    const totalNotificationWidgetFavorites = favoriteData.filter(item => item.additionalData.cardType === 'notification-widget' && item.additionalData.selected === true).length;

    
    if(isCalendarWidgetFavorite) {
        document.getElementById('calendar-widget').classList.add('active', 'text-yellow-400');
        document.getElementById('calendar-widget').querySelector('svg').setAttribute('fill', 'currentColor');
    }
    if(isTableWidgetFavorite) {
        document.getElementById('table-widget').classList.add('active', 'text-yellow-400');
        document.getElementById('table-widget').querySelector('svg').setAttribute('fill', 'currentColor');
    }
    if(isChartdWidgetFavorite) {
        document.getElementById('chart-widget').classList.add('active', 'text-yellow-400');
        document.getElementById('chart-widget').querySelector('svg').setAttribute('fill', 'currentColor');
    }
    if(isNotificationWidgetFavorite) {
        document.getElementById('notification-widget').classList.add('active', 'text-yellow-400');
        document.getElementById('notification-widget').querySelector('svg').setAttribute('fill', 'currentColor');
    }
    barChart.data.datasets[0].label = 'User Favorites';
    barChart.data.labels = ['Calendar', 'Table', 'Chart', 'Notification'];


    barChart.data.datasets[0].data = [totalCalendarWidgetFavorites, totalTableWidgetFavorites, totalCardWidgetFavorites, totalNotificationWidgetFavorites];
    updateTable(favoriteData, 'Widgets', 'success');
}

function formChart() {
    barChart.canvas.style.display = 'none';
    pieChart.canvas.style.display = 'block';
    errorCounts = {
        name: 0,
        surname: 0,
        tel:0
    };
    pieChart.data.datasets[0].label = 'User Form Field Errors';
    pieChart.data.labels = ['name', 'surname'];
        formData.forEach(item => {
           item.errors.errorDetails.forEach(error => {
               if(error?.name) errorCounts.name++;
               if(error?.surname) errorCounts.surname++;
               if(error?.tel) errorCounts.tel++;
           });
        });
        pieChart.data.datasets[0].data = [errorCounts.name, errorCounts.surname];
        updateTable(formData, 'Form', 'error');
}

    function stepperChart() {
        chart.data.datasets[0].label = 'User Registration Stepper Completed Total';
        chart.data.labels = ["User Registration Stepper"];
        chart.data.datasets[0].data = [stepperData.length];
        updateTable(stepperData, 'Stepper', 'info');
    }

    function tooltipChart() {
        barChart.canvas.style.display = 'none';
        pieChart.canvas.style.display = 'block';
        const registerTooltip = tooltipData.filter(item => item.componentId === 'register');
        const teacherDashboardTooltip = tooltipData.filter(item => item.componentId === 'teacher');
        const timeTableTooltip = tooltipData.filter(item => item.componentId === 'time-table');

        pieChart.data.datasets[0].label = 'Tooltip Opened';
        pieChart.data.labels = ['Register Tooltip', 'Teacher Dashboard Tooltip', 'Time Table Tooltip'];
        pieChart.data.datasets[0].data = [
            registerTooltip.length,
            teacherDashboardTooltip.length,
            timeTableTooltip.length
        ];
        updateTable(tooltipData, 'Tooltip', 'success');
    }


window.addEventListener('bcmAnalyticsEvent', (event) => {
    if(event.detail.eventType === 'favorites') {
       socket.emit('editData', event.detail);
    }else {
        const payload = event.detail;
        socket.emit('updateData', payload);
    }
});

function toggleFavorite(button,type) {
    button.classList.toggle('active');
    const svg = button.querySelector('svg');
    
    if (button.classList.contains('active')) {
        button.classList.add('text-yellow-400');
        svg.setAttribute('fill', 'currentColor');
        
    } else {
        button.classList.remove('text-yellow-400');
        svg.setAttribute('fill', 'none');
    }
    window.bcm.track(window.userName +'-'+ type, "favorites",{
        cardType: type,
        id: type,
        sessionId: localStorage.getItem('sessionId'),
        selected: button.classList.contains('active')
    });
}


document.querySelector('bcm-dropdown').addEventListener('bcm-dropdown-change', (event) => {
    event.preventDefault();
    loadCount++;
    window.userName = event.detail.text;
    if(loadCount > 1) {
        socket.emit('getData');
    }
});
document.querySelector('bcm-segment-picker').addEventListener('bcm-change', (event) => {
    const selectedValue = event.detail;
    const contentPanel = document.getElementById('content-panel');
    
    contentPanel.innerHTML = contents[selectedValue] || '';
    
    socket.emit('tabChanged', selectedValue);
    
    activeTab = tabs[event.detail];
    console.log('Active tab:', activeTab);

    
    if(activeTab == "Form") {
        formChart();
    } else if(activeTab == "Widgets") {
        fovoriatesChart();
    } else if(activeTab == "Tooltip") {
        tooltipChart();
    }
    pieChart.update();
    barChart.update();
  });

function submit() {
    const form = document.getElementById('user-form');
    form.submit();
}

function next() {
    const stepper = document.getElementById('stepperWithDom');
    stepper.next();
}

function test() {

    window.bcm.track("card", "favorites",{
        custom: "custom"
  });
}