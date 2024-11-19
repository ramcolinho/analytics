        

const socket = io({
    transports: ['websocket'], // Sadece websocket kullan
    reconnectionDelay: 1000,   // Daha hızlı yeniden bağlantı
    timeout: 10000,
});

const ctx = document.getElementById('myChart').getContext('2d');
const tabs = {
    1: "Form",
    2: "Stepper",
    3: "Tooltip"
}
let activeTab;

const formData = [];
const stepperData = [];
const tooltipData = [];

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
    const formData = data.filter(item => item.eventType == 'submit');
    const stepperData = data.filter(item => item.eventType == 'PROCESS_END');
    const tooltipData = data.filter(item => item.eventType == 'TOOLTIP');

    activeTab ??= "Form";
    if(activeTab == "Form") {
        chart.label = 'User Form Field Errors';
        chart.data.labels = ['name', 'surname'];
        console.log(formData);
        formData.forEach(item => {
           item.errors.errorDetails.forEach(error => {
               if(error?.name) errorCounts.name++;
               if(error?.surname) errorCounts.surname++;
           });
        });
        chart.data.datasets[0].data = [errorCounts.name, errorCounts.surname];
    }

    if(activeTab == "Stepper") {
        chart.data.labels = ['Step 1', 'Step 2', 'Step 3'];
        chart.data.datasets[0].data.push(stepperData.length);
    }

    if(activeTab == "Tooltip") {
        chart.data.labels = ['Tooltip 1', 'Tooltip 2', 'Tooltip 3'];
        chart.data.datasets[0].data.push(tooltipData.length);
    }

    
    chart.update();
});

socket.on("tabChanged", (data) => {
    activeTab = tabs[data];
    socket.emit("getData");

});

socket.on('dataUpdated', () => {
    socket.emit("getData");
});


window.addEventListener('bcmAnalyticsEvent', (event) => {
    const payload = event.detail;
    socket.emit('updateData', payload);
});

document.getElementById('tab-group').addEventListener('bcm-tab-change', (e) => {
    e.preventDefault();
    socket?.emit('changeTab', e.detail);
});

function submit() {
    const form = document.getElementById('user-form');
    form.submit();
}