// Configuración de Firebase
const firebaseConfig = {
    databaseURL: "https://lulu-crafts13-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Catálogo de Productos con imágenes reales de la tienda
const DEFAULT_DESCRIPTION = 'Colección minimalista esencial. Excelente calidad y calce perfecto.';

let products = [
    {
        id: 1,
        name: 'Body Amarillo',
        price: 10.00,
        image: 'assets/body-amarillo.png',
        color: 'Amarillo',
        colorHex: '#FFD700',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 2,
        name: 'Body Manga Corta',
        price: 10.00,
        image: 'assets/body-blanco-estilo-zara.png',
        color: 'Blanco',
        colorHex: '#FFFFFF',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 3,
        name: 'Body Amarillo Manga Larga',
        price: 11.50,
        image: 'assets/body-amarillo-manga-larga.png',
        color: 'Amarillo',
        colorHex: '#FFD700',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 4,
        name: 'Body Celeste',
        price: 10.00,
        image: 'assets/body-celeste.png',
        color: 'Celeste',
        colorHex: '#87CEEB',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 5,
        name: 'Body Celeste Manga Larga',
        price: 11.50,
        image: 'assets/body-celeste-manga-larga.png',
        color: 'Celeste',
        colorHex: '#87CEEB',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 6,
        name: 'Body Marrón',
        price: 10.00,
        image: 'assets/body-marron.png',
        color: 'Marrón',
        colorHex: '#8B4513',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 7,
        name: 'Body Negro Manga Larga',
        price: 11.50,
        image: 'assets/body-negro-manga-larga.png',
        color: 'Negro',
        colorHex: '#000000',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 8,
        name: 'Body Blanco Estilo Zara',
        price: 12.50,
        image: 'assets/body-blanco-estilo-zara.png',
        color: 'Blanco',
        colorHex: '#FFFFFF',
        description: DEFAULT_DESCRIPTION
    },
    {
        id: 9,
        name: 'Body Rojo Estilo Zara',
        price: 12.50,
        image: 'assets/body-rojo-estilo-zara.png',
        color: 'Rojo',
        colorHex: '#FF0000',
        description: DEFAULT_DESCRIPTION
    }
];

let cart = [];
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;

// Referencias del DOM
const productGrid = document.getElementById('productGrid');
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModal');

const cartIcon = document.getElementById('cartIcon');
const cartSidebar = document.getElementById('cartSidebar');
const closeCartBtn = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotalPrice = document.getElementById('cartTotalPrice');
const checkoutBtn = document.getElementById('checkoutBtn');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckout');
const checkoutSummary = document.getElementById('checkoutSummary');
const finalTotalPrice = document.getElementById('total-metodo-pago');
const payBtn = document.getElementById('payBtn');
const whatsappBtn = document.getElementById('whatsappBtn');

const pagoMovilModal = document.getElementById('pagoMovilModal');
const closePmModal = document.getElementById('closePmModal');
const confirmPmBtn = document.getElementById('confirmPmBtn');
const pmTotal = document.getElementById('pmTotal');
const pmFinalPrice = document.getElementById('pmFinalPrice');
const resumenTotalBs = document.getElementById('resumen-total-bs');

const binanceModal = document.getElementById('binanceModal');
const closeBinanceModal = document.getElementById('closeBinanceModal');
const confirmBinanceBtn = document.getElementById('confirmBinanceBtn');
const binanceSubtotal = document.getElementById('binance-subtotal');
const binanceTotalPremium = document.getElementById('binance-total-premium');
const binanceFinalPrice = document.getElementById('binanceFinalPrice');

// Costo fijo de delivery en USD
const COSTO_DELIVERY = 2.00; // $2 fijos para envíos en Maracaibo

// Función auxiliar para formatear precios en $
// Elimina decimales si terminan en .00, ej: $10 en vez de $10.00
function formatPrice(value) {
    const num = parseFloat(value);
    if (Number.isInteger(num)) return num.toString();
    const fixed = num.toFixed(2);
    if (fixed.endsWith('.00')) return Math.round(num).toString();
    return fixed;
}

let isFirebaseInitialized = false;

// 1. Renderizar Productos en el Catálogo
function renderProducts() {
    productGrid.innerHTML = products.map(product => {
        const safeName = product.name.replace(/\s+/g, '-');
        return `
        <div class="product-card" data-price="${product.price}" id="product-${safeName}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                <i class="ri-sparkle-line sparkle-icon"></i>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="price-display">
                    <span class="bs-price">$${formatPrice(product.price)}</span>
                </div>
                <!-- Indicador de Stock Sincronizado -->
                <div class="product-stock" id="stock-${safeName}">Cargando stock...</div>
                
                <button class="add-to-cart-btn" onclick="openProductModal(${product.id})" aria-label="Añadir al carrito">
                    <i class="ri-shopping-cart-2-line"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// 2. SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE
function syncWithFirebase() {
    const productsRef = database.ref('/productos/');
    productsRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};

        // Guardar la base de productos originales (los primeros 9)
        const baseProducts = products.filter(p => p.id <= 9);
        let dynamicProducts = [];
        let newIdCounter = 100;

        // 1. Sincronizar productos base que existen en Firebase
        baseProducts.forEach(p => {
            if (data[p.name]) {
                let mergedProduct = { ...p };
                if (data[p.name].price) mergedProduct.price = parseFloat(data[p.name].price);
                if (data[p.name].descripcion) mergedProduct.description = data[p.name].descripcion;
                dynamicProducts.push(mergedProduct);
            }
        });

        // 2. Añadir nuevos productos desde Firebase que no estén en la base
        Object.keys(data).forEach(fbProductName => {
            const existsInBase = baseProducts.find(p => p.name === fbProductName);
            if (!existsInBase) {
                dynamicProducts.push({
                    id: newIdCounter++,
                    name: fbProductName,
                    price: parseFloat(data[fbProductName].price) || 0,
                    image: 'assets/logo-tienda.jpg',
                    color: 'Único',
                    colorHex: '#cccccc',
                    description: data[fbProductName].descripcion || DEFAULT_DESCRIPTION
                });
            }
        });

        // Actualizar el arreglo de productos y re-renderizar
        products = dynamicProducts;
        
        // Renderizar el HTML de nuevo para los productos nuevos
        productGrid.innerHTML = products.map(product => {
            const safeName = product.name.replace(/\s+/g, '-');
            return `
            <div class="product-card" data-price="${product.price}" id="product-${safeName}" style="display: flex;">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" style="${product.image === 'assets/logo-tienda.jpg' ? 'object-fit: contain; padding: 20px;' : ''}">
                    <i class="ri-sparkle-line sparkle-icon"></i>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="price-display">
                        <span class="bs-price">$${formatPrice(product.price)}</span>
                    </div>
                    <div class="product-stock" id="stock-${safeName}">Cargando stock...</div>
                    <button class="add-to-cart-btn" onclick="openProductModal(${product.id})" aria-label="Añadir al carrito">
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        // Actualizar estados de stock visualmente
        products.forEach(product => {
            const safeName = product.name.replace(/\s+/g, '-');
            if (data[product.name]) {
                actualizarDOMStock(product.name, data[product.name].stock);
            }
        });
        
        // Actualizar precios de carrito si es necesario
        updateCart();
    });
}

function actualizarDOMStock(productName, stock) {
    const safeName = productName.replace(/\s+/g, '-');
    const stockEl = document.getElementById(`stock-${safeName}`);
    if (!stockEl) return;

    if (parseInt(stock) > 0) {
        stockEl.innerHTML = `<i class="ri-checkbox-circle-line"></i> Stock: ${stock} unidades`;
        stockEl.className = 'product-stock available';
    } else {
        stockEl.innerHTML = `<i class="ri-error-warning-line"></i> Agotado`;
        stockEl.className = 'product-stock soldout';
    }
}

// 2. Abrir Modal de Producto (Selección de Talla y Color)
window.openProductModal = function (productId) {
    currentProduct = products.find(p => p.id === productId);
    selectedSize = 'Talla Única'; // Por ahora todas las prendas son talla única
    selectedColor = currentProduct.color; // Color preseleccionado basado en el producto

    modalBody.innerHTML = `
        <img src="${currentProduct.image}" class="modal-product-img" alt="${currentProduct.name}">
        <h2 class="modal-product-title">${currentProduct.name}</h2>
        <p class="modal-product-price">$${formatPrice(currentProduct.price)}</p>
        
        <div class="option-group">
            <span class="option-label">Talla</span>
            <div class="size-options">
                <button class="size-btn selected-size">
                    <i class="fa-solid fa-check-circle"></i> Talla Única
                </button>
            </div>
        </div>

        <div class="option-group">
            <span class="option-label">Color</span>
            <div class="color-options">
                <button class="color-btn selected" style="background-color: ${currentProduct.colorHex}" 
                        onclick="selectColor('${currentProduct.color}', this)" 
                        aria-label="${currentProduct.color}" title="${currentProduct.color}"></button>
            </div>
            <p class="selected-color-name">Color: <strong>${currentProduct.color}</strong></p>
        </div>

        <button class="add-to-cart-btn" onclick="addToCart()">Añadir al Carrito</button>
    `;

    productModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll fondo
};

// 3. Lógica de Selección
window.selectSize = function (size, btnElement) {
    selectedSize = size;
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
    btnElement.classList.add('selected');
};

window.selectColor = function (color, btnElement) {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    btnElement.classList.add('selected');
};

// Cerrar Modales
closeModalBtn.addEventListener('click', () => {
    productModal.classList.remove('active');
    document.body.style.overflow = '';
});

// Cerrar modales haciendo click fuera
window.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (e.target === checkoutModal) {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (e.target === pagoMovilModal) {
        pagoMovilModal.classList.remove('active');
    }
    if (e.target === binanceModal) {
        binanceModal.classList.remove('active');
    }
});

// Función para mostrar alertas personalizadas (Toasts)
window.showAlert = function (message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const alertId = 'alert-' + Date.now();
    const alertHtml = `
        <div class="custom-alert" id="${alertId}">
            <button type="button" aria-label="close-error" class="close-alert" onclick="this.parentElement.remove()">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
            <div class="alert-content">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="28" width="28" class="alert-icon" xmlns="http://www.w3.org/2000/svg">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                </svg>
                <span>${message}</span>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', alertHtml);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateX(20px)';
            setTimeout(() => alertElement.remove(), 500);
        }
    }, 5000);
};

// 4. Lógica del Carrito
window.addToCart = function () {
    if (!selectedSize || !selectedColor) {
        showAlert('Por favor, selecciona una talla antes de añadir al carrito.');
        return;
    }

    const cartItem = {
        id: Date.now(), // ID único para el item en el carrito
        productId: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: currentProduct.image,
        size: selectedSize,
        color: selectedColor
    };

    cart.push(cartItem);
    updateCart();

    // Cerrar modal de producto y abrir carrito
    productModal.classList.remove('active');
    cartSidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
};

function updateCart() {
    cartCount.textContent = cart.length;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío.</p>';
        cartTotalPrice.innerHTML = '$0';
        return;
    }

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name}</h4>
                <p class="cart-item-variant">Talla: ${item.size} | Color: ${item.color}</p>
                <p class="cart-item-price">$${formatPrice(item.price)}</p>
                <button class="remove-item" onclick="removeFromCart(${item.id})">Eliminar</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotalPrice.innerHTML = `$${formatPrice(total)}`;
}

// 3. CALCULAR TOTAL EN EL CHECKOUT (Subtotal ropa + $2 Delivery)
function actualizarTotalModal(precioRopa) {
    const totalUsd = precioRopa + COSTO_DELIVERY;

    // Actualizamos los textos en la casilla lila de Pago Móvil
    const subtotalEl = document.getElementById('resumen-subtotal');
    const totalBsEl = document.getElementById('resumen-total-bs');

    if (subtotalEl) subtotalEl.innerText = "$" + formatPrice(precioRopa);
    if (totalBsEl) totalBsEl.innerText = "$" + formatPrice(totalUsd);

    // Actualizamos los textos en la casilla lila de Binance
    const binanceSubtotalEl = document.getElementById('binance-subtotal');
    const binanceTotalPremiumEl = document.getElementById('binance-total-premium');

    if (binanceSubtotalEl) binanceSubtotalEl.innerText = "$" + formatPrice(precioRopa);
    if (binanceTotalPremiumEl) binanceTotalPremiumEl.innerText = "$" + formatPrice(totalUsd);
}

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
};

// Toggle Sidebar del Carrito
cartIcon.addEventListener('click', () => {
    cartSidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
});

closeCartBtn.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
    document.body.style.overflow = '';
});

// 5. Checkout y WhatsApp
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Añade productos a tu carrito primero.');
        return;
    }

    cartSidebar.classList.remove('active');

    // Generar resumen visual
    checkoutSummary.innerHTML = cart.map(item => `
        <div class="summary-item">
            <div>
                <div class="summary-item-title">${item.name}</div>
                <span class="summary-item-variant">Talla: ${item.size} • Color: ${item.color}</span>
            </div>
            <span class="checkout-item-price">$${formatPrice(item.price)}</span>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    actualizarTotalModal(total);

    checkoutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

closeCheckoutBtn.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
    document.body.style.overflow = '';
});

whatsappBtn.addEventListener('click', () => {
    // Código de país (58 para Venezuela) + número
    const phoneNumber = "584126818999";

    let message = "¡Hola! Me gustaría realizar el siguiente pedido desde la tienda:\n\n";

    cart.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n   Talla: ${item.size}\n   Color: ${item.color}\n   Precio: $${formatPrice(item.price)}\n\n`;
    });

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const totalFinal = total + COSTO_DELIVERY;
    message += `*Subtotal Ropa:* $${formatPrice(total)}\n`;
    message += `*Delivery (Maracaibo):* $${formatPrice(COSTO_DELIVERY)}\n`;
    message += `*Total a pagar: $${formatPrice(totalFinal)}*\n\n`;
    message += "Quedo atento/a para finalizar el pago y el envío. ¡Gracias!";

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    // Abrir WhatsApp en una nueva pestaña
    window.open(whatsappUrl, '_blank');
});

payBtn.addEventListener('click', () => {
    const selectedPaymentElement = document.querySelector('input[name="payment"]:checked');
    if (!selectedPaymentElement) return;

    const selectedPayment = selectedPaymentElement.value;
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const totalConDelivery = total + COSTO_DELIVERY;

    if (selectedPayment === 'pago_movil') {
        if (resumenTotalBs) resumenTotalBs.textContent = '$' + formatPrice(totalConDelivery);
        if (pmFinalPrice) pmFinalPrice.textContent = '$' + formatPrice(totalConDelivery);
        pagoMovilModal.classList.add('active');
    } else if (selectedPayment === 'binance') {
        if (binanceSubtotal) binanceSubtotal.textContent = '$' + formatPrice(total);
        if (binanceTotalPremium) binanceTotalPremium.textContent = '$' + formatPrice(totalConDelivery);
        if (binanceFinalPrice) binanceFinalPrice.textContent = '$' + formatPrice(totalConDelivery);
        const binanceMontoCopiar = document.getElementById('binance-monto-copiar');
        if (binanceMontoCopiar) binanceMontoCopiar.textContent = formatPrice(totalConDelivery);
        binanceModal.classList.add('active');
    }
});

closePmModal.addEventListener('click', () => {
    pagoMovilModal.classList.remove('active');
});

closeBinanceModal.addEventListener('click', () => {
    binanceModal.classList.remove('active');
});

confirmPmBtn.addEventListener('click', () => {
    const phoneNumber = "584126818999"; // Añadido 58 para enrutamiento correcto

    let message = "¡Hola! He realizado un pago móvil para mi pedido:\n\n";

    cart.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n   Talla: ${item.size}\n   Color: ${item.color}\n   Precio: $${formatPrice(item.price)}\n\n`;
    });

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const totalFinal = total + COSTO_DELIVERY;
    message += `*Subtotal:* $${formatPrice(total)}\n`;
    message += `*Delivery:* $${formatPrice(COSTO_DELIVERY)}\n`;
    message += `*Total pagado: $${formatPrice(totalFinal)}*\n`;
    message += `*Método:* Pago Móvil\n\n`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
});

confirmBinanceBtn.addEventListener('click', () => {
    // 1. Calcular el monto total (Ropa + Delivery) y aplicar formateo estricto
    const totalRopa = cart.reduce((sum, item) => sum + item.price, 0);
    const totalFinal = totalRopa + COSTO_DELIVERY;
    const montoFormateado = formatPrice(totalFinal);

    // 2. Crear notificación en Firebase para el Bot de Telegram
    const notificacionId = Date.now().toString();
    database.ref('/pagos_binance/' + notificacionId).set({
        monto: montoFormateado,
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        id: notificacionId
    }).catch(err => console.error("Error enviando notificación a Firebase:", err));

    // 3. Mostrar alerta con instrucciones y redirigir
    alert(`POR FAVOR COPIA LOS SIGUIENTES DATOS:\n\nCorreo: prietoa976@gmail.com\nMonto: $${montoFormateado}\n\nSerás redirigido a Binance para completar el pago manual. Una vez transferido, regresa aquí y pulsa "Confirmar Pago por WhatsApp".`);
    const binanceUrl = `https://www.binance.com/es/pay`;
    window.open(binanceUrl, '_blank');
});

// Evento exclusivo para enviar confirmación de Binance por WhatsApp
const confirmBinanceWhatsappBtn = document.getElementById('confirmBinanceWhatsappBtn');
if (confirmBinanceWhatsappBtn) {
    confirmBinanceWhatsappBtn.addEventListener('click', () => {
        const phoneNumber = "584126818999";
        
        const totalRopa = cart.reduce((sum, item) => sum + item.price, 0);
        const totalFinal = totalRopa + COSTO_DELIVERY;
        const montoFormateado = formatPrice(totalFinal);

        let message = "¡Hola! Ya he completado mi pago por Binance Pay para mi pedido:\n\n";

        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n   Talla: ${item.size}\n   Color: ${item.color}\n   Precio: $${formatPrice(item.price)}\n\n`;
        });

        message += `*Subtotal:* $${formatPrice(totalRopa)}\n`;
        message += `*Delivery:* $${formatPrice(COSTO_DELIVERY)}\n`;
        message += `*TOTAL TRANSFERIDO:* $${montoFormateado}\n\n`;
        message += `*Método:* Binance Pay (prietoa976@gmail.com)\n\n`;
        message += `He adjuntado mi comprobante de transferencia.`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    });
}

// Función para copiar al portapapeles
window.copyToClipboard = function (text, iconElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalClass = iconElement.className;
        iconElement.className = 'ri-check-double-line';
        iconElement.style.color = '#25D366'; // Color verde de éxito

        setTimeout(() => {
            iconElement.className = originalClass;
            iconElement.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
};

// Función para copiar datos al portapapeles y cambiar el icono
function copyData(elementId, button) {
    // 1. Obtener el texto del elemento
    const textToCopy = document.getElementById(elementId).innerText;

    // 2. Copiar al portapapeles del navegador
    navigator.clipboard.writeText(textToCopy).then(() => {
        // 3. Seleccionar el icono dentro del botón
        const icon = button.querySelector('i');

        // 4. Cambiar la clase para poner el ganchito y el color azul
        icon.className = 'fa-solid fa-check copied-success';

        // 5. Devolverlo a la normalidad después de 2 segundos (2000 ms)
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
}

// Función para inicializar animaciones de texto (split por caracteres)
function initTextAnimations() {
    const animatables = document.querySelectorAll('.text-animate');
    animatables.forEach(el => {
        const text = el.innerText;
        const by = el.getAttribute('data-by') || 'character';

        if (by === 'character') {
            el.innerHTML = text.split('').map((char, i) =>
                `<span style="--index: ${i}">${char === ' ' ? '&nbsp;' : char}</span>`
            ).join('');
        }
    });
}

// Lógica de Magnificación del Dock (Estilo Magic UI)
function initDockMagnification() {
    const dockWrapper = document.querySelector('.dock-wrapper');
    const dockItems = document.querySelectorAll('.dock-item');

    if (!dockWrapper) return;

    // Detectar movimiento cerca del dock (lado izquierdo)
    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Solo activar si el mouse está en el tercio izquierdo de la pantalla
        if (mouseX > 250) {
            dockItems.forEach(item => {
                item.style.transform = 'scale(1)';
                item.style.marginTop = '0';
                item.style.marginBottom = '0';
            });
            return;
        }

        dockItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));

            // Parámetros de magnificación optimizados para dock vertical
            const maxDistance = 120; // Radio ligeramente menor
            const maxScale = 1.4;    // Escala más sutil para no tapar contenido

            if (distance < maxDistance) {
                const scale = 1 + (maxScale - 1) * (1 - distance / maxDistance);
                item.style.transform = `scale(${scale})`;

                // Espaciado vertical dinámico
                const marginValue = (scale - 1) * 10;
                item.style.marginTop = `${marginValue}px`;
                item.style.marginBottom = `${marginValue}px`;
            } else {
                item.style.transform = 'scale(1)';
                item.style.marginTop = '0';
                item.style.marginBottom = '0';
            }
        });
    });

    // Reset total al salir
    dockWrapper.addEventListener('mouseleave', () => {
        dockItems.forEach(item => {
            item.style.transform = 'scale(1)';
            item.style.marginTop = '0';
            item.style.marginBottom = '0';
        });
    });
}

// Inicialización de la tienda
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar loading mientras Firebase carga los datos reales
    productGrid.innerHTML = `
        <div class="loading-catalog">
            <i class="ri-loader-4-line ri-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
            <p>Cargando colección...</p>
        </div>
    `;
    // Iniciar sincronización directa con Firebase (no renderizar hardcoded primero)
    syncWithFirebase();
    initTextAnimations();
    initDockMagnification();
});
