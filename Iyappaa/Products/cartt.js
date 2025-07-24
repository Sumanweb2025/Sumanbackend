const categoryData = {
    snacks: ['Iyappaa', 'Amrith', 'Venba'],
    sweets: ['Iyappaa', 'Amrith', 'Venba'],
    groceries: ['Iyappaa', 'Anil', 'Narasu/s', 'Cotha/s', 'Manna Mix', 'LG', 'Rajam', 'Nijam', 'Tata', 'Lion Dates'],
    candies: ['Iyappaa', 'Amrith', 'Venbaa'],
    rice: ['Amrith', 'AMK', 'CookWithComali', 'Kannan', 'Matta', 'Sonna Masoori'],
    oil: ['Venbaa', 'Amrith', 'Idhayam', 'Gold Winner'],
    herbal: ['GokulSantol'],
    homeappliances: ['Preethi', 'Prestige', 'Milton']
};

const productImages = {
    snacks: {
        'Iyappaa': [
            { name: 'Murukku', img: 'murukku.jpg', price: '$15'},
            { name: 'Banana Salt', img: 'banana_salt.jpg', price: '$25'},
            { name: 'Casavva Salt', img: 'casavva_salt.jpg'},
            { name: 'Banana Spicy', img: 'banana_spicy.jpg'},
            { name: 'Blackallu', img: 'Blackallu.jpg'},
            { name: 'Whiteallu', img: 'whiteallu.jpg'},
            { name: 'Peanut Halwa', img: 'peanut_halwa.jpg'},
            { name: 'Peanut Ball', img: 'peanut_ball.jpg'},
            { name: 'Sakaravaratti', img: 'sakaravaratti.png'},
            { name: 'Kamarkattu', img: 'kamarkat.png'},
            { name: 'Plaintain Chips', img: 'plaintain_chips.jpg'},
            { name: 'Spicy Plaintain Chips', img: 'spicy_plaintain_chips.jpg'},
            { name: 'Casavva Spicy', img: 'casavva_spicy.jpg'},
            { name: 'Casavva Finger Chips', img: 'finger_chips.jpg'},
            { name: 'Achu Murukku', img: 'achu_murukku.jpg'},
            { name: 'Casava Finger Chips', img: 'casavva_finger_chips.jpg'},
            { name: 'Kai Murukku', img: 'kai_murukku.jpg'},
            { name: 'Rice Murukku', img: 'rice_murukku.jpg'},
            { name: 'Casavva Plain Chips', img: 'casavva_plain_chips.jpg'},
            { name: 'Mini Murukku', img: 'mini_murukku.jpg'},
            { name: 'Large Murukku', img: 'large_murukku.jpg'}
        ],
        'Anil': [
            { name: 'Amrith Candy 2', img: 'a1.jpg' }
        ],
        'Venbaa': [
            { name: 'Venbaa Candy 2', img: 'image2C.jpg' }
        ]
    },
    sweets: {
        'Iyappaa': [
            { name: 'Ladduu', img: 'laddu.jpg' },
            { name: 'Jillebi', img: 'Jillebi.jpg' },
            { name: 'Mixed Halwa', img: 'halwa.jpg' },
            { name: 'Mysorepak', img: 'mysorepak.jpg' }
        ],
        'Amrith': [
            { name: 'Amrith Candy 1', img: 'a1.jpg' },
            { name: 'Amrith Candy 2', img: 'a1.jpg' }
        ],
        'Venbaa': [
            { name: 'Venbaa Candy 1', img: 'image1C.jpg' },
            { name: 'Venbaa Candy 2', img: 'image2C.jpg' }
        ]
    },
    groceries: {
        'Iyappaa': [
            { name: 'Kambu', img: 'kambu.jpg' },
            { name: 'Horse Gram', img: 'horsegram.jpeg' },
            { name: 'Ragi Powder', img: 'ragiflour.jpg' },
            { name: 'Sago', img: 'sago.jpg' },
            { name: 'Coconut Powder', img: 'coconutpowder.jpg' },
            { name: 'White Avul', img: 'whiteavul.jpg' },
            { name: 'Red Avul', img: 'redavul.jpg' }
        ],
        'Anil': [
            { name: 'Anil Sugar', img: 'a1.jpg' }
        ],
        'Nijam': [
            { name: 'Nijam Sugar', img: 'a1.jpg' }
        ],
        'Rajam': [
            { name: 'Rajam Sugar', img: 'a1.jpg' }
        ]
    },
    candies: {
        'Iyappaa': [
            { name: 'Mango', img: 'mango_candy.jpg' },
            { name: 'Pineapple', img: 'pineapple_candy.jpg' }
        ],
        'Amrith': [
            { name: 'Amrith Candy 1', img: 'a1.jpg' },
            { name: 'Amrith Candy 2', img: 'a1.jpg' }
        ]
    },
    rice: {
        'Amrith': [
            { name: 'Amrith Rice', img: 'rice1.jpg' }
        ],
        'CookWithComali': [
            { name: 'CookWithComali Rice', img: 'rice2.jpg' }
        ]
    },
    oil: {
        'Venbaa': [
            { name: 'Venbaa Oil', img: 'oil1.jpg' }
        ],
        'Amrith': [
            { name: 'Amrith Oil', img: 'oil2.jpg' }
        ]
    },
    herbal: {
        'GokulSantol': [
            { name: 'Herbal Product', img: 'herbal1.jpg' }
        ]
    },
    homeappliances: {
        'Preethi': [
            { name: 'Mixer Grinder', img: 'mixer.jpg' }
        ]
    }
};

let cart = {}; // Object to store cart items

function updateCartIcon() {
    const totalItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    $('.cart-icon sup').text(totalItems); // Update the cart icon with the total quantity
}

function addToCart(productName, price) {
    if (cart[productName]) {
        cart[productName].quantity += 1; // Increase quantity if item already in cart
    } else {
        cart[productName] = { quantity: 1, price }; // Add new item to cart
    }
    updateCartIcon();
}

function showCart() {
    const cartContent = $('#tabContent');
    cartContent.empty(); // Clear existing content

    if (Object.keys(cart).length === 0) {
        cartContent.append('<p>Your cart is empty.</p>');
        return;
    }

    let totalPrice = 0;
    for (const [productName, item] of Object.entries(cart)) {
        const subtotal = item.quantity * parseFloat(item.price.replace('$', '')); // Calculate subtotal
        totalPrice += subtotal;

        cartContent.append(`
            <div>
                <h5>${productName}</h5>
                <p>Quantity: ${item.quantity}</p>
                <p>Price: $${subtotal.toFixed(2)}</p>
            </div>
        `);
    }
    cartContent.append(`<h4>Total Price: $${totalPrice.toFixed(2)}</h4>`);
}

function loadTabs(category) {
    const tabs = $('#categoryTabs');
    const tabContent = $('#tabContent');
    tabs.empty();
    tabContent.empty();

    const brands = categoryData[category];
    brands.forEach((brand, index) => {
        const isActive = index === 0 ? 'active' : '';
        const products = productImages[category][brand] || [];
        const imagesPerRow = 4;

        const tab = `<li class="nav-item">
                        <a class="nav-link ${isActive}" id="tab-${index}" data-toggle="tab" href="#content-${index}">
                            ${brand}
                        </a>
                    </li>`;
        tabs.append(tab);

        let content = `<div class="tab-pane fade show ${isActive}" id="content-${index}">
                        <h3>${brand}</h3>
                        <p>Content for ${brand} goes here.</p>`;

        for (let i = 0; i < products.length; i += imagesPerRow) {
            const productRow = products.slice(i, i + imagesPerRow);
            content += `<div class="row">`;

            productRow.forEach((product) => {
                content += `
                    <div class="col-md-3 mb-4">
                        <div class="card">
                            <img src="${product.img}" class="card-img-top" alt="${product.name}">
                            <div class="card-body">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-price">${product.price || '$0.00'}</p>
                                <div class="ratings">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <a href="#" class="cart-icon" onclick="addToCart('${product.name}', '${product.price}')">
                                   <i class="fa-solid fa-cart-shopping"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            });

            content += `</div>`;
        }

        content += `</div>`;
        tabContent.append(content);
    });

    const cartIcon = `<li class="nav-item ml-auto">
                        <a class="nav-link" href="#" onclick="showCart()">
                            <i class="fa-solid fa-cart-shopping"></i>
                            <sup>0</sup>
                        </a>
                    </li>`;
    tabs.append(cartIcon);
}

$(document).ready(function () {
    $('#sidebar .list-group-item').on('click', function (e) {
        e.preventDefault();
        $('#sidebar .list-group-item').removeClass('active');
        $(this).addClass('active');

        const category = $(this).data('category');
        loadTabs(category);
    });

    loadTabs('snacks'); // Load initial category
});
