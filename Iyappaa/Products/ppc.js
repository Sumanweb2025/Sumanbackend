var TrendingSlider = new Swiper('.trending-slider', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    loop: true,
    slidesPerView: 'auto',
    coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 2.5,
    },
    autoplay: {
        delay: 3000,
        disableOnInteraction: false,
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    simulateTouch: true,   // Enables dragging
    touchRatio: 1,         // The resistance of the slider while dragging
    resistance: true,      // Adds resistance to edges when reached
    resistanceRatio: 0.85  // Adjusts the resistance strength
});
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let carousel = document.querySelector('.carousel');
let items = document.querySelectorAll('.carousel .item');
let countItem = items.length;
let active = 1;
let other_1 = null;
let other_2 = null;
next.onclick = () => {
    carousel.classList.remove('prev');
    carousel.classList.add('next');
    active =active + 1 >= countItem ? 0 : active + 1;
    other_1 =active - 1 < 0 ? countItem -1 : active - 1;
    other_2 = active + 1 >= countItem ? 0 : active + 1;
    changeSlider();
}
prev.onclick = () => {
    carousel.classList.remove('next');
    carousel.classList.add('prev');
    active = active - 1 < 0 ? countItem - 1 : active - 1;
    other_1 = active + 1 >= countItem ? 0 : active + 1;
    other_2 = other_1 + 1 >= countItem ? 0 : other_1 + 1;
    changeSlider();
}
const changeSlider = () => {
    let itemOldActive = document.querySelector('.carousel .item.active');
    if(itemOldActive) itemOldActive.classList.remove('active');

    let itemOldOther_1 = document.querySelector('.carousel .item.other_1');
    if(itemOldOther_1) itemOldOther_1.classList.remove('other_1');

    let itemOldOther_2 = document.querySelector('.carousel .item.other_2');
    if(itemOldOther_2) itemOldOther_2.classList.remove('other_2');

    items.forEach(e => {
        e.querySelector('.image img').style.animation = 'none';
        e.querySelector('.image figcaption').style.animation = 'none';
        void e.offsetWidth;
        e.querySelector('.image img').style.animation = '';
        e.querySelector('.image figcaption').style.animation = '';
    })

    items[active].classList.add('active');
    items[other_1].classList.add('other_1');
    items[other_2].classList.add('other_2');

    clearInterval(autoPlay);
    autoPlay = setInterval(() => {
        next.click();
    }, 5000);
}
let autoPlay = setInterval(() => {
    next.click();
}, 5000);
// Set the countdown date for each offer card
const countdown1 = new Date().getTime() + 3600000; // 1 hour from now
const countdown2 = new Date().getTime() + 7200000; // 2 hours from now
const countdown3 = new Date().getTime() + 14400000; // 2 hours from now
const countdown4 = new Date().getTime() + 28800000; // 2 hours from now

// Update the countdown every 1 second
const interval = setInterval(() => {
    const now = new Date().getTime();

    // Calculate the time remaining for countdown1
    const distance1 = countdown1 - now;
    const hours1 = Math.floor((distance1 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes1 = Math.floor((distance1 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds1 = Math.floor((distance1 % (1000 * 60)) / 1000);

    document.getElementById("countdown1").innerHTML = `${hours1}h ${minutes1}m ${seconds1}s`;

    // Calculate the time remaining for countdown2
    const distance2 = countdown2 - now;
    const hours2 = Math.floor((distance2 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes2 = Math.floor((distance2 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds2 = Math.floor((distance2 % (1000 * 60)) / 1000);

    document.getElementById("countdown2").innerHTML = `${hours2}h ${minutes2}m ${seconds2}s`;

    const distance3 = countdown3 - now;
    const hours3 = Math.floor((distance3 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes3 = Math.floor((distance3 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds3 = Math.floor((distance3 % (1000 * 60)) / 1000);

    document.getElementById("countdown3").innerHTML = `${hours3}h ${minutes3}m ${seconds3}s`;

    const distance4 = countdown4 - now;
    const hours4 = Math.floor((distance4 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes4 = Math.floor((distance4 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds4 = Math.floor((distance4 % (1000 * 60)) / 1000);

    document.getElementById("countdown4").innerHTML = `${hours4}h ${minutes4}m ${seconds4}s`;

    // If the countdown is over, display a message
    if (distance1 < 0) {
        document.getElementById("countdown1").innerHTML = "EXPIRED";
    }
    if (distance2 < 0) {
        document.getElementById("countdown2").innerHTML = "EXPIRED";
    }
    if (distance3 < 0) {
        document.getElementById("countdown3").innerHTML = "EXPIRED";
    }
    if (distance4 < 0) {
        document.getElementById("countdown4").innerHTML = "EXPIRED";
    }
}, 1000);

// Set the countdown date for each offer card
const countdown5 = new Date().getTime() + 3600000; // 1 hour from now
const countdown6 = new Date().getTime() + 7200000; // 2 hours from now
const countdown7 = new Date().getTime() + 14400000; // 2 hours from now
const countdown8 = new Date().getTime() + 28800000; // 2 hours from now

// Update the countdown every 1 second
const interval1 = setInterval(() => {
    const now1 = new Date().getTime();

    // Calculate the time remaining for countdown1
    const distance5 = countdown5 - now1;
    const hours5 = Math.floor((distance5 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes5 = Math.floor((distance5 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds5 = Math.floor((distance5 % (1000 * 60)) / 1000);

    document.getElementById("countdown5").innerHTML = `${hours5}h ${minutes5}m ${seconds5}s`;

    // Calculate the time remaining for countdown2
    const distance6 = countdown6 - now1;
    const hours6 = Math.floor((distance6 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes6 = Math.floor((distance6 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds6 = Math.floor((distance6 % (1000 * 60)) / 1000);

    document.getElementById("countdown6").innerHTML = `${hours6}h ${minutes6}m ${seconds6}s`;

    const distance7 = countdown7 - now1;
    const hours7 = Math.floor((distance7 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes7 = Math.floor((distance7 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds7 = Math.floor((distance7 % (1000 * 60)) / 1000);

    document.getElementById("countdown7").innerHTML = `${hours7}h ${minutes7}m ${seconds7}s`;

    const distance8 = countdown8 - now1;
    const hours8 = Math.floor((distance8 % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes8 = Math.floor((distance8 % (1000 * 60 * 60)) / (1000 * 60));
    const seconds8 = Math.floor((distance8 % (1000 * 60)) / 1000);

    document.getElementById("countdown8").innerHTML = `${hours8}h ${minutes8}m ${seconds8}s`;

    // If the countdown is over, display a message
    if (distance5 < 0) {
        document.getElementById("countdown5").innerHTML = "EXPIRED";
    }
    if (distance6 < 0) {
        document.getElementById("countdown6").innerHTML = "EXPIRED";
    }
    if (distance7 < 0) {
        document.getElementById("countdown7").innerHTML = "EXPIRED";
    }
    if (distance8 < 0) {
        document.getElementById("countdown8").innerHTML = "EXPIRED";
    }
}, 1000);

const counters = document.querySelectorAll(".counters span");
const container = document.querySelector(".counters");

let activated = false;

window.addEventListener("scroll", () => {
  if (
    window.pageYOffset > container.offsetTop - window.innerHeight &&
    !activated
  ) {
    counters.forEach(counter => {
      let count = 0;
      const target = parseInt(counter.dataset.count);
      const updateCount = () => {
        if (count < target) {
          count++;
          counter.innerText = count;
          setTimeout(updateCount, 100);
        } else {
          counter.innerText = target;
        }
      };
      updateCount();
    });
    activated = true;
  } else if (
    window.pageYOffset < container.offsetTop - window.innerHeight &&
    activated
  ) {
    counters.forEach(counter => {
      counter.innerText = 0;
    });
    activated = false;
  }
});


document.addEventListener('DOMContentLoaded', function() {
    const content = document.querySelector('.banner1-content');
    const image = document.querySelector('.banner1-img');

    // Intersection Observer options
    let options = {
        threshold: 0.5 // Trigger when 50% of the element is visible
    };

    // Intersection Observer callback
    let callback = function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Stop observing once animation is triggered
            }
        });
    };

    let observer = new IntersectionObserver(callback, options);
    observer.observe(content);
    observer.observe(image);
});
//banner-1

document.addEventListener('DOMContentLoaded', function() {
    const content = document.querySelector('.glass-container');

    // Intersection Observer options
    let options = {
        threshold: 0.5 // Trigger when 50% of the element is visible
    };

    // Intersection Observer callback
    let callback = function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate'); // Changed 'active' to 'animate'
                observer.unobserve(entry.target); // Stop observing once animation is triggered
            }
        });
    };

    let observer = new IntersectionObserver(callback, options);
    observer.observe(content);
});
