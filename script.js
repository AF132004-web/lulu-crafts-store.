// URL Base de Firebase para Fetch
const FIREBASE_URL = "https://lulu-crafts13-default-rtdb.firebaseio.com";

// Catálogo de Productos con imágenes reales de la tienda
const DEFAULT_DESCRIPTION = 'Colección minimalista esencial. Excelente calidad y calce perfecto.';
const FALLBACK_IMAGE = 'assets/logo-tienda.webp';

// Función para asegurar que las imágenes locales usen WebP
function ensureWebp(url) {
    if (!url) return FALLBACK_IMAGE;
    if (url.startsWith('assets/') && !url.endsWith('.webp')) {
        const lastDot = url.lastIndexOf('.');
        if (lastDot !== -1) {
            return url.substring(0, lastDot) + '.webp';
        }
    }
    return url;
}

// Función para manejar errores de carga de imagen
window.handleImageError = function(img) {
    img.onerror = null;
    img.src = FALLBACK_IMAGE;
};

let products = [];

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



const pagoMovilModal = document.getElementById('pagoMovilModal');
const closePmModal = document.getElementById('closePmModal');
const confirmPmBtn = document.getElementById('confirmPmBtn');
const pmTotal = document.getElementById('pmTotal');
const pmFinalPrice = document.getElementById('pmFinalPrice');
const resumenTotalBs = document.getElementById('resumen-total-bs');



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

// Variable global para la imagen seleccionada en el modal
let currentModalImage = '';

// Función para cambiar la imagen al clic en un color dentro del modal
window.switchModalVariant = function(colorName, fotoUrl, hexColor, btnEl) {
    selectedColor = colorName;
    const finalFotoUrl = ensureWebp(fotoUrl);
    currentModalImage = finalFotoUrl;
    
    // Actualizar texto del color si existe
    const colorTextEl = document.getElementById('modal-selected-color-text');
    if (colorTextEl) colorTextEl.innerText = colorName;
    
    // Animación sutil de la imagen del modal
    const img = document.getElementById('modal-main-img');
    if (!img) return;
    
    img.classList.add('variant-fade-out');
    
    setTimeout(() => {
        img.src = finalFotoUrl;
        img.classList.remove('variant-fade-out');
        img.classList.add('variant-fade-in');
        
        setTimeout(() => img.classList.remove('variant-fade-in'), 300);
    }, 150);
};

// 1. Renderizar Productos en el Catálogo
function renderProducts() {
    productGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    products.forEach((product, index) => {
        const safeName = product.name.replace(/\s+/g, '-');
        const isHero = index === 0;
        const isAboveFold = index < 4;
        let loadingAttr = '';
        if (isHero) loadingAttr = 'fetchpriority="high"';
        if (!isAboveFold) loadingAttr = 'loading="lazy"';
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.price = product.price;
        card.id = `product-${safeName}`;
        const imageUrl = ensureWebp(product.image);
        card.innerHTML = `
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" ${loadingAttr} width="400" height="400" onerror="handleImageError(this)">
                <i class="ri-sparkle-line sparkle-icon"></i>
            </div>
            <div class="product-info">
                <div class="product-info-box">
                    <h2 class="product-title">${product.name}</h2>
                    <p class="product-description">${product.description}</p>
                    <div class="price-display">
                        <span class="bs-price">$${formatPrice(product.price)}</span>
                    </div>
                </div>
                <!-- Indicador de Stock Sincronizado -->
                <div class="product-stock" id="stock-${safeName}">Cargando stock...</div>
                
                <button class="add-to-cart-btn" onclick="openProductModal(${product.id})" aria-label="Añadir al carrito">
                    <i class="ri-shopping-cart-2-line"></i>
                </button>
            </div>
        `;
        fragment.appendChild(card);
    });
    
    productGrid.appendChild(fragment);
}

// 2. SINCRONIZACIÓN CON FIREBASE VIA FETCH
async function syncWithFirebase() {
    try {
        const response = await fetch(`${FIREBASE_URL}/productos.json`);
        if (!response.ok) throw new Error('Error al conectar con la base de datos de productos');
        
        const data = await response.json() || {};
        
        // Sincronizar también información de la tienda (ej. foto de perfil)
        try {
            const storeResponse = await fetch(`${FIREBASE_URL}/tienda.json`);
            if (storeResponse.ok) {
                const storeData = await storeResponse.json();
                if (storeData && storeData.foto_perfil) {
                    const profilePhotoEl = document.querySelector('.profile-photo');
                    if (profilePhotoEl) {
                        profilePhotoEl.src = storeData.foto_perfil;
                    }
                }
            }
        } catch (storeError) {
            console.error("No se pudo cargar la configuración de la tienda:", storeError);
        }

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
                if (data[p.name].foto) mergedProduct.image = data[p.name].foto;
                if (data[p.name].variantes) mergedProduct.variants = data[p.name].variantes;
                dynamicProducts.push(mergedProduct);
            } else {
                dynamicProducts.push(p); // Mantener el producto original si no está en Firebase
            }
        });

        // 2. Añadir nuevos productos desde Firebase que no estén en la base
        Object.keys(data).forEach(fbProductName => {
            const existsInBase = baseProducts.find(p => p.name === fbProductName);
            if (!existsInBase) {
                // Si 'foto' no existe en Firebase, intentamos construir la ruta basada en el nombre o usamos el logo como último recurso
                const fbFoto = data[fbProductName].foto || data[fbProductName].imagen;
                const imagePath = fbFoto ? ensureWebp(fbFoto) : ensureWebp(`assets/${fbProductName}.webp`);
                
                dynamicProducts.push({
                    id: newIdCounter++,
                    name: fbProductName,
                    price: parseFloat(data[fbProductName].price) || 0,
                    image: imagePath,
                    color: 'Único',
                    colorHex: '#cccccc',
                    variants: data[fbProductName].variantes || null,
                    description: data[fbProductName].descripcion || DEFAULT_DESCRIPTION
                });
            }
        });

        // Actualizar el arreglo de productos y re-renderizar
        products = dynamicProducts;
        
        // Renderizar el HTML usando DocumentFragment
        productGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        products.forEach((product, index) => {
            const safeName = product.name.replace(/\s+/g, '-');
            const isHero = index === 0;
            const isAboveFold = index < 4;
            let loadingAttr = '';
            if (isHero) loadingAttr = 'fetchpriority="high"';
            if (!isAboveFold) loadingAttr = 'loading="lazy"';
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.price = product.price;
            card.id = `product-${safeName}`;
            card.style.display = 'flex';
            const imageUrl = product.image; // Ya procesado por ensureWebp arriba
            card.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" ${loadingAttr} width="400" height="400" onerror="handleImageError(this)" style="${imageUrl === FALLBACK_IMAGE ? 'object-fit: contain; padding: 20px;' : ''}">
                    <i class="ri-sparkle-line sparkle-icon"></i>
                </div>
                <div class="product-info">
                    <h2 class="product-title">${product.name}</h2>
                    <p class="product-description">${product.description}</p>
                    <div class="price-display">
                        <span class="bs-price">$${formatPrice(product.price)}</span>
                    </div>
                    <div class="product-stock" id="stock-${safeName}">Cargando stock...</div>
                    <button class="add-to-cart-btn" onclick="openProductModal(${product.id})" aria-label="Añadir al carrito">
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            `;
            fragment.appendChild(card);
        });
        
        productGrid.appendChild(fragment);

        // Actualizar estados de stock visualmente
        products.forEach(product => {
            const safeName = product.name.replace(/\s+/g, '-');
            if (data[product.name]) {
                actualizarDOMStock(product.name, data[product.name].stock);
            }
        });
        
        // Actualizar precios de carrito si es necesario
        updateCart();
    } catch (error) {
        console.error("Error sincronizando catálogo:", error);
    }
}

// El llamado a syncWithFirebase se realiza dentro de DOMContentLoaded

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
    selectedColor = currentProduct.color; // Color por defecto
    currentModalImage = currentProduct.image; // Imagen por defecto

    let colorOptionsHTML = '';
    
    // Si el producto tiene variantes de color desde Firebase
    if (currentProduct.variants && typeof currentProduct.variants === 'object') {
        const colors = Object.keys(currentProduct.variants);
        
        // Seleccionar el primero por defecto
        selectedColor = colors[0];
        currentModalImage = currentProduct.variants[selectedColor].foto || currentProduct.image;
        
        colorOptionsHTML = colors.map((colorName, i) => {
            const v = currentProduct.variants[colorName];
            const hex = v.hex || '#cccccc';
            const foto = v.foto || currentProduct.image;
            const isChecked = i === 0 ? 'checked' : '';
            return `
<label class="radio-button">
  <input type="radio" name="color-selection" value="${colorName}" ${isChecked} onchange="switchModalVariant('${colorName}', '${foto}', '${hex}', this)" />
  <span class="radio"></span>
  ${colorName}
</label>`;
        }).join('');
    } else {
        // Producto sin variantes (color único)
        colorOptionsHTML = `
<label class="radio-button">
  <input type="radio" name="color-selection" value="${currentProduct.color}" checked onchange="switchModalVariant('${currentProduct.color}', '${currentProduct.image}', '${currentProduct.colorHex || '#cccccc'}', this)" />
  <span class="radio"></span>
  ${currentProduct.color}
</label>`;
    }

    const imageUrl = ensureWebp(currentModalImage);
    modalBody.innerHTML = `
        <img src="${imageUrl}" class="modal-product-img" id="modal-main-img" alt="${currentProduct.name}" width="600" height="600" onerror="handleImageError(this)">
        <h2 class="modal-product-title">${currentProduct.name}</h2>
        <p class="modal-product-price">$${formatPrice(currentProduct.price)}</p>
        
        <div class="option-group">
            <span class="option-label">Talla</span>
            <div class="size-options">
                <button class="size-btn selected-size">
                    <i class="ri-checkbox-circle-fill"></i> Talla Única
                </button>
            </div>
        </div>

        <div class="option-group">
            <span class="option-label">Color</span>
            <div style="display: flex; flex-wrap: wrap; margin-top: -10px;">
                ${colorOptionsHTML}
            </div>
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
        image: currentModalImage, // Imagen de la variante seleccionada en el modal
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
            <img src="${item.image}" alt="${item.name}" class="cart-item-img" width="80" height="100">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name}</h4>
                <p class="cart-item-variant">Talla: ${item.size} | Color: ${item.color}</p>
                <p class="cart-item-price">$${formatPrice(item.price)}</p>
                <button class="remove-item" onclick="removeFromCart(${item.id})" aria-label="Eliminar producto del carrito">Eliminar</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotalPrice.innerHTML = `$${formatPrice(total)}`;
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

// 5. Checkout Directo a Pago Móvil
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        showAlert('Añade productos a tu carrito primero.');
        return;
    }

    cartSidebar.classList.remove('active');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const totalConDelivery = total + COSTO_DELIVERY;

    // Poblar los campos del modal de Pago Móvil 2 en 1
    const pagoProductoNombre = document.getElementById('pago-producto-nombre');
    const pagoProductoPrecio = document.getElementById('pago-producto-precio');
    const pagoResumenDetalles = document.getElementById('pago-resumen-detalles');
    const pagoTotalFinal = document.getElementById('pago-total-final');
    
    // Mostrar el primer producto o un resumen si hay varios
    if (cart.length > 0) {
        pagoProductoNombre.textContent = cart.length === 1 ? cart[0].name : `${cart.length} Productos`;
        pagoProductoPrecio.textContent = `Precio: $${formatPrice(total)}`;
    }

    // Llenar resumen detallado
    pagoResumenDetalles.innerHTML = cart.map(item => `
        <span>${item.name} (${item.color}):</span>
        <span>$${formatPrice(item.price)}</span>
    `).join('');
    
    pagoResumenDetalles.innerHTML += `
        <span>Delivery:</span>
        <span>$${formatPrice(COSTO_DELIVERY)}</span>
    `;

    if (pagoTotalFinal) pagoTotalFinal.textContent = '$' + formatPrice(totalConDelivery);
    
    pagoMovilModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Fin de Checkout Directo


if (closePmModal) {
    closePmModal.addEventListener('click', () => {
        pagoMovilModal.classList.remove('active');
    });
}



let isReferenceValidated = false;

// Actualización de la lógica de validación de referencia
const btnValidarReferencia = document.getElementById('btn-validar-referencia');
if (btnValidarReferencia) {
    btnValidarReferencia.addEventListener('click', async () => {
        const reference = document.getElementById('pago-referencia').value.trim();
        
        if (!reference) {
            showAlert('Por favor, ingresa el número de referencia del pago.');
            return;
        }

        const total = cart.reduce((sum, item) => sum + item.price, 0);
        const totalFinal = total + COSTO_DELIVERY;
        const totalFormateado = formatPrice(totalFinal);

        // Enviar notificación a Firebase para que el bot la capture y envíe a Telegram
        try {
            const reporteId = Date.now();
            await fetch(`${FIREBASE_URL}/reportes_pago/${reporteId}.json`, {
                method: 'PUT',
                body: JSON.stringify({
                    referencia: reference,
                    monto: totalFormateado,
                    items: cart,
                    fecha: new Date().toISOString()
                })
            });
            
            // Feedback visual
            btnValidarReferencia.textContent = '¡Validado!';
            btnValidarReferencia.classList.add('validate-success');
            isReferenceValidated = true;
            showAlert('Referencia capturada con éxito. Ahora puedes pulsar "Pagar".');
            
            // Opcional: habilitar visualmente el botón de pagar si tuviera un estado disabled
            document.getElementById('confirmPmBtn').style.opacity = '1';
        } catch (error) {
            console.error("Error al reportar pago:", error);
            showAlert('Error al conectar con el servidor. Inténtalo de nuevo.');
        }
    });
}

if (confirmPmBtn) {
    confirmPmBtn.addEventListener('click', () => {
        if (!isReferenceValidated) {
            showAlert('Primero debes "Validar" tu número de referencia.');
            return;
        }

        const reference = document.getElementById('pago-referencia').value.trim();
        const phoneNumber = "584126818999";
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        const totalFinal = total + COSTO_DELIVERY;
        const totalFormateado = formatPrice(totalFinal);

        // Resumen de productos
        const resumenPedido = cart.map(item => `${item.name} (${item.color})`).join(', ');

        // Mensaje exacto solicitado
        const message = `¡Hola! Acabo de realizar el pago por mi pedido en la web. El monto total es $${totalFormateado} y mi número de referencia validado es: ${reference}. Este es mi pedido: ${resumenPedido}`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    });
}




// Función para copiar al portapapeles (mantenida por si se usa en otro lado)
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
        icon.className = 'ri-check-line copied-success';

        // 5. Devolverlo a la normalidad después de 2 segundos (2000 ms)
        setTimeout(() => {
            icon.className = 'ri-file-copy-line';
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
    let isTicking = false;
    window.addEventListener('mousemove', (e) => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const mouseX = e.clientX;
                const mouseY = e.clientY;

                // Solo activar si el mouse está en el tercio izquierdo de la pantalla
                if (mouseX > 250) {
                    dockItems.forEach(item => {
                        item.style.transform = 'scale(1)';
                        item.style.marginTop = '0';
                        item.style.marginBottom = '0';
                    });
                    isTicking = false;
                    return;
                }

                // Separating reads and writes to prevent layout thrashing
                const itemStates = Array.from(dockItems).map(item => {
                    const rect = item.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
                    
                    let scale = 1;
                    let marginValue = 0;
                    const maxDistance = 120;
                    const maxScale = 1.4;

                    if (distance < maxDistance) {
                        scale = 1 + (maxScale - 1) * (1 - distance / maxDistance);
                        marginValue = (scale - 1) * 10;
                    }
                    
                    return { item, scale, marginValue };
                });

                itemStates.forEach(({ item, scale, marginValue }) => {
                    item.style.transform = `scale(${scale})`;
                    item.style.marginTop = `${marginValue}px`;
                    item.style.marginBottom = `${marginValue}px`;
                });
                isTicking = false;
            });
            isTicking = true;
        }
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
