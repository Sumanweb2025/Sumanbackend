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

        // Image URLs for each brand's products with names
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
                    { name: 'Mysorepak', img: 'mysorepak.jpg' },
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
                    { name: 'White Avul', img: 'poha.jpeg' },
                    { name: 'Red Avul', img: 'redpoha.jpeg' },
                    { name: 'Achu Vellam', img: 'jaggery.jpg' },
                    { name: 'Vellam Round', img: 'vellam.jpg' },
                    { name: 'Vellam Powder', img: 'jaggerypowder1.jpg' },
                    { name: 'Roasted Gram', img: 'pottukadalai1.jpg' },
                    { name: 'Asafoetida Powder', img: 'asafoedida.jpg' },
                    { name: 'Garlic Powder', img: 'garlic_powder.webp' },
                    { name: 'Garlic Kuranai', img: 'garlic_kuranai.webp' },
                    { name: 'Dosa Batter', img: 'dosa_batter.png' },
                    { name: 'Sea Salt', img: 'salt.jpg' },
                    { name: 'Himalayan Salt Powder', img: 'himalayan_salt_powder.png' },
                    { name: 'Himalayan Crystal Salt', img: 'himalayan_crystal_salt.png' },
                    { name: 'Appalam', img: 'appalam.png' },
                    { name: 'Color Fryums', img: 'color_fryums.png' },
                    { name: 'Fryums', img: 'fryums.png' },
                    { name: 'Mango Pickel', img: 'mango_pickel.png' },
                    { name: 'Lemon Pickel', img: 'lemon_pickel.png' },
                    { name: 'Chickpeas', img: 'chickpeas.png' },
                    { name: 'Raw Cashew', img: 'cashew.png' },
                    { name: 'Raw Peanut', img: 'raw_peanut.png' },
                    { name: 'Roasted Cashew', img: 'roasted_cashew.png' },
                    { name: 'Roasted Peanut', img: 'roasted_peanut.png' },
                    { name: 'Dalia', img: 'dalia.png' },
                ],
                'Anil': [
                     { name: 'Ragi Vermicelli', img: 'ragi_vermicelli.webp' },
                    { name: 'Tarmarind Vermicelli', img: 'tarmarind_vermicelli.png' },
                    { name: 'Roastedshort Vermicelli', img: 'roastedshort_vermicelli.webp' },
                    { name: 'Rice Vermicelli', img: 'rice_vermicelli.jpeg' },


                ],
                'Narasu/s': [
                    { name: 'Narasus Instant Strong', img: 'narasus_instant_strong.jpg' },
                    { name: 'Narasus Premium Blend', img: 'narasus_premium_blend.jpg' },
                    { name: 'Narasus Pure Strong', img: 'narasus_pure_strong.jpeg' },
                    { name: 'Narasus Udhayam', img: 'narasus_udhayam.jpeg' }
                ],
                'Cotha/s':[
                    { name: 'Cothas Coffee Blend', img: 'cothas_coffee_blend.png'},
                    { name: 'Cothas Speciality Blend Coffee', img: 'cothas_speciality_blend.png'}
                    ],
                'Manna Mix':[
                    { name: 'Manna Mix', img: 'mannamix.jpeg'}
                    ],
                'LG':[
                    { name: 'Perungayam', img: 'perungayam.webp'}
                    ],
                'Rajam':[
                    { name: 'Rajam Sukku', img: 'rajam_sukku.jpg'}
                    ],
                 'Nijam':[
                    { name: 'Nijam Pakku', img: 'nijam_pakku.webp'}
                    ],
                 'Tata':[
                    { name: 'Tata Salt', img: 'tata_salt.webp'}
                    ],
                'Lion Dates':[
                    { name: 'Lion Dates', img: 'lion_layina_dates.webp'},
                    { name: 'Lion Dates Syrup', img: 'lion_dates_syrup.jpg'},
                    ],
            },
            candies: {
                'Iyappaa': [
                    { name: 'Orange Candy', img: 'orangecandy.jpg' },
                    { name: 'Lollypop', img: 'lollypop2.jpg' },
                    { name: 'Jelly Beans', img: 'jelly.jpg' },
                    { name: 'Milk Chocolate', img: 'milkchocolate.jpg' },
                    { name: 'Imily', img: 'imily1.webp' }
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
            rice: {
                'Amrith': [
                    { name: 'Thanjavur Rice', img: 'rice1.jpg' },
                    { name: 'Briyani Rice', img: 'rice.jpg' }
                ],
                'AMK': [
                    { name: 'Baby Krishna Ponni Rice', img: 'babykrishna.jpg' },
                    { name: 'AMK Nei Kichadi Rice', img: 'AMK.webp' }
                ],
                'CookWithComali': [
                    { name: 'Cook With Comali Idly Rice', img: 'cwc.jpg' }
                ],
                'Kannan': [
                    { name: 'Kannan Brand Ponni Rice', img: 'kannan.webp' }
                ],
                'Matta': [
                    { name: 'Brand H Rice 1', img: 'matta.jpg' },
                    { name: 'Brand H Rice 2', img: 'matta1.jpeg' }
                ],
                'Sonna Masoori': [
                    { name: 'Brand H Rice 1', img: 'sona.webp' }
                ]
            },
            oil: {
                'Venbaa': [
                    { name: 'Coconut Oil', img: 'coconutoil.jpg'},
                    { name: 'Groundnut Oil', img: 'groundnutoil.jpg' },
                    { name: 'Castor Oil', img: 'castoroil.jpg' },
                    { name: 'Neem Oil', img: 'neemoil.jpg' },
                    { name: 'Panchdeepam Oil', img: 'panchdeepamoil.jpg' }
                ],
                'Amrith': [
                    { name: 'Ghee', img: 'ghee.jpg' }
                ],
                'Idhayam': [
                    { name: 'Idhayam Sesame Oil', img: 'idhayam.jpg' },
                    { name: 'Idhayam Mustard Oil', img: 'idhayam1.jpeg' },
                ],
                'Gold Winner': [
                    { name: 'Gold Winner Oil', img: 'goldwinner.jpg' },
                    { name: 'Deepam Oil', img: 'deepam.webp' },
                ]
            },
            herbal: {
                'GokulSantol': [
                    { name: 'Gokul Santol', img: 'gokul_santol.jpg' },
                    { name: 'Gokul Floral', img: 'gokul_floral.jpeg' },
                    ]
            },
            homeappliances: {
               'Preethi': [
                    { name: 'Preethi Blue Leaf', img: 'preethi_blue_leaf.jpg' },
                    { name: 'Preethi WaterBottle', img: 'preethi_waterbottle.png' }
                ],
               'Prestige': [
                    { name: 'Prestige Flip On', img: 'prestige_flip_on.jpg' },
                    { name: 'Prestige Svachh', img: 'prestige_svachh.jpg' },

                ],
                'Milton': [
                    { name: 'Milton Flask', img: 'milton_flask.jpg' },
                ]
            }
        };

       function loadTabs(category) {
    const tabs = $('#categoryTabs');
    const tabContent = $('#tabContent');
    tabs.empty();
    tabContent.empty();

    const brands = categoryData[category];
    brands.forEach((brand, index) => {
        const isActive = index === 0 ? 'active' : '';
        const products = productImages[category][brand] || [];
        const imagesPerRow = 4; // Number of images per row

        // Create tabs
        const tab = `<li class="nav-item">
                        <a class="nav-link ${isActive}" id="tab-${index}" data-toggle="tab" href="#content-${index}">
                            ${brand}
                        </a>
                    </li>`;
        tabs.append(tab);

        // Group products into rows
        let content = `<div class="tab-pane fade show ${isActive}" id="content-${index}">
                        <h3>${brand}</h3>
                        <p>Content for ${brand} goes here.</p>`;

        // Divide products into rows
        for (let i = 0; i < products.length; i += imagesPerRow) {
            const productRow = products.slice(i, i + imagesPerRow); // Get a slice of products for this row
            content += `<div class="row">`;

            productRow.forEach((product, j) => {
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
                                <a href="#" class="cart-icon">
                                   <i class="fa-solid fa-cart-shopping"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            });

            content += `</div>`; // Close row div
        }

        content += `</div>`; // Close tab pane
        tabContent.append(content);
    });

    // Add shopping cart icon with "up power 0" at the end of the tabs
    const cartIcon = `<li class="nav-item ml-auto"  id="cart-icon">
                        <a class="nav-link" href="#">
                            <i class="fa-solid fa-cart-shopping"></i>
                            <sup>0</sup>
                        </a>
                    </li>`;
    tabs.append(cartIcon);
    $('#cart-icon').on('click', function() {
        $('.cart').addClass('cart-active');
    });
}

const btnClose = document.querySelector('#cart-close');
btnClose.addEventListener('click', () => {
    document.querySelector('.cart').classList.remove('cart-active');
});

document.addEventListener('DOMContentLoaded', loadFood);

function loadFood() {
    loadContent();
}

function loadContent() {
    // Add remove item event listeners
    let btnRemove = document.querySelectorAll('.cart-remove');
    btnRemove.forEach((btn) => {
        btn.addEventListener('click', removeItem);
    });
    
    // Add quantity change event listeners
    let qtyElements = document.querySelectorAll('.cart-quantity');
    qtyElements.forEach((input) => {
        input.addEventListener('change', changeQty);
    });
}

function removeItem() {
    if (confirm('Are you Sure to Remove')) {
    this.parentElement.remove();
    // Optionally, re-load the content if needed
    loadContent(); // Uncomment if the list needs to refresh
    }
}

function changeQty() {
    if (isNaN(this.value) || this.value < 1) {
        this.value = 1;
    }
}

// Call loadContent whenever items are added to the cart, for example:
function addItemToCart() {
    // Code to add an item to the cart...
    
    // After adding, re-load the event listeners
    loadContent();
}




$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();

    $('#sidebar .list-group-item').on('click', function (e) {
        e.preventDefault();
        $('#sidebar .list-group-item').removeClass('active');
        $(this).addClass('active');

        const category = $(this).data('category');
        loadTabs(category);
    });

    loadTabs('snacks'); // Load initial category
});
