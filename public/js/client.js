        

const socket = io({
    path: '/socket.io/',
    transports: ['polling','websocket'],
    autoConnect: true,
    forceNew: true,
    withCredentials: false,
    reconnectionDelay: 1000,   // Daha hızlı yeniden bağlantı
    timeout: 10000,            // 10 saniye içinde bağlantı sağlanmazsa timeout
});

const ctx = document.getElementById('myChart').getContext('2d');
const tabs = {
    1: "Form",
    2: "Stepper",
    3: "Tooltip"
}
let activeTab;

let formData = [];
let stepperData = [];
let tooltipData = [];

let errorCounts = {
    name: 0,
    surname: 0
};

const chart = new Chart(ctx, {
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

socket.on('initialData', (data) => {
    formData = data.filter(item => item.eventType == 'submit');
    stepperData = data.filter(item => item.eventType == 'PROCESS_END');
    tooltipData = data.filter(item => item.eventType == 'TOOLTIP');

    activeTab ??= "Form";
    if(activeTab == "Form") {
       formChart(); 
    }

    if(activeTab == "Stepper") {
        stepperChart();
    }

    if(activeTab == "Tooltip") {
        tooltipChart();
    }
    
    chart.update();
});

function updateTable(data, type, status) {
    const tableBody = document.getElementById('analytics-table');
    const html = data.map(item => `
        <tr class="hover:bg-gray-50">
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

function formChart() {
    errorCounts = {
        name: 0,
        surname: 0
    };
    chart.data.datasets[0].label = 'User Form Field Errors';
        chart.data.labels = ['name', 'surname'];
        formData.forEach(item => {
           item.errors.errorDetails.forEach(error => {
               if(error?.name) errorCounts.name++;
               if(error?.surname) errorCounts.surname++;
           });
        });
        chart.data.datasets[0].data = [errorCounts.name, errorCounts.surname];
        updateTable(formData, 'Form', 'error');
}

    function stepperChart() {
        chart.data.datasets[0].label = 'User Registration Stepper Completed Total';
        chart.data.labels = ["User Registration Stepper"];
        chart.data.datasets[0].data = [stepperData.length];
        updateTable(stepperData, 'Stepper', 'info');
    }

    function tooltipChart() {
        const registerTooltip = tooltipData.filter(item => item.componentId === 'register');
        const teacherDashboardTooltip = tooltipData.filter(item => item.componentId === 'teacher');
        const timeTableTooltip = tooltipData.filter(item => item.componentId === 'time-table');

        console.log(registerTooltip, teacherDashboardTooltip, timeTableTooltip);

        chart.data.datasets[0].label = 'Tooltip Opened';
        chart.data.labels = ['Register Tooltip', 'Teacher Dashboard Tooltip', 'Time Table Tooltip'];
        chart.data.datasets[0].data = [
            registerTooltip.length,
            teacherDashboardTooltip.length,
            timeTableTooltip.length
        ];
        updateTable(tooltipData, 'Tooltip', 'success');
    }


window.addEventListener('bcmAnalyticsEvent', (event) => {
    const payload = event.detail;
    socket.emit('updateData', payload);
});

document.getElementById('tab-group').addEventListener('bcm-tab-change', (e) => {
    e.preventDefault();
    
    const tab = e.detail;
    activeTab = tabs[tab];

    if(activeTab == "Form") {
        formChart();
    }

    if(activeTab == "Stepper") {
        stepperChart();
    }

    if(activeTab == "Tooltip") {
        tooltipChart();
    }
    chart.update();
});

function submit() {
    const form = document.getElementById('user-form');
    form.submit();
}

function next() {
    const stepper = document.getElementById('stepperWithDom');
    stepper.next();
}