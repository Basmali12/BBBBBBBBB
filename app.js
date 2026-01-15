// --- استيراد مكتبات Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// --- إعدادات Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyDRaDOfFByHlf5IHzkTmuF0m1odDs6AdCg",
    authDomain: "alio-f07f8.firebaseapp.com",
    databaseURL: "https://alio-f07f8-default-rtdb.firebaseio.com",
    projectId: "alio-f07f8",
    storageBucket: "alio-f07f8.firebasestorage.app",
    messagingSenderId: "333304109654",
    appId: "1:333304109654:web:c5ea55656963c4617f39f7",
    measurementId: "G-3R125SL7RD"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- إعدادات التطبيق ---
const APP_PIN = "123321";
const LOCAL_STORAGE_KEY = "car_debt_offline_data";

let currentState = {
    customers: [],
    auditLog: []
};
let currentCustomerViewId = null;
let isFirstLoad = true;

// --- عند التشغيل ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. تحميل البيانات المخزنة محلياً أولاً (للسرعة)
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
        currentState = JSON.parse(localData);
        updateUI(); // تحديث الواجهة بالبيانات المحلية فوراً
    }

    // 2. تفعيل الاستماع لقاعدة البيانات (للمزامنة الفورية)
    setupRealtimeListener();

    // 3. مراقبة حالة الاتصال
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});

// --- وظيفة الاستماع المباشر (سر الحل) ---
function setupRealtimeListener() {
    const dbRef = ref(db, 'debt_system_data');
    
    // onValue تعمل كلما تغيرت البيانات في السيرفر
    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        
        // إذا وجدت بيانات في السيرفر
        if (data) {
            currentState = data;
            
            // التأكد من وجود المصفوفات
            if (!currentState.customers) currentState.customers = [];
            if (!currentState.auditLog) currentState.auditLog = [];
            
            // تحديث التخزين المحلي ليكون مطابقاً للسيرفر
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentState));
            
            // تحديث الشاشة
            console.log("تم استلام تحديث من السحابة ☁️");
            updateUI();
        }
    }, (error) => {
        console.error("خطأ في الاتصال بالقاعدة:", error);
    });
}

function updateUI() {
    // تحديث الصفحة المفتوحة حالياً فقط
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'page-customers') renderCustomers();
    if (activePage && activePage.id === 'page-payments') renderPaymentClients();
    if (activePage && activePage.id === 'page-details' && currentCustomerViewId) loadCustomerDetails(currentCustomerViewId);
}

function updateOnlineStatus() {
    const statusEl = document.getElementById('online-status');
    const syncText = document.getElementById('sync-status');
    
    if (navigator.onLine) {
        statusEl.className = 'status-indicator online';
        if(syncText) syncText.innerText = "✅ متصل بالإنترنت (المزامنة نشطة)";
        // عند عودة النت، نرفع النسخة المحلية إذا كانت أحدث (يمكن تطوير هذا الجزء لاحقاً)
        // حالياً نعتمد على onValue لجلب البيانات
    } else {
        statusEl.className = 'status-indicator offline';
        if(syncText) syncText.innerText = "⚠️ وضع عدم الاتصال (الحفظ محلي فقط)";
    }
}

// --- الأمان والواجهة ---
function fingerprintAction() {
    const msg = document.getElementById('fingerprint-msg');
    msg.classList.remove('hidden-msg');
    setTimeout(() => {
        msg.classList.add('hidden-msg');
    }, 3000);
}

function checkPin() {
    const input = document.getElementById('pin-input').value;
    if (input === APP_PIN) {
        const welcome = document.getElementById('welcome-msg');
        welcome.classList.remove('hidden');
        setTimeout(() => {
            welcome.classList.add('hidden');
            document.getElementById('login-screen').classList.add('hidden');
            updateUI(); // تحديث الواجهة بعد الدخول
        }, 1500);
    } else {
        document.getElementById('login-error').innerText = "رمز خطأ!";
    }
}

function logout() {
    location.reload();
}

// --- التنقل ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    const navLink = document.querySelector(`.nav-item[onclick*="'${pageId}'"]`);
    if(navLink) navLink.classList.add('active');

    updateUI();
}

// --- الحفظ ---
function saveData() {
    // 1. حفظ محلي
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentState));
    
    // 2. حفظ سحابي
    if (navigator.onLine) {
        set(ref(db, 'debt_system_data'), currentState)
            .then(() => console.log("تم الرفع للسحابة"))
            .catch((err) => console.error("فشل الرفع", err));
    }
}

function showToast(msg) {
    const x = document.getElementById("toast");
    x.innerText = msg;
    x.className = "toast show";
    setTimeout(() => { x.className = x.className.replace("show", ""); }, 3000);
}

// --- العمليات ---
function addCustomer() {
    const name = document.getElementById('cust-name').value;
    const car = document.getElementById('cust-car').value;
    const phone = document.getElementById('cust-phone').value;
    const total = parseFloat(document.getElementById('cust-total').value);
    const paid = parseFloat(document.getElementById('cust-paid').value) || 0;
    const checker = document.getElementById('cust-checker').value;
    const notes = document.getElementById('cust-notes').value;

    if (!name || !phone || isNaN(total) || !car) {
        alert("يرجى ملء الحقول الإجبارية");
        return;
    }

    const newCustomer = {
        id: Date.now(),
        name: name,
        carName: car,
        whatsapp: phone,
        totalDebt: total,
        paidTotal: paid,
        remaining: total - paid,
        checkedBy: checker,
        notes: notes,
        createdAt: new Date().toISOString(),
        payments: []
    };

    if (paid > 0) {
        newCustomer.payments.push({
            id: Date.now() + 1,
            amount: paid,
            note: "دفعة أولية",
            date: new Date().toISOString()
        });
    }

    if (!currentState.customers) currentState.customers = [];
    currentState.customers.push(newCustomer);
    
    saveData(); // هذا سيقوم بتحديث السحابة، وبالتالي تحديث كل الأجهزة المتصلة
    showToast("تمت الإضافة");
    
    // تنظيف الحقول
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-car').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-total').value = '';
    document.getElementById('cust-paid').value = '0';
    document.getElementById('cust-notes').value = '';
    
    showPage('customers');
}

function renderCustomers() {
    const list = document.getElementById('customers-list');
    const query = document.getElementById('search-customers').value.toLowerCase();
    list.innerHTML = '';

    if(!currentState.customers) currentState.customers = [];

    const filtered = currentState.customers.filter(c => c.name.toLowerCase().includes(query) || c.carName.toLowerCase().includes(query));

    if(filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">لا يوجد زبائن</div>';
        return;
    }

    filtered.forEach(c => {
        const item = document.createElement('div');
        item.className = `list-item ${c.remaining <= 0 ? 'clear' : 'debt'}`;
        item.onclick = () => loadCustomerDetails(c.id);
        
        item.innerHTML = `
            <div class="item-info">
                <h4>${c.name}</h4>
                <small>🚗 ${c.carName}</small>
                <small>📱 ${c.whatsapp}</small>
            </div>
            <div class="price-tag">
                ${formatMoney(c.remaining)}<br>
                <span style="font-size:0.7em; color:#999">باقي</span>
            </div>
        `;
        list.appendChild(item);
    });
}

function loadCustomerDetails(id) {
    const customer = currentState.customers.find(c => c.id === id);
    if (!customer) return;

    currentCustomerViewId = id;
    const container = document.getElementById('details-container');
    const payments = customer.payments || [];

    container.innerHTML = `
        <h2>${customer.name}</h2>
        <p><strong>السيارة:</strong> ${customer.carName}</p>
        <p><strong>الهاتف:</strong> <a href="https://wa.me/${customer.whatsapp.replace('+','')}" target="_blank">${customer.whatsapp}</a></p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #ddd;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>المبلغ الكلي:</span> <strong>${formatMoney(customer.totalDebt)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:var(--success)">
            <span>مجموع الواصل:</span> <strong>${formatMoney(customer.paidTotal)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.2rem; color:var(--danger)">
            <span>الباقي:</span> <strong>${formatMoney(customer.remaining)}</strong>
        </div>
        <p style="margin-top:10px; font-size:0.9rem; color:#666">
            <strong>تم التدقيق:</strong> ${customer.checkedBy || '-'} <br>
            <strong>ملاحظات:</strong> ${customer.notes || '-'}
        </p>
    `;

    const transList = document.getElementById('transactions-list');
    transList.innerHTML = '';
    
    [...payments].reverse().forEach(p => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.style.background = '#f1f5f9';
        row.innerHTML = `
            <div>
                <strong>${formatMoney(p.amount)}</strong>
                <div style="font-size:0.8rem; color:#666">${p.note}</div>
            </div>
            <div style="font-size:0.8rem; text-align:left">
                ${new Date(p.date).toLocaleDateString('ar-IQ')}<br>
                ${new Date(p.date).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'})}
            </div>
        `;
        transList.appendChild(row);
    });

    showPage('details');
}

function renderPaymentClients() {
    const list = document.getElementById('payment-clients-list');
    const query = document.getElementById('search-payment-client').value.toLowerCase();
    list.innerHTML = '';
    
    if(!currentState.customers) return;

    const filtered = currentState.customers.filter(c => c.remaining > 0 && c.name.toLowerCase().includes(query));

    filtered.forEach(c => {
        const item = document.createElement('div');
        item.className = 'list-item debt';
        item.onclick = () => openPaymentModal(c.id);
        item.innerHTML = `
            <div class="item-info">
                <h4>${c.name}</h4>
                <small>${c.carName}</small>
            </div>
            <div class="price-tag">${formatMoney(c.remaining)}</div>
        `;
        list.appendChild(item);
    });
}

let selectedCustomerIdForPay = null;

function openPaymentModal(id) {
    selectedCustomerIdForPay = id;
    const c = currentState.customers.find(x => x.id === id);
    document.getElementById('pay-modal-info').innerHTML = `الزبون: <b>${c.name}</b><br>الباقي: ${formatMoney(c.remaining)}`;
    document.getElementById('payment-form-modal').classList.remove('hidden');
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-note').value = '';
}

function closePaymentModal() {
    document.getElementById('payment-form-modal').classList.add('hidden');
    selectedCustomerIdForPay = null;
}

function submitPayment() {
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const note = document.getElementById('pay-note').value;
    
    if (!amount || amount <= 0) {
        alert("يرجى إدخال مبلغ صحيح");
        return;
    }

    const cIndex = currentState.customers.findIndex(x => x.id === selectedCustomerIdForPay);
    if (cIndex === -1) return;

    const c = currentState.customers[cIndex];
    c.paidTotal += amount;
    c.remaining = c.totalDebt - c.paidTotal;
    if(!c.payments) c.payments = [];
    
    c.payments.push({
        id: Date.now(),
        amount: amount,
        note: note || "تسديد اعتيادي",
        date: new Date().toISOString()
    });

    saveData();
    closePaymentModal();
    showToast("تم التسديد بنجاح");
}

function deleteCustomerConfirm() {
    if(!currentCustomerViewId) return;
    if(confirm("هل أنت متأكد من حذف هذا الزبون وجميع سجلاته؟")) {
        currentState.customers = currentState.customers.filter(c => c.id !== currentCustomerViewId);
        saveData();
        showToast("تم الحذف");
        showPage('customers');
    }
}

// --- الطباعة ---
function openPrintModal() {
    if(!currentCustomerViewId) return;
    document.getElementById('print-modal').classList.remove('hidden');
    const savedOffice = localStorage.getItem('office_name_pref') || '';
    document.getElementById('print-office-input').value = savedOffice;
}

function executePrint() {
    const officeName = document.getElementById('print-office-input').value;
    const note = document.getElementById('print-note-input').value;
    const c = currentState.customers.find(x => x.id === currentCustomerViewId);
    
    localStorage.setItem('office_name_pref', officeName);

    const printArea = document.getElementById('print-area');
    const payments = c.payments || [];

    let tableRows = '';
    [...payments].reverse().forEach(p => {
        tableRows += `
            <tr>
                <td>${formatMoney(p.amount)}</td>
                <td>${p.note}</td>
                <td style="direction:ltr">${new Date(p.date).toLocaleDateString('en-GB')}</td>
            </tr>
        `;
    });

    printArea.innerHTML = `
        <div class="invoice-header">
            <div class="invoice-title">${officeName || 'نظام ديون السيارات'}</div>
            <div class="invoice-date">تاريخ الطباعة: ${new Date().toLocaleString('ar-IQ')}</div>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">اسم الزبون</div>
                <div class="info-value">${c.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">نوع السيارة</div>
                <div class="info-value">${c.carName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">رقم الهاتف</div>
                <div class="info-value">${c.whatsapp}</div>
            </div>
            <div class="info-item">
                <div class="info-label">رقم القائمة</div>
                <div class="info-value">#${c.id.toString().slice(-6)}</div>
            </div>
        </div>

        <div class="summary-box">
            <div class="summary-row"><span>المبلغ الكلي للدين:</span> <strong>${formatMoney(c.totalDebt)}</strong></div>
            <div class="summary-row"><span>مجموع المبالغ الواصلة:</span> <strong style="color:var(--success)">${formatMoney(c.paidTotal)}</strong></div>
            <div class="summary-row"><span>المبلغ المتبقي بذمته:</span> <span class="summary-total">${formatMoney(c.remaining)}</span></div>
        </div>

        <h3 style="margin-right:20px; color:#1e3a8a">سجل الدفعات</h3>
        <table class="print-table">
            <thead>
                <tr>
                    <th>المبلغ</th>
                    <th>الملاحظة</th>
                    <th>التاريخ</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <div class="print-footer">
            <p>${note}</p>
            <p style="margin-top:20px; font-weight:bold">-- توقيع الإدارة --</p>
        </div>
    `;

    document.getElementById('print-modal').classList.add('hidden');
    window.print();
}

function formatMoney(amount) {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(amount);
}

function forceSync() {
    if(navigator.onLine) {
        saveData(); // يجبر الرفع
        showToast("جاري المزامنة...");
    } else {
        alert("لا يوجد اتصال بالإنترنت");
    }
}

// --- ربط الدوال ---
window.fingerprintAction = fingerprintAction;
window.checkPin = checkPin;
window.logout = logout;
window.showPage = showPage;
window.addCustomer = addCustomer;
window.renderCustomers = renderCustomers;
window.loadCustomerDetails = loadCustomerDetails;
window.renderPaymentClients = renderPaymentClients;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.submitPayment = submitPayment;
window.deleteCustomerConfirm = deleteCustomerConfirm;
window.openPrintModal = openPrintModal;
window.executePrint = executePrint;
window.forceSync = forceSync;
window.exportData = function() {
    const dataStr = JSON.stringify(currentState);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'backup.json');
    linkElement.click();
};
window.importData = function(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentState = JSON.parse(e.target.result);
        saveData();
        alert("تم استعادة البيانات");
        location.reload();
    };
    reader.readAsText(file);
};
